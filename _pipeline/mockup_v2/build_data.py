#!/usr/bin/env python3
"""
SD-WAN Safran — Dashboard v2 data builder.

Consumes the output of the v1 pipeline (mockup/data.js) and enriches it with:
  • lat/lon per site (via geocode.py)
  • country/region aggregates
  • world.json reference (static continent outlines)
  • precomputed narrative signals (top blockers, landing forecast, etc.)

Output: mockup_v2/data.js  —  consumed by mockup_v2/app.js

Usage:
  python3 mockup_v2/build_data.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
V1_DATA = ROOT / "mockup" / "data.js"
OUT_DATA = HERE / "data.js"

sys.path.insert(0, str(HERE))
from geocode import geocode_site, COUNTRY_NAMES  # noqa: E402


# ============================================================
# 1. Load v1 data
# ============================================================

def load_v1_data():
    if not V1_DATA.exists():
        raise SystemExit(f"Missing v1 data: {V1_DATA}. Run `python3 mockup/build_data.py` first.")
    raw = V1_DATA.read_text()
    # The v1 file starts with `window.SDWAN_DATA = {...};`
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", raw, re.DOTALL)
    if not m:
        m = re.search(r"=\s*(\{.*\})", raw, re.DOTALL)
    return json.loads(m.group(1))


# ============================================================
# 2. Enrich sites with geocoding
# ============================================================

def enrich_sites(sites):
    resolved = 0
    addr_based = 0
    fallback = 0
    overrides = 0
    country_counts = Counter()
    for s in sites:
        lat, lon, label, cc, resolution = geocode_site(s.get("site_id"), address=s.get("address"))
        s["lat"] = lat
        s["lon"] = lon
        s["geo_label"] = label
        s["country_code"] = cc
        s["geo_resolution"] = resolution
        if   resolution == "override":         overrides  += 1
        elif resolution == "city":             resolved   += 1
        elif resolution == "address":          addr_based += 1
        elif resolution == "country_fallback": fallback   += 1
        if cc:
            country_counts[cc] += 1
    return resolved, fallback, overrides, country_counts, addr_based


# ============================================================
# 3. Country aggregates for map legend
# ============================================================

def build_countries(sites):
    by_cc = defaultdict(list)
    for s in sites:
        cc = s.get("country_code")
        if cc:
            by_cc[cc].append(s)
    out = []
    for cc, group in sorted(by_cc.items()):
        total = len(group)
        migrated = sum(1 for g in group if g.get("status") == "migrated")
        at_risk = sum(
            1 for g in group
            if g.get("status") != "migrated"
            and (g.get("risk_level") or "").strip().lower() in ("high risk", "medium risk")
        )
        # country centroid = average lat/lon of sites (keeps map focus honest)
        lat_avg = sum(g["lat"] for g in group) / total
        lon_avg = sum(g["lon"] for g in group) / total
        out.append({
            "cc": cc,
            "name": COUNTRY_NAMES.get(cc, cc),
            "total": total,
            "migrated": migrated,
            "at_risk": at_risk,
            "remaining": total - migrated,
            "pct_migrated": round(100 * migrated / total) if total else 0,
            "lat": round(lat_avg, 2),
            "lon": round(lon_avg, 2),
        })
    return sorted(out, key=lambda x: -x["total"])


# ============================================================
# 4. Narrative / signals
# ============================================================

def compute_narrative(data, sites):
    today_str = data.get("as_of_date")
    try:
        today = datetime.strptime(today_str, "%Y-%m-%d").date() if today_str else date.today()
    except ValueError:
        today = date.today()

    total = len([s for s in sites if (s.get("status_detail") or s.get("status")) != "closed"])
    migrated = sum(1 for s in sites if s.get("status") == "migrated")
    pct = round(100 * migrated / total, 1) if total else 0.0

    # Velocity: migrations over the last 8 weeks
    recent = []
    for s in sites:
        if s.get("status") != "migrated":
            continue
        md = s.get("migration_date")
        if not md:
            continue
        try:
            d = datetime.strptime(md, "%Y-%m-%d").date()
        except ValueError:
            continue
        delta_days = (today - d).days
        if 0 <= delta_days <= 56:  # last 8 weeks
            recent.append(d)
    velocity_per_week = round(len(recent) / 8.0, 1) if recent else 0.0

    remaining = total - migrated
    weeks_to_land = round(remaining / velocity_per_week, 0) if velocity_per_week > 0 else None

    # Top blockers: prereqs with the most sites stuck below 100% among not-migrated sites
    prereq_meta = data.get("prereq_meta", {})
    blocker_counts = Counter()
    for s in sites:
        if s.get("status") == "migrated":
            continue
        for key, val in (s.get("prereqs") or {}).items():
            if val is None or val < 100:
                blocker_counts[key] += 1
    top_blockers = []
    for key, count in blocker_counts.most_common(5):
        owner = (prereq_meta.get(key) or {}).get("owner", "")
        when = (prereq_meta.get(key) or {}).get("when_label", "")
        top_blockers.append({"key": key, "count": count, "owner": owner, "when": when})

    # Risk summary
    high = sum(1 for s in sites if (s.get("risk_level") or "").strip().lower() == "high risk"
               and s.get("status") != "migrated")
    medium = sum(1 for s in sites if (s.get("risk_level") or "").strip().lower() == "medium risk"
                 and s.get("status") != "migrated")

    # Build the narrative text
    narrative = {
        "as_of": today.isoformat(),
        "total": total,
        "migrated": migrated,
        "remaining": remaining,
        "pct_migrated": pct,
        "velocity_per_week": velocity_per_week,
        "weeks_to_land": weeks_to_land,
        "projected_landing": None,
        "high_risk": high,
        "medium_risk": medium,
        "top_blockers": top_blockers,
    }

    if weeks_to_land is not None and weeks_to_land < 500:
        from datetime import timedelta
        narrative["projected_landing"] = (today + timedelta(weeks=int(weeks_to_land))).isoformat()

    return narrative


# ============================================================
# 5. World polygons (copy or write reference)
# ============================================================

def ensure_world_json():
    wp = HERE / "world.json"
    if not wp.exists():
        print(f"  ⚠ {wp.name} missing — map backgrounds will be empty.")


# ============================================================
# Main
# ============================================================

def main():
    print(f"Reading {V1_DATA.relative_to(ROOT)} …")
    data = load_v1_data()
    sites = data.get("sites", [])
    print(f"  → {len(sites)} sites")

    print("Geocoding …")
    resolved, fallback, overrides, country_counts, addr_based = enrich_sites(sites)
    unk = len(sites) - resolved - fallback - overrides - addr_based
    print(f"  → {overrides} override | {resolved} city-dict | {addr_based} address-based | {fallback} country-centroid | {unk} unknown")

    countries = build_countries(sites)
    print(f"  → {len(countries)} countries with presence")

    narrative = compute_narrative(data, sites)
    print(f"  → narrative: {narrative['migrated']}/{narrative['total']} "
          f"({narrative['pct_migrated']}%) | v={narrative['velocity_per_week']}/wk "
          f"| landing≈{narrative['projected_landing'] or 'n/a'}")

    ensure_world_json()

    # Load historical snapshots (from build_snapshots.py) for period comparison
    snapshots = []
    snap_dir = HERE / "snapshots"
    if snap_dir.exists():
        for p in sorted(snap_dir.glob("????-??-??.json")):
            try:
                snapshots.append(json.loads(p.read_text()))
            except Exception as e:
                print(f"  ! failed to read {p.name}: {e}")
    if snapshots:
        print(f"  → {len(snapshots)} historical snapshot(s) loaded")

    # Compute per-site risk transitions across snapshots and attach to each site.
    # A transition is a change in normalized risk level between two consecutive
    # snapshots. We attach a list `risk_history` = [{date, level}] per site (only
    # the points where the level changed) so the UI can render a compact timeline.
    def _norm_risk(r):
        if not r: return "no risk"
        s = str(r).lower().strip()
        if "high" in s: return "high risk"
        if "medium" in s: return "medium risk"
        if "low" in s: return "low risk"
        if "not possible" in s: return "not possible to plan"
        if "migrated" in s: return "migrated"
        return s or "no risk"

    if snapshots:
        per_site_timeline = defaultdict(list)
        for snap in snapshots:
            d = snap.get("date")
            for sid, risk in (snap.get("risks") or {}).items():
                per_site_timeline[sid].append((d, _norm_risk(risk)))
        # Compress: keep only transition points (first observation + every change)
        risk_transitions_count = 0
        for s in sites:
            sid = s.get("site_id")
            pts = sorted(per_site_timeline.get(sid, []))
            history = []
            prev = None
            for d, lvl in pts:
                if prev != lvl:
                    history.append({"date": d, "level": lvl})
                    if prev is not None:
                        risk_transitions_count += 1
                prev = lvl
            s["risk_history"] = history
        print(f"  → {risk_transitions_count} risk transition(s) detected across {sum(1 for s in sites if s.get('risk_history'))} sites")

    out = {
        **data,
        "sites": sites,
        "countries": countries,
        "narrative": narrative,
        "snapshots": snapshots,
        "v2_build": datetime.now().isoformat(timespec="seconds"),
        # Bump whenever the build pipeline changes in a way that makes older
        # uploaded payloads incompatible. Read by index.html to invalidate
        # stale localStorage payloads.
        "pipeline_version": 2,
    }

    # Write minified for fast load
    js = "window.SDWAN_DATA = " + json.dumps(out, ensure_ascii=False) + ";\n"
    OUT_DATA.write_text(js)
    print(f"Wrote {OUT_DATA.relative_to(ROOT)} ({OUT_DATA.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
