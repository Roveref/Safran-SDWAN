# ============================================================================
# Geocoding dictionary — Safran SD-WAN sites
# Maps (country_code, location_prefix_8chars) → (lat, lon, canonical_label)
# For unknown sites, falls back to country centroid + deterministic hash offset.
# ============================================================================

import csv
import hashlib
import re
from pathlib import Path

# --- country centroids (fallback positions) ------------------------------
COUNTRY_CENTROID = {
    "AE": (24.42, 54.43, "United Arab Emirates"),
    "AU": (-33.87, 151.21, "Australia"),
    "BE": (50.85, 4.35, "Belgium"),
    "BR": (-22.9, -43.2, "Brazil"),
    "CA": (45.5, -73.57, "Canada"),
    "CH": (46.95, 7.45, "Switzerland"),
    "CN": (39.9, 116.4, "China"),
    "CZ": (49.75, 13.38, "Czech Republic"),
    "DE": (50.85, 10.45, "Germany"),
    "ES": (40.42, -3.7, "Spain"),
    "FR": (46.6, 2.4, "France"),
    "GB": (52.5, -1.9, "United Kingdom"),
    "IN": (19.07, 72.88, "India"),
    "IT": (41.9, 12.5, "Italy"),
    "JP": (35.68, 139.77, "Japan"),
    "KR": (37.57, 126.98, "South Korea"),
    "MA": (33.57, -7.58, "Morocco"),
    "MX": (21.0, -103.0, "Mexico"),
    "MY": (3.14, 101.69, "Malaysia"),
    "NL": (52.37, 4.9, "Netherlands"),
    "PL": (50.05, 21.0, "Poland"),
    "RO": (47.16, 27.58, "Romania"),
    "SA": (50.6, 6.0, "Safran Aerosystems BE"),
    "SG": (1.35, 103.82, "Singapore"),
    "SS": (17.37, 78.48, "Safran Sensing IN"),
    "TH": (18.58, 99.0, "Thailand"),
    "TN": (36.45, 10.73, "Tunisia"),
    "US": (39.8, -98.6, "United States"),
    "ZA": (-29.65, 31.05, "South Africa"),
}

# --- precise city positions ----------------------------------------------
# Public skeleton: empty by default. Populate locally with
# (COUNTRY_CODE, 8-char location key) -> (lat, lon, label).
CITIES = {}
OVERRIDES_CSV   = Path(__file__).resolve().parent / "geocode_overrides.csv"
SITES_GEO_CSV   = Path(__file__).resolve().parent / "sites_geo.csv"


# ============================================================================
# French department centroids — used when an address gives us a postal code
# but we don't have a precise city in the CITIES dict. Far better than the
# COUNTRY_CENTROID fallback which scatters all FR sites near "46.6, 2.4".
# Keys = first 2 digits of FR postal code.
# ============================================================================
FR_DEPARTMENTS = {
    "01": (46.20,  5.22), "02": (49.55,  3.55), "03": (46.40,  3.20), "04": (44.10,  6.30),
    "05": (44.65,  6.10), "06": (43.93,  7.08), "07": (44.75,  4.40), "08": (49.65,  4.70),
    "09": (42.95,  1.40), "10": (48.30,  4.10), "11": (43.20,  2.40), "12": (44.30,  2.55),
    "13": (43.50,  5.10), "14": (49.10, -0.40), "15": (45.05,  2.65), "16": (45.65,  0.15),
    "17": (45.75, -0.65), "18": (47.10,  2.40), "19": (45.30,  1.85), "20": (42.15,  9.00),
    "21": (47.30,  4.85), "22": (48.55, -2.85), "23": (46.10,  1.95), "24": (45.10,  0.70),
    "25": (47.20,  6.40), "26": (44.70,  5.10), "27": (49.10,  1.10), "28": (48.45,  1.50),
    "29": (48.30, -4.00), "30": (43.95,  4.20), "31": (43.50,  1.40), "32": (43.65,  0.65),
    "33": (44.80, -0.55), "34": (43.65,  3.60), "35": (48.10, -1.65), "36": (46.80,  1.55),
    "37": (47.30,  0.65), "38": (45.20,  5.65), "39": (46.65,  5.65), "40": (43.95, -0.85),
    "41": (47.55,  1.40), "42": (45.65,  4.30), "43": (45.10,  3.80), "44": (47.20, -1.55),
    "45": (47.85,  2.20), "46": (44.60,  1.55), "47": (44.30,  0.65), "48": (44.50,  3.50),
    "49": (47.45, -0.55), "50": (49.10, -1.30), "51": (49.05,  4.05), "52": (48.10,  5.20),
    "53": (48.10, -0.75), "54": (48.70,  6.20), "55": (48.95,  5.45), "56": (47.75, -2.85),
    "57": (49.10,  6.65), "58": (47.10,  3.50), "59": (50.50,  3.20), "60": (49.40,  2.40),
    "61": (48.55,  0.10), "62": (50.50,  2.30), "63": (45.75,  3.15), "64": (43.30, -0.65),
    "65": (43.10,  0.10), "66": (42.65,  2.85), "67": (48.55,  7.65), "68": (47.75,  7.30),
    "69": (45.75,  4.85), "70": (47.65,  6.10), "71": (46.65,  4.55), "72": (48.00,  0.20),
    "73": (45.55,  6.40), "74": (46.05,  6.65), "75": (48.85,  2.35), "76": (49.55,  1.10),
    "77": (48.55,  3.05), "78": (48.85,  1.95), "79": (46.30, -0.30), "80": (49.90,  2.30),
    "81": (43.85,  2.10), "82": (44.05,  1.30), "83": (43.55,  6.25), "84": (44.00,  5.10),
    "85": (46.65, -1.40), "86": (46.55,  0.45), "87": (45.85,  1.25), "88": (48.20,  6.45),
    "89": (47.85,  3.55), "90": (47.65,  6.85), "91": (48.55,  2.35), "92": (48.85,  2.25),
    "93": (48.95,  2.45), "94": (48.80,  2.45), "95": (49.05,  2.10),
}


def _parse_address(address: str, cc: str | None):
    """Extract (postal_code, city) from a postal address string.

    Returns (pc, city) where each can be None. Handles common patterns:
      - FR: "<street>, 12345 CITY[,/ FRANCE]" or "12 345 CITY"
      - DE: "<street>, 12345 City" (5-digit postal code, same shape as FR)
      - GB: "<street>, City PostalCode" (2-letter + digits)
      - Generic fallback: any 4-7 digit number followed by a city-like token
    """
    if not address:
        return None, None
    s = re.sub(r"\s+", " ", address.replace("\n", " ").strip())

    # FR / DE / similar: "<digits> <CITY>"
    if cc in ("FR", "DE", "BE", "ES", "IT", "PL", "RO", "CH", "AT", "NL", "CZ"):
        # Allow "12 345 CITY" (FR with space) or "12345 CITY"
        m = re.search(r"(\d{2})\s*(\d{3})\s+([A-Za-zÀ-ÿ][^,/\d]+?)(?:[,/]|\sFRANCE\b|$)", s, re.IGNORECASE)
        if m:
            pc = m.group(1) + m.group(2)
            city = m.group(3).strip().rstrip("/-").strip()
            # Clean trailing words like "Cedex"
            city = re.sub(r"\s+CEDEX\b.*$", "", city, flags=re.IGNORECASE).strip()
            return pc, city

    # GB-style: "City SW1A 1AA"
    if cc == "GB":
        m = re.search(r"([A-Za-z][A-Za-z\s\-']{2,30}?)\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})", s)
        if m:
            return m.group(2), m.group(1).strip()

    # Generic: postal code (3-6 digits) + city
    m = re.search(r"(\d{3,6})\s+([A-Za-zÀ-ÿ][^,/\d]{2,})(?:[,/]|$)", s)
    if m:
        return m.group(1), m.group(2).strip()
    return None, None


def _load_overrides():
    """Load per-site overrides.

    Preferred source: `sites_geo.csv` (10 cols: site_id + auto_* + override_*).
      Each override_* column, if non-empty, replaces the corresponding auto_*
      value. Granularity is per-field — you can override only the city name and
      keep the auto coords, etc. A row produces an override entry only if at
      least one override_* column is filled.

    Legacy source: `geocode_overrides.csv` (5 cols: site_id, lat, lon, label,
      country_code) — read only if sites_geo.csv is missing.
    """
    out = {}

    # --- 1. Preferred: sites_geo.csv ---
    if SITES_GEO_CSV.exists():
        try:
            with SITES_GEO_CSV.open(newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    sid = (row.get("site_id") or "").strip()
                    if not sid or sid.startswith("#"):
                        continue
                    ov_label = (row.get("override_city")    or "").strip()
                    ov_lat   = (row.get("override_lat")     or "").strip()
                    ov_lon   = (row.get("override_lon")     or "").strip()
                    ov_cc    = (row.get("override_country") or "").strip().upper()
                    if not (ov_label or ov_lat or ov_lon or ov_cc):
                        continue
                    # Per-field fallback to auto_* when the override is blank
                    try:
                        lat = float(ov_lat) if ov_lat else float(row.get("auto_lat") or "0")
                        lon = float(ov_lon) if ov_lon else float(row.get("auto_lon") or "0")
                    except ValueError:
                        continue
                    label = ov_label or (row.get("auto_city") or sid)
                    cc    = ov_cc or (row.get("auto_country") or "").strip().upper() or None
                    out[sid] = (lat, lon, label, cc)
        except Exception as e:
            print(f"  ! sites_geo.csv ignored ({e})")
        return out

    # --- 2. Legacy fallback: geocode_overrides.csv ---
    if OVERRIDES_CSV.exists():
        try:
            with OVERRIDES_CSV.open(newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    sid = (row.get("site_id") or "").strip()
                    if not sid or sid.startswith("#"):
                        continue
                    try:
                        lat = float(row["lat"])
                        lon = float(row["lon"])
                    except (KeyError, ValueError, TypeError):
                        continue
                    label = (row.get("label") or "").strip() or sid
                    cc = (row.get("country_code") or "").strip().upper() or None
                    out[sid] = (lat, lon, label, cc)
        except Exception as e:
            print(f"  ! geocode_overrides.csv ignored ({e})")
    return out


OVERRIDES = _load_overrides()


def _norm_key(location):
    """Upper-case, alnum only, first 8 chars."""
    s = re.sub(r"[^A-Za-z0-9]", "", str(location or "")).upper()[:8]
    return s


def _hash_offset(site_id, amplitude=1.6):
    """Deterministic pseudo-random offset in [-amp, amp] for dispersion."""
    h = hashlib.md5(str(site_id).encode()).digest()
    dx = (h[0] / 255.0 - 0.5) * 2 * amplitude
    dy = (h[1] / 255.0 - 0.5) * 2 * amplitude
    return dx, dy


def geocode_site(site_id, address=None):
    """
    Returns (lat, lon, label, country_code, resolution)
    resolution ∈ {"override", "city", "address", "country_fallback", "unknown"}

    `address`, when provided, is the postal address of the site. It is parsed
    to extract postal code + city, and used to resolve precise coordinates
    when the site_id-suffix lookup misses.
    """
    if not site_id:
        return (0.0, 0.0, "Unknown", None, "unknown")

    # 1. Check user overrides first
    sid = str(site_id)
    if sid in OVERRIDES:
        lat, lon, label, cc = OVERRIDES[sid]
        return (lat, lon, label, cc, "override")

    parts = sid.split("-")
    cc_match = re.match(r"^([A-Z]{2})", parts[0]) if parts else None
    cc = cc_match.group(1) if cc_match else None

    if len(parts) >= 4:
        location_raw = "-".join(parts[3:])
    else:
        location_raw = site_id

    loc_key = _norm_key(location_raw)

    if cc not in COUNTRY_CENTROID:
        cc = None

    # 2. Try precise CITIES match on the suffix
    if cc and (cc, loc_key) in CITIES:
        lat, lon, label = CITIES[(cc, loc_key)]
        return (lat, lon, label, cc, "city")

    # 3. Partial CITIES match (prefix) on the suffix
    if cc:
        for (c, k), (lat, lon, label) in CITIES.items():
            if c != cc:
                continue
            if k.startswith(loc_key[:5]) or loc_key.startswith(k[:5]):
                return (lat, lon, label, cc, "city")

    # 4. Address-based resolution: parse the postal address.
    if address and cc:
        pc, city = _parse_address(address, cc)
        if city:
            # 4a. Try the parsed city against CITIES (full + prefix match)
            city_key = _norm_key(city)
            if (cc, city_key) in CITIES:
                lat, lon, label = CITIES[(cc, city_key)]
                return (lat, lon, label, cc, "address")
            for (c, k), (lat, lon, label) in CITIES.items():
                if c != cc:
                    continue
                if k.startswith(city_key[:5]) or city_key.startswith(k[:5]):
                    return (lat, lon, label, cc, "address")
            # 4b. FR fallback: postal code → department centroid
            if cc == "FR" and pc and pc[:2] in FR_DEPARTMENTS:
                lat, lon = FR_DEPARTMENTS[pc[:2]]
                return (lat, lon, city.title(), cc, "address")
            # 4c. Other country with extracted city: use city name as label,
            #     and country centroid as coords (no precise lookup available)
            if cc in COUNTRY_CENTROID:
                base_lat, base_lon, _ = COUNTRY_CENTROID[cc]
                dx, dy = _hash_offset(site_id, amplitude=0.6)
                return (base_lat + dy, base_lon + dx, city.title(), cc, "address")

    # Country fallback with deterministic offset
    if cc and cc in COUNTRY_CENTROID:
        base_lat, base_lon, country_label = COUNTRY_CENTROID[cc]
        dx, dy = _hash_offset(site_id)
        return (base_lat + dy, base_lon + dx, country_label, cc, "country_fallback")

    return (0.0, 0.0, "Unknown", None, "unknown")


COUNTRY_NAMES = {cc: v[2] for cc, v in COUNTRY_CENTROID.items()}


if __name__ == "__main__":
    # Smoke test — uses generic site_id shapes (CC<digits>-<batch>-<BU>-<location>)
    for sid in ["FR001-1-XXX-PARIS", "GB002-1-XXX-LONDON", "US003-1-XXX-NEWYORK"]:
        print(sid, "→", geocode_site(sid))
