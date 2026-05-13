/* ============================================================
   SD-WAN Safran — Dashboard v2 (Executive Briefing)
   ============================================================ */

const DATA = window.SDWAN_DATA;
const TODAY = DATA && DATA.as_of_date ? new Date(DATA.as_of_date) : new Date();

// === Palette (mirrors CSS custom props) =====================
const C = {
  leaf:     "#6FA868",
  leafSoft: "#8BA05A",
  gold:     "#C9A449",
  goldSoft: "#D9B765",
  goldWarm: "#D49B3A",
  goldDeep: "#9B7D2A",
  rust:     "#B5573F",
  rustSoft: "#D9785F",
  teal:     "#4EA0A8",
  tealSoft: "#7DC2C8",
  alert:    "#D64545",
  alertSoft:"#ff8a80",
  paper:    "#F4EDE0",
  paperLite:"#FBF9F4",
  ink950:   "#05070F",
  ink900:   "#0A1628",
  ink700:   "#16263D",
  ink500:   "#40536E",
  ink400:   "#5B7290",
  ink300:   "#6B7F96",
  ink200:   "#8FA5BE",
  ink100:   "#C5D3E2",
  ink50:    "#E8EDF4",
};

// === Phase categories ========================================
const CATEGORIES = [
  { id: "cadrage",  label: "Cadrage",          color: C.tealSoft,
    prereqs: ["Companies Validation", "Contact"] },
  { id: "underlay", label: "Underlay",         color: C.teal,
    prereqs: ["Underlay Req", "Underlay Quote", "Underlay Order", "Site Survey Underlay", "Underlay Delivered"] },
  { id: "overlay",  label: "Overlay",          color: C.gold,
    prereqs: ["Overlay Req", "Overlay Quote", "Overlay Order", "Site Survey Overlay", "Overlay Delivered"] },
  { id: "design",   label: "Design & changes", color: C.goldSoft,
    prereqs: ["Site Constraints", "LLD As Is", "Data Collect File", "FOF Change", "LLD Ready", "Chronogram Ready", "Dynatrace"] },
  { id: "prereq",   label: "Safran prep",      color: C.goldWarm,
    prereqs: ["Remediation", "In-House Cabling", "CMDB Change", "LAN Switch Ready"] },
  { id: "golive",   label: "Go-live",          color: C.leafSoft,
    prereqs: ["C-Edge Install", "CSR Request", "Migration Change", "BGP Preparation", "Chrono Review"] },
  { id: "ob",       label: "OB delivery",      color: C.rust,
    prereqs: ["OB Site Survey", "OB BDC Validated", "OB Equipment On Site", "OB Underlay RFS",
              "OB Site Installed", "OB Migration Chronogram", "OB RFS Closure", "OB SI Closed"] },
];
const PREREQ_TO_CAT = {};
CATEGORIES.forEach(cat => cat.prereqs.forEach(p => { PREREQ_TO_CAT[p] = cat.id; }));

// === Site detail panel: lifecycle phases (Safran ↔ OBS matrix) ==
// Each phase groups one or more "milestones" — a milestone is a logical step
// that may be tracked from the Safran side (BATCH 25-26 prereqs), the OBS side
// (Onglet suivi Orange prereqs), or both. The matrix view shows the two
// columns side-by-side so divergence between the two trackers is visible.
const PHASES = [
  { id: "ph_cadrage", label: "Cadrage / Setup", milestones: [
      { label: "Companies validated",        when: "T-14W", safran: ["Companies Validation"], obs: [] },
      { label: "Site contact identified",    when: "T-13W", safran: ["Contact"], obs: [] },
      { label: "Site survey scheduled",      when: "T-12W", safran: [], obs: ["OB Site Survey"] },
  ]},
  { id: "ph_procurement", label: "Procurement", milestones: [
      { label: "Underlay request", subhint: "Req → Quote → Order", when: "T-12W → T-10W",
        safran: ["Underlay Req", "Underlay Quote", "Underlay Order"], obs: [] },
      { label: "Overlay request", subhint: "Req → Quote → Order",  when: "T-12W → T-10W",
        safran: ["Overlay Req", "Overlay Quote", "Overlay Order"], obs: [] },
      { label: "BDC / PO validated",         when: "T-11W", safran: [], obs: ["OB BDC Validated"] },
  ]},
  { id: "ph_design", label: "Site survey & design", milestones: [
      { label: "Site constraints captured",  when: "T-9W",  safran: ["Site Constraints"], obs: [] },
      { label: "Site survey done", subhint: "Underlay + Overlay", when: "T-8W",
        safran: ["Site Survey Underlay", "Site Survey Overlay"], obs: [] },
      { label: "LLD as-is captured",         when: "T-8W",  safran: ["LLD As Is"], obs: [] },
      { label: "Data collect file ready",    when: "T-6W",  safran: ["Data Collect File"], obs: [] },
      { label: "FOF change · LLD ready",     when: "T-5W",  safran: ["FOF Change", "LLD Ready"], obs: [] },
      { label: "Chronogram ready · Dynatrace", when: "T-4W", safran: ["Chronogram Ready", "Dynatrace"], obs: [] },
  ]},
  { id: "ph_delivery", label: "Equipment & underlay delivery", milestones: [
      { label: "Equipment on site",          when: "T-6W",  safran: [], obs: ["OB Equipment On Site"] },
      { label: "Underlay delivered / RFS",   when: "T-4W → T-2W",
        safran: ["Underlay Delivered"], obs: ["OB Underlay RFS"] },
      { label: "Overlay delivered",          when: "T-2W",  safran: ["Overlay Delivered"], obs: [] },
  ]},
  { id: "ph_safranprep", label: "Safran prep", milestones: [
      { label: "Remediation · cabling · CMDB", when: "T-3W",
        safran: ["Remediation", "In-House Cabling", "CMDB Change"], obs: [] },
      { label: "LAN switch ready",           when: "T-2W",  safran: ["LAN Switch Ready"], obs: [] },
  ]},
  { id: "ph_cutover", label: "Install & cutover", milestones: [
      { label: "Site install", subhint: "C-Edge / OB Site Installed", when: "T-2W → T-1W",
        safran: ["C-Edge Install"], obs: ["OB Site Installed"] },
      { label: "Pre-migration changes", subhint: "CSR · BGP · change request", when: "T-1W",
        safran: ["CSR Request", "Migration Change", "BGP Preparation"], obs: [] },
      { label: "Migration chronogram",       when: "T-1W",
        safran: ["Chrono Review"], obs: ["OB Migration Chronogram"] },
      { label: "RFS / cutover",              when: "T0",    safran: [], obs: ["OB RFS Closure"] },
      { label: "SI fully closed",            when: "T+8W",  safran: [], obs: ["OB SI Closed"] },
  ]},
];

// === Utilities ===============================================
function $(sel, root=document)   { return root.querySelector(sel); }
function $$(sel, root=document)  { return Array.from(root.querySelectorAll(sel)); }
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined && txt !== null) e.textContent = txt;
  return e;
}
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
// Compute, for each site, the earliest known date in the snapshot history.
// Called once at init after DATA is loaded; annotates DATA.sites with `added_date`.
function computeSiteAddedDates() {
  const snaps = (DATA.snapshots || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const todayIso = DATA.as_of_date || new Date().toISOString().slice(0, 10);
  const earliestSnap = snaps.length ? snaps[0].date : null;
  // Build: siteId → earliest date (from snapshots)
  const firstSeen = new Map();
  snaps.forEach(sn => {
    (sn.site_ids || []).forEach(id => {
      if (!firstSeen.has(id)) firstSeen.set(id, sn.date);
    });
  });
  DATA.sites.forEach(s => {
    const first = firstSeen.get(s.site_id);
    if (first) {
      s.added_date = first;
      // If seen in the earliest snapshot, we only know "by that date" — mark it
      s.added_before = (first === earliestSnap);
    } else {
      // Not in any snapshot → appeared in current state
      s.added_date = todayIso;
      s.added_before = false;
    }
  });
}

function fmtAddedDate(s) {
  if (!s.added_date) return `<span style="color:var(--ink-400)">—</span>`;
  const d = new Date(s.added_date);
  if (isNaN(d)) return s.added_date;
  const txt = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  if (s.added_before) {
    return `<span class="mono" style="color:var(--ink-300);font-size:11px">≤ ${txt}</span>`;
  }
  return `<span class="mono" style="color:var(--gold-500);font-size:11px">${txt}</span>`;
}

// "23 Apr 2026 · W17" — full date plus ISO week, for site ledger
function fmtDeltaDays(n) {
  if (n === null || n === undefined) return `<span style="color:var(--ink-400)">—</span>`;
  if (n === 0) return `<span style="color:var(--ink-200)">0d</span>`;
  const late = n > 0;
  const color = late ? "#D64545" : "#56B181";
  const sign = late ? "+" : "−";
  return `<span style="color:${color};font-variant-numeric:tabular-nums">${sign}${Math.abs(n)}d</span>`;
}
function fmtDateCutover(iso) {
  if (!iso) return `<span style="color:var(--ink-400)">—</span>`;
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const w = isoWeek(d);
  return `${dateStr}<span style="color:var(--ink-400);margin-left:6px">W${String(w).padStart(2, "0")}</span>`;
}
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function parseSiteId(siteId) {
  if (!siteId) return { id: "", company: null, location: null, locationDisplay: "", country: null };
  const parts = String(siteId).split("-");
  if (parts.length < 4) {
    return { id: siteId, company: null, location: null, locationDisplay: siteId, country: null };
  }
  const techId  = parts[0] + "-" + parts[1];
  const company = parts[2];
  const location = parts.slice(3).join("-");
  const cm = parts[0].match(/^([A-Z]{2})/);
  return {
    id: techId,
    company,
    location,
    locationDisplay: titleCase(location),
    country: cm ? cm[1] : null,
  };
}
function titleCase(s) {
  if (!s) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
}
function siteLabelHTML(site, opts={}) {
  const geo = site.geo_label || titleCase(parseSiteId(site.site_id).location) || site.site_id;
  const id  = parseSiteId(site.site_id).id;
  const cc  = site.country_code || "";
  const parts = [`<span class="sl-loc">${escapeHTML(geo)}</span>`];
  if (opts.showCountry !== false && cc) parts.push(`<span class="sl-country">${cc}</span>`);
  if (opts.showId !== false)           parts.push(`<span class="sl-id">${id}</span>`);
  // Native title attribute = "<site_id> — <city>" for hover discovery
  const tip = `${site.site_id}${geo ? " — " + geo : ""}`;
  return `<span class="site-label" title="${escapeHTML(tip)}">${parts.join("")}</span>`;
}
function escapeHTML(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// === Counter animation =======================================
const _counterAnims = new WeakMap();
function animateCounter(elem, to, duration=900) {
  if (!elem) return;
  // Cancel any in-flight animation on this element to prevent stale frames
  const prior = _counterAnims.get(elem);
  if (prior) cancelAnimationFrame(prior);
  const fromText = (elem.textContent || "").replace(/[^\d-]/g, "");
  const from = fromText ? parseInt(fromText, 10) : 0;
  if (from === to) { elem.textContent = fmtNum(to); _counterAnims.delete(elem); return; }
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const val = Math.round(from + (to - from) * ease(t));
    elem.textContent = fmtNum(val);
    if (t < 1) {
      _counterAnims.set(elem, requestAnimationFrame(frame));
    } else {
      _counterAnims.delete(elem);
    }
  }
  _counterAnims.set(elem, requestAnimationFrame(frame));
}

// ============================================================
// Filter state & URL hash
// ============================================================
const WINDOWS = [
  { key: "all",    short: "All",  label: "All horizon" },
  { key: "cy",     short: "CY",   label: "Current year" },
  { key: "ytd",    short: "YTD",  label: "Year to date" },
  { key: "w0-w4",  short: "4W",   label: "Next 4 weeks" },
  { key: "w0-w12", short: "12W",  label: "Next 12 weeks" },
  { key: "w0-w24", short: "24W",  label: "Next 24 weeks" },
];
const RISK_BUCKETS = [
  { key: "high",   label: "High risk",      match: s => /high/i.test(s.risk_level || "") },
  { key: "medium", label: "Medium risk",    match: s => /medium/i.test(s.risk_level || "") },
  { key: "postponed", label: "Postponed",   match: s => (s.status_detail || "") === "postponed" || /not possible/i.test(s.risk_level || "") },
  { key: "none",   label: "No risk flagged", match: s => !s.risk_level },
];

// Expand/collapse state for the phase funnel rows (independent of filter state)
const FUNNEL_EXPANDED = new Set();

// Shared what-if scenario state (velocity drives both the status bar slider and the what-if card)
const SCENARIO = { velocity: null, sbInit: false };
function baseVelocity() { return (DATA && DATA.narrative && DATA.narrative.velocity_per_week) || 0; }
function currentVelocity() { return SCENARIO.velocity != null ? SCENARIO.velocity : baseVelocity(); }
function setScenarioVelocity(v) {
  SCENARIO.velocity = v;
  const sb = document.getElementById("sb-velocity-slider");
  const wi = document.getElementById("wi-velocity");
  if (sb && Math.abs(parseFloat(sb.value) - v) > 0.01) sb.value = v;
  if (wi && Math.abs(parseFloat(wi.value) - v) > 0.01) wi.value = v;
  renderAll();
}
function projectedLandingFromVelocity(sites, velocity) {
  const total = sites.filter(s => (s.status_detail || s.status) !== "closed").length;
  const migrated = sites.filter(s => s.status === "migrated").length;
  const remaining = total - migrated;
  if (velocity <= 0 || remaining <= 0) return null;
  const weeks = Math.ceil(remaining / velocity);
  const today = new Date(DATA.as_of_date || Date.now());
  return new Date(today.getTime() + weeks * 7 * 86400000);
}
function planLandingFromSites(sites) {
  const dates = sites
    .filter(s => s.status !== "migrated" && (s.status_detail || s.status) !== "closed" && s.migration_date)
    .map(s => new Date(s.migration_date).getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
}

const filters = {
  search: "",
  window: "all",
  dateFrom: "",
  dateTo: "",
  displayUnit: "W",
  showBaseline: true,
  risk: new Set(),
  phase: new Set(),
  company: new Set(),
  country: new Set(),
  kpi: null,       // null | "scope" | "migrated" | "remaining" | "at_risk"
  phaseSlice: null, // { phase: catId, state: "done"|"partial"|"overdue"|"pending" }
};

// ============================================================
// Site-level computed helpers
// ============================================================
function siteCategoryProgress(site, catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return { pct: 0, done: 0, total: 0 };
  const prs = site.prereqs || {};
  let total = 0, sumPct = 0, done = 0;
  cat.prereqs.forEach(p => {
    if (prs[p] !== undefined && prs[p] !== null) {
      total += 1;
      sumPct += prs[p];
      if (prs[p] >= 100) done += 1;
    }
  });
  return {
    pct: total ? Math.round(sumPct / total) : 0,
    done, total,
    isComplete: total > 0 && done === total,
  };
}

function currentPhaseOfSite(site) {
  if ((site.status || "") === "migrated") return "golive";
  for (const cat of CATEGORIES) {
    const cp = siteCategoryProgress(site, cat.id);
    if (!cp.isComplete && cp.total > 0) return cat.id;
  }
  return "golive";
}

// === Lifecycle phase consolidation (matrix view) ===============
// avgPctOver(site, ["A","B"]) → average percent across the listed prereqs,
// skipping null/undefined. Returns hasData=false when none of the keys are
// tracked for this site.
function avgPctOver(site, keys) {
  const prs = site.prereqs || {};
  let sum = 0, n = 0, done = 0;
  for (const k of keys) {
    const v = prs[k];
    if (v == null) continue;
    sum += v; n += 1;
    if (v >= 100) done += 1;
  }
  return n
    ? { pct: Math.round(sum / n), total: n, done, hasData: true }
    : { pct: 0, total: 0, done: 0, hasData: false };
}

// Per-phase split: rolls up all milestones in the phase.
function phaseSplit(site, phase) {
  const safranKeys = phase.milestones.flatMap(m => m.safran);
  const obsKeys    = phase.milestones.flatMap(m => m.obs);
  return { safran: avgPctOver(site, safranKeys), obs: avgPctOver(site, obsKeys) };
}

// Per-milestone split: averages within a single milestone (multiple prereqs OK).
function milestoneSplit(site, m) {
  return { safran: avgPctOver(site, m.safran), obs: avgPctOver(site, m.obs) };
}

// True if any prereq in the milestone is < 100% past its due date.
function milestoneLate(site, m) {
  const meta = DATA.prereq_meta || {};
  const prs = site.prereqs || {};
  for (const k of [...m.safran, ...m.obs]) {
    const v = prs[k];
    const mt = meta[k];
    if (v != null && v < 100 && site.t_minus_days != null && mt && site.t_minus_days > mt.when_days) return true;
  }
  return false;
}

// === Risk transition history =================================
// Each site has site.risk_history = [{date, level}] computed in build_data.py;
// it lists only transition points (first observation + every level change).
// renderRiskTimeline returns "" when there's < 2 points (nothing happened yet
// in the captured history).
const RISK_PALETTE = {
  "high risk":            { fg: "#ff8a80", bg: "rgba(214,69,69,0.18)" },
  "medium risk":          { fg: "#D9785F", bg: "rgba(217,120,95,0.18)" },
  "low risk":             { fg: "#D9B765", bg: "rgba(217,183,101,0.18)" },
  "no risk":              { fg: "#8FA5BE", bg: "rgba(143,165,190,0.10)" },
  "not possible to plan": { fg: "#8FA5BE", bg: "rgba(143,165,190,0.10)" },
  "migrated":             { fg: "#6FA868", bg: "rgba(111,168,104,0.18)" },
};
function fmtDateCompact(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function renderRiskTimeline(site) {
  const hist = site.risk_history || [];
  if (hist.length < 2) return "";
  // Build a horizontal flow: pill (level) — date — arrow — pill — date …
  const pills = hist.map((h, i) => {
    const pal = RISK_PALETTE[h.level] || RISK_PALETTE["no risk"];
    const arrow = i < hist.length - 1
      ? '<div class="rt-arrow">→</div>' : '';
    return `
      <div class="rt-step">
        <div class="rt-pill" style="color:${pal.fg};background:${pal.bg}">${escapeHTML(h.level)}</div>
        <div class="rt-date">${fmtDateCompact(h.date)}</div>
      </div>
      ${arrow}
    `;
  }).join("");
  return `
    <div class="risk-timeline">
      <div class="rt-label">Risk history</div>
      <div class="rt-flow">${pills}</div>
    </div>
  `;
}

// First phase that is not 100% complete on either tracker.
function currentMatrixPhase(site) {
  for (const phase of PHASES) {
    const ps = phaseSplit(site, phase);
    const safranIncomplete = ps.safran.hasData && ps.safran.pct < 100;
    const obsIncomplete    = ps.obs.hasData    && ps.obs.pct    < 100;
    if (safranIncomplete || obsIncomplete) return phase.id;
  }
  return PHASES[PHASES.length - 1].id;
}

// Mutually-exclusive classification of a site's state for a given phase:
// done   → all milestones complete
// overdue → at least one incomplete milestone whose due date has passed
// partial → some progress, not overdue
// pending → no milestone data OR no progress
function sitePhaseState(site, catId) {
  const cp = siteCategoryProgress(site, catId);
  if (cp.total === 0) return "pending";
  if (cp.isComplete) return "done";
  const prereqMeta = DATA.prereq_meta || {};
  const cat = CATEGORIES.find(c => c.id === catId);
  const tm = site.t_minus_days;
  if (cat) {
    for (const p of cat.prereqs) {
      const m = prereqMeta[p]; if (!m) continue;
      const v = (site.prereqs || {})[p];
      if (v === null || v === undefined || v >= 100) continue;
      if (tm != null && tm > m.when_days) return "overdue";
    }
  }
  if (cp.pct > 0) return "partial";
  return "pending";
}

function siteRiskBucket(site) {
  if ((site.status || "") === "migrated") return "done";
  for (const b of RISK_BUCKETS) if (b.match(site)) return b.key;
  return "none";
}

function overdueCountForSite(site) {
  const prereqMeta = DATA.prereq_meta || {};
  let count = 0;
  for (const [k, v] of Object.entries(site.prereqs || {})) {
    if (v === null || v >= 100) continue;
    const meta = prereqMeta[k];
    if (!meta) continue;
    const whenDays = meta.when_days;
    const tMinus = site.t_minus_days;
    if (whenDays == null || tMinus == null) continue;
    // If T-n is in the past (tMinus > whenDays, negative direction), milestone is overdue
    if (tMinus > whenDays) count += 1;
  }
  return count;
}

// ============================================================
// Filter application
// ============================================================
function applyFilter(sites) {
  const q = (filters.search || "").trim().toLowerCase();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo   = filters.dateTo   ? new Date(filters.dateTo)   : null;
  const win = filters.window;
  const todayStart = new Date(TODAY); todayStart.setHours(0,0,0,0);

  return sites.filter(s => {
    // Closed sites are excluded from every downstream count/render
    if ((s.status_detail || s.status) === "closed") return false;
    // KPI quick filter
    if (filters.kpi === "migrated" && s.status !== "migrated") return false;
    if (filters.kpi === "remaining") {
      if (s.status === "migrated") return false;
    }
    if (filters.kpi === "at_risk") {
      if (s.status === "migrated") return false;
      const r = (s.risk_level || "").toLowerCase();
      if (!/high risk|medium risk/.test(r)) return false;
    }
    // Search
    if (q) {
      const hay = [
        s.site_id, s.company, s.geo_label, s.address,
        s.it_contact, s.fac_contact, s.comment, s.migration_referent,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // Risk
    if (filters.risk.size) {
      const b = siteRiskBucket(s);
      if (!filters.risk.has(b)) return false;
    }
    // Phase — "migrated" is a synthetic bucket separate from currentPhaseOfSite,
    // which always returns one of the CATEGORIES ids (it would say "golive" for
    // migrated sites). Treat the two cases independently.
    if (filters.phase.size) {
      const p = (s.status === "migrated") ? "migrated" : currentPhaseOfSite(s);
      if (!filters.phase.has(p)) return false;
    }
    // Phase slice (funnel segment click: phase + state)
    if (filters.phaseSlice) {
      const { phase, state } = filters.phaseSlice;
      if (sitePhaseState(s, phase) !== state) return false;
    }
    // Company
    if (filters.company.size && !filters.company.has(s.company)) return false;
    // Country
    if (filters.country.size && !filters.country.has(s.country_code)) return false;

    // Time window
    const md = s.migration_date ? new Date(s.migration_date) : null;
    if (dateFrom || dateTo) {
      if (!md) return false;
      if (dateFrom && md < dateFrom) return false;
      if (dateTo && md > dateTo) return false;
    } else if (win && win !== "all") {
      // Undated sites: only kept in "cy" (current year scope), excluded from forward/past windows
      if (!md) {
        if (win !== "cy") return false;
      } else {
        const deltaDays = (md - todayStart) / 86400000;
        if (win === "cy"    && md.getFullYear() !== todayStart.getFullYear()) return false;
        if (win === "ytd"   && (md.getFullYear() !== todayStart.getFullYear() || md > todayStart)) return false;
        if (win === "w0-w4"  && (deltaDays < 0 || deltaDays > 28)) return false;
        if (win === "w0-w12" && (deltaDays < 0 || deltaDays > 84)) return false;
        if (win === "w0-w24" && (deltaDays < 0 || deltaDays > 168)) return false;
      }
    }

    return true;
  });
}

// ============================================================
// Filter UI construction
// ============================================================
function initFilters() {
  // Time window pill buttons
  const fw = $("#f-window");
  WINDOWS.forEach(w => {
    const btn = el("button", "pill-btn" + (w.key === filters.window ? " active" : ""));
    btn.type = "button";
    btn.dataset.value = w.key;
    btn.textContent = w.short;
    btn.title = w.label;
    fw.appendChild(btn);
  });
  fw.addEventListener("click", e => {
    const btn = e.target.closest(".pill-btn");
    if (!btn) return;
    filters.window = btn.dataset.value;
    filters.dateFrom = ""; filters.dateTo = "";
    const df = $("#f-date-from"); if (df) df.value = "";
    const dt = $("#f-date-to");   if (dt) dt.value = "";
    $$("#f-window .pill-btn").forEach(b => b.classList.toggle("active", b === btn));
    renderAll();
  });

  // Risk checks
  const activeAll = DATA.sites.filter(s => (s.status_detail || s.status) !== "closed");
  const fr = $("#f-risk");
  const riskCounts = bucketCounts(activeAll, siteRiskBucket);
  RISK_BUCKETS.forEach(b => {
    const lbl = el("label", "check-label");
    lbl.innerHTML = `<input type="checkbox" value="${b.key}"><span class="check-mark"></span>${b.label}<span class="check-count">${riskCounts[b.key]||0}</span>`;
    fr.appendChild(lbl);
  });
  fr.addEventListener("change", e => {
    const v = e.target.value;
    e.target.checked ? filters.risk.add(v) : filters.risk.delete(v);
    renderAll();
  });

  // Phase checks
  const fp = $("#f-phase");
  const phaseCounts = bucketCounts(activeAll.filter(s => s.status !== "migrated"), currentPhaseOfSite);
  const migratedCount = activeAll.filter(s => s.status === "migrated").length;
  CATEGORIES.forEach(c => {
    const lbl = el("label", "check-label");
    lbl.innerHTML = `<input type="checkbox" value="${c.id}"><span class="check-mark"></span>${c.label}<span class="check-count">${phaseCounts[c.id]||0}</span>`;
    fp.appendChild(lbl);
  });
  // Migrated bucket — sites already cut over (status === "migrated").
  const lblMig = el("label", "check-label");
  lblMig.innerHTML = `<input type="checkbox" value="migrated"><span class="check-mark"></span>Migrated<span class="check-count">${migratedCount}</span>`;
  fp.appendChild(lblMig);
  fp.addEventListener("change", e => {
    const v = e.target.value;
    e.target.checked ? filters.phase.add(v) : filters.phase.delete(v);
    filters.phaseSlice = null;
    renderAll();
  });

  // Company checks
  const fc = $("#f-company");
  const coCounts = {};
  activeAll.forEach(s => { const c = s.company || "—"; coCounts[c] = (coCounts[c]||0)+1; });
  Object.keys(coCounts).sort().forEach(co => {
    const lbl = el("label", "check-label");
    lbl.innerHTML = `<input type="checkbox" value="${co}"><span class="check-mark"></span>${co}<span class="check-count">${coCounts[co]}</span>`;
    fc.appendChild(lbl);
  });
  fc.addEventListener("change", e => {
    const v = e.target.value;
    e.target.checked ? filters.company.add(v) : filters.company.delete(v);
    renderAll();
  });

  // Search, dates, unit
  $("#f-search").addEventListener("input", e => { filters.search = e.target.value; renderAll(); });
  $("#f-date-from")?.addEventListener("change", e => {
    filters.dateFrom = e.target.value;
    if (e.target.value) { filters.window = ""; $$("#f-window .pill-btn").forEach(b => b.classList.remove("active")); }
    renderAll();
  });
  $("#f-date-to")?.addEventListener("change", e => {
    filters.dateTo = e.target.value;
    if (e.target.value) { filters.window = ""; $$("#f-window .pill-btn").forEach(b => b.classList.remove("active")); }
    renderAll();
  });
  $$('input[name="display-unit"]').forEach(r => r.addEventListener("change", e => { filters.displayUnit = e.target.value; renderAll(); }));

  const baselineToggle = $("#cad-toggle-baseline");
  if (baselineToggle) {
    baselineToggle.addEventListener("click", () => {
      filters.showBaseline = !filters.showBaseline;
      baselineToggle.classList.toggle("active", filters.showBaseline);
      renderAll();
    });
  }

  $("#reset-filters").addEventListener("click", () => {
    filters.search = ""; filters.window = "all"; filters.dateFrom = ""; filters.dateTo = "";
    filters.risk.clear(); filters.phase.clear(); filters.company.clear(); filters.country.clear();
    filters.phaseSlice = null;
    filters.kpi = null;
    $("#f-search").value = "";
    const df = $("#f-date-from"); if (df) df.value = "";
    const dt = $("#f-date-to");   if (dt) dt.value = "";
    $$('input[type="checkbox"]', document.querySelector(".sidebar")).forEach(cb => cb.checked = false);
    $$("#f-window .pill-btn").forEach(b => b.classList.toggle("active", b.dataset.value === "all"));
    renderAll();
  });
}

// KPI tile click → quick filter
function bindKpiTiles() {
  const mapping = [
    { ids: ["kpi-total",    "pm-kpi-total"],     kpi: "scope"     },
    { ids: ["kpi-migrated", "pm-kpi-migrated"],  kpi: "migrated"  },
    { ids: ["kpi-remaining","pm-kpi-remaining"], kpi: "remaining" },
    { ids: ["kpi-high-risk","pm-kpi-high-risk"], kpi: "at_risk"   },
  ];
  mapping.forEach(m => {
    m.ids.forEach(id => {
      const tile = document.getElementById(id);
      if (!tile) return;
      const card = tile.closest(".kpi");
      if (!card) return;
      card.style.cursor = "pointer";
      card.dataset.kpiKey = m.kpi;
      card.addEventListener("click", () => {
        if (m.kpi === "scope") {
          // Clicking "Scope" resets the KPI quick-filter
          filters.kpi = null;
        } else {
          filters.kpi = filters.kpi === m.kpi ? null : m.kpi;
        }
        renderAll();
      });
    });
  });
}

function updateKpiActiveState() {
  $$(".kpi[data-kpi-key]").forEach(c => {
    const active = filters.kpi && c.dataset.kpiKey === filters.kpi;
    c.classList.toggle("kpi-active", !!active);
  });
}

function bucketCounts(sites, fn) {
  const out = {};
  sites.forEach(s => { const k = fn(s); out[k] = (out[k]||0)+1; });
  return out;
}

// ============================================================
// Tooltip
// ============================================================
const tooltip = $("#chart-tooltip");
function showTooltip(html, evt) {
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  positionTooltip(evt);
}
function positionTooltip(evt) {
  const r = tooltip.getBoundingClientRect();
  const x = Math.min(evt.clientX + 14, window.innerWidth - r.width - 12);
  const y = Math.min(evt.clientY + 14, window.innerHeight - r.height - 12);
  tooltip.style.left = x + "px";
  tooltip.style.top  = y + "px";
}
function hideTooltip() { tooltip.style.display = "none"; }

// ============================================================
// STATUS BAR + HEADER
// ============================================================
function renderHeader() {
  const asof = $("#hdr-asof");
  if (asof) asof.textContent = fmtDate(DATA.as_of_date);
  const week = $("#hdr-week");
  if (week) {
    const w = isoWeek(new Date(DATA.as_of_date));
    week.textContent = `CW${String(w).padStart(2, "0")} ${new Date(DATA.as_of_date).getFullYear()}`;
  }
  const build = $("#hdr-build");
  if (build && DATA.v2_build) build.textContent = "Build " + DATA.v2_build.slice(0, 16).replace("T", " ");
}

function renderStatusBar(sites) {
  const total = sites.filter(s => (s.status_detail || s.status) !== "closed").length;
  const migrated = sites.filter(s => s.status === "migrated").length;
  const highRisk = sites.filter(s => s.status !== "migrated" && /high risk/i.test(s.risk_level || "")).length;
  const medRisk  = sites.filter(s => s.status !== "migrated" && /medium risk/i.test(s.risk_level || "")).length;
  const atRisk = highRisk + medRisk;
  const pct = total ? (100 * migrated / total) : 0;
  const velocity = currentVelocity();

  // Status-based signal
  const dot = $("#sb-dot");
  if (highRisk >= 20) { dot.className = "status-bar-dot alert"; }
  else if (atRisk >= 30) { dot.className = "status-bar-dot warn"; }
  else { dot.className = "status-bar-dot"; }

  $("#sb-scope").textContent    = fmtNum(total);
  $("#sb-migrated").textContent = fmtNum(migrated);
  $("#sb-pct").textContent      = pct.toFixed(1) + "%";
  $("#sb-risk").textContent     = fmtNum(atRisk);
  $("#sb-velocity").textContent = velocity.toFixed(1);

  const proj = projectedLandingFromVelocity(sites, velocity);
  $("#sb-landing").textContent = proj ? fmtDateShort(proj.toISOString()) : "—";
  const plan = planLandingFromSites(sites);
  $("#sb-landing-plan").textContent = plan ? fmtDateShort(plan.toISOString()) : "—";

  // One-time slider init
  const slider = $("#sb-velocity-slider");
  if (slider && !SCENARIO.sbInit) {
    const base = baseVelocity();
    slider.max = Math.max(15, Math.ceil(base * 2.5));
    slider.value = velocity.toFixed(1);
    slider.addEventListener("input", e => setScenarioVelocity(parseFloat(e.target.value)));
    SCENARIO.sbInit = true;
  }
}

// ============================================================
// NARRATIVE
// ============================================================
function renderNarrative(sites) {
  const total = sites.filter(s => (s.status_detail || s.status) !== "closed").length;
  const migrated = sites.filter(s => s.status === "migrated").length;
  const remaining = total - migrated;
  const pct = total ? (100 * migrated / total) : 0;
  const highRisk = sites.filter(s => s.status !== "migrated" && /high risk/i.test(s.risk_level || "")).length;
  const medRisk  = sites.filter(s => s.status !== "migrated" && /medium risk/i.test(s.risk_level || "")).length;
  const narr = DATA.narrative || {};
  const velocity = narr.velocity_per_week || 0;
  const landing = narr.projected_landing;

  // Countries count (distinct among filtered sites)
  const countries = new Set(sites.map(s => s.country_code).filter(Boolean));

  // Top 2 blockers — filtered
  const blockerCounts = {};
  sites.forEach(s => {
    if (s.status === "migrated") return;
    Object.entries(s.prereqs || {}).forEach(([k, v]) => {
      if (v === null || v >= 100) return;
      blockerCounts[k] = (blockerCounts[k] || 0) + 1;
    });
  });
  const topBlockers = Object.entries(blockerCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const blockerMeta = DATA.prereq_meta || {};

  // Landing insight vs target
  const targetDate = new Date("2026-07-15"); // Safran commitment
  let landingInsight = "";
  if (landing && velocity > 0) {
    const landDate = new Date(landing);
    const daysDelta = Math.round((landDate - targetDate) / 86400000);
    if (daysDelta <= 0) {
      landingInsight = `<span class="n-ok">on track</span> to land on <span class="num">${fmtDateShort(landing)}</span> (within target).`;
    } else if (daysDelta <= 14) {
      landingInsight = `trending to land on <span class="num">${fmtDateShort(landing)}</span> — <span class="n-alert">${daysDelta} days</span> past the mid-July commitment.`;
    } else {
      landingInsight = `<span class="n-alert">off track</span>: at current velocity the program lands <span class="num">${fmtDateShort(landing)}</span>, <span class="n-alert">${daysDelta} days</span> past target.`;
    }
  }

  const blockerText = topBlockers.length
    ? `The <strong>critical path</strong> is pinned on <em>${escapeHTML(topBlockers[0][0])}</em> (<span class="num">${topBlockers[0][1]}</span> sites stuck${topBlockers[0] && blockerMeta[topBlockers[0][0]] ? `, owner <em>${escapeHTML(blockerMeta[topBlockers[0][0]].owner || "—")}</em>` : ""})${topBlockers[1] ? ` and <em>${escapeHTML(topBlockers[1][0])}</em> (<span class="num">${topBlockers[1][1]}</span>)` : ""}.`
    : "";

  const riskText = (highRisk + medRisk) > 0
    ? `Of the remaining <span class="num">${remaining}</span> sites, <span class="n-alert">${highRisk}</span> are flagged high-risk and <span class="num">${medRisk}</span> medium — concentrated follow-up is warranted.`
    : "";

  const paragraphs = [
    `As of <span class="num">${fmtDate(DATA.as_of_date)}</span>, the programme has cut over <strong>${migrated}</strong> of <span class="num">${total}</span> sites across <span class="num">${countries.size}</span> countries — ${landingInsight}`,
    blockerText,
    riskText,
  ].filter(p => p && p.trim());
  const html = paragraphs.map(p => `<p>${p}</p>`).join("");
  const body = $("#narrative-body");
  if (!body) return;  // narrative section removed from the layout
  body.innerHTML = html;

  const nhPct = $("#nh-pct");
  nhPct.textContent = "0";
  const target = pct.toFixed(1);
  const dur = 1100;
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    nhPct.textContent = (parseFloat(target) * ease(t)).toFixed(1);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ============================================================
// KPIs
// ============================================================
function renderKPIs(sites) {
  const snap = COMPARE.snapshot;
  let total, migrated, remaining, high, med, atRisk;
  if (snap) {
    // Show the absolute numbers of the selected historical date
    total = snap.total;
    migrated = snap.migrated;
    remaining = snap.remaining;
    high = snap.highRisk;
    med = snap.medRisk;
    atRisk = snap.atRisk;
  } else {
    total = sites.filter(s => (s.status_detail || s.status) !== "closed").length;
    migrated = sites.filter(s => s.status === "migrated").length;
    remaining = total - migrated;
    high = sites.filter(s => s.status !== "migrated" && /high risk/i.test(s.risk_level || "")).length;
    med  = sites.filter(s => s.status !== "migrated" && /medium risk/i.test(s.risk_level || "")).length;
    atRisk = high + med;
  }
  const pct = total ? (100 * migrated / total) : 0;

  animateCounter($("#kpi-total"),    total);
  animateCounter($("#kpi-migrated"), migrated);
  animateCounter($("#kpi-remaining"), remaining);
  animateCounter($("#kpi-high-risk"), atRisk);
  $("#kpi-pct").textContent = pct.toFixed(1) + "%";
  $("#kpi-high-risk-sub").textContent = `${high} high · ${med} medium`;

  // Only pulse the risk KPI when there is risk worth pulsing
  const riskKpi = $("#kpi-high-risk").closest(".kpi");
  if (riskKpi) riskKpi.classList.toggle("accent-alert", atRisk > 0);

  // PM tab KPIs (same data)
  $("#pm-kpi-total").textContent     = fmtNum(total);
  $("#pm-kpi-migrated").textContent  = fmtNum(migrated);
  $("#pm-kpi-remaining").textContent = fmtNum(remaining);
  $("#pm-kpi-high-risk").textContent = fmtNum(atRisk);
  $("#pm-kpi-pct").textContent       = pct.toFixed(1) + "%";
  $("#pm-kpi-high-risk-sub").textContent = `${high} high · ${med} medium`;

  // Period comparison deltas (only shown when a snapshot is picked)
  renderCompareDeltas();
}

// ============================================================
// PERIOD COMPARISON
// ============================================================
const COMPARE = { snapshot: null };

function setupCompareUI() {
  const sel = $("#compare-select");
  if (!sel) return;
  const snaps = (DATA.snapshots || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  // Build options: exclude the most recent date if it equals DATA.as_of_date (it's "current")
  snaps.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.date;
    const d = new Date(s.date);
    const cw = isoWeek(d);
    opt.textContent = `${s.date} · CW${String(cw).padStart(2, "0")} · ${s.total} sites`;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", e => {
    const val = e.target.value;
    COMPARE.snapshot = val ? snaps.find(s => s.date === val) : null;
    const hint = $("#compare-hint");
    if (COMPARE.snapshot) {
      const d = new Date(COMPARE.snapshot.date);
      const today = new Date(DATA.as_of_date || new Date());
      const deltaDays = Math.round((today - d) / 86400000);
      const weeks = Math.round(deltaDays / 7);
      hint.textContent = weeks > 0 ? `${weeks} weeks ago` : weeks < 0 ? `${-weeks} weeks ahead` : "same week";
    } else {
      hint.textContent = "";
    }
    renderAll();
  });
}

function renderCompareDeltas() {
  const snap = COMPARE.snapshot;
  const ids = ["kpi-total-delta", "kpi-migrated-delta", "kpi-remaining-delta", "kpi-risk-delta"];
  ids.forEach(id => {
    const el = $("#" + id);
    if (!el) return;
    if (!snap) { el.innerHTML = ""; el.className = "kpi-delta"; return; }
    const sd = new Date(snap.date);
    const label = sd.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    el.className = "kpi-delta historical";
    el.innerHTML = `<span class="kd-base">as of ${label}</span>`;
  });
}

// ============================================================
// WORLD MAP — equirectangular projection
// ============================================================
const MAP = {
  viewBox: { w: 1000, h: 480 },
  // Crop: skip Antarctica (lat < -60), keep the inhabited world
  bounds: { latMin: -58, latMax: 78, lonMin: -170, lonMax: 180 },
  world: null,
};

// Zoom & pan state — persisted across filter re-renders
const MAP_ZOOM = {
  box: [0, 0, 1000, 480],   // current viewBox [x, y, w, h]
  scale: 1,
  minScale: 1,
  maxScale: 18,
  listenersAttached: false,
};

// SD-WAN overlay hub (Safran HQ, Gennevilliers) + connection layer toggle
const SDWAN_HUB = { lat: 48.933, lon: 2.302, label: "Safran HQ" };
const MAP_FX = { showConnections: true };

function mapProject(lat, lon) {
  const { latMin, latMax, lonMin, lonMax } = MAP.bounds;
  const x = (lon - lonMin) / (lonMax - lonMin) * MAP.viewBox.w;
  const y = (latMax - lat) / (latMax - latMin) * MAP.viewBox.h;
  return [x, y];
}

async function loadWorldMap() {
  try {
    const resp = await fetch("world.json?v=1");
    if (!resp.ok) return null;
    const j = await resp.json();
    MAP.world = j;
    return j;
  } catch (e) {
    console.warn("world.json not loaded:", e);
    return null;
  }
}

function renderWorldMap(sites) {
  const svg = $("#worldmap-svg");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", MAP_ZOOM.box.join(" "));
  const { w, h } = MAP.viewBox;

  // Attach zoom/pan listeners once (SVG element persists across re-renders)
  if (!MAP_ZOOM.listenersAttached) {
    attachMapZoomPan(svg);
    MAP_ZOOM.listenersAttached = true;
  }

  // Defs: glow filter
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <filter id="wm-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="wm-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#C9A449" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#C9A449" stop-opacity="0"/>
    </radialGradient>
  `;
  svg.appendChild(defs);

  // (No graticule — cleaner editorial look on dark background)

  // Countries polygons
  if (MAP.world && MAP.world.countries) {
    const countriesWithSites = new Set(
      sites.map(s => s.country_code).filter(Boolean)
    );
    const numericToIso = {
      "004":"AF","008":"AL","010":"AQ","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ","032":"AR",
      "036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","051":"AM","052":"BB","056":"BE","060":"BM","064":"BT",
      "068":"BO","070":"BA","072":"BW","076":"BR","084":"BZ","090":"SB","096":"BN","100":"BG","104":"MM","108":"BI",
      "112":"BY","116":"KH","120":"CM","124":"CA","132":"CV","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN",
      "158":"TW","170":"CO","174":"KM","178":"CG","180":"CD","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ",
      "204":"BJ","208":"DK","214":"DO","218":"EC","222":"SV","226":"GQ","231":"ET","232":"ER","233":"EE","242":"FJ",
      "246":"FI","250":"FR","254":"GF","258":"PF","260":"TF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS",
      "276":"DE","288":"GH","292":"GI","296":"KI","300":"GR","304":"GL","308":"GD","320":"GT","324":"GN","328":"GY",
      "332":"HT","340":"HN","344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE",
      "376":"IL","380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR",
      "414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV","430":"LR","434":"LY","438":"LI","440":"LT",
      "442":"LU","446":"MO","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML","478":"MR","484":"MX","492":"MC",
      "496":"MN","498":"MD","499":"ME","504":"MA","508":"MZ","512":"OM","516":"NA","524":"NP","528":"NL","540":"NC",
      "548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","578":"NO","586":"PK","591":"PA","598":"PG","600":"PY",
      "604":"PE","608":"PH","616":"PL","620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","642":"RO","643":"RU",
      "646":"RW","682":"SA","686":"SN","688":"RS","690":"SC","694":"SL","702":"SG","703":"SK","704":"VN","705":"SI",
      "706":"SO","710":"ZA","716":"ZW","724":"ES","728":"SS","729":"SD","740":"SR","748":"SZ","752":"SE","756":"CH",
      "760":"SY","762":"TJ","764":"TH","768":"TG","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR","795":"TM",
      "800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","834":"TZ","840":"US","854":"BF","858":"UY","860":"UZ",
      "862":"VE","882":"WS","887":"YE","894":"ZM","999":"XX",
    };
    // Split rings when two consecutive vertices jump > 180° of longitude
    // (fixes Russia/Fiji polygons that would otherwise draw as giant horizontal bars)
    function splitRingAtAntimeridian(ring) {
      if (ring.length < 2) return [ring];
      const parts = [];
      let current = [ring[0]];
      for (let i = 1; i < ring.length; i++) {
        const [prevLon, prevLat] = ring[i - 1];
        const [lon, lat] = ring[i];
        if (Math.abs(lon - prevLon) > 180) {
          // Edge crosses the antimeridian. Interpolate latitude at ±180
          // and add boundary vertices on both sides of the split.
          const exitLon  = prevLon > 0 ?  180 : -180;
          const enterLon = prevLon > 0 ? -180 :  180;
          const lonAdj   = prevLon > 0 ? lon + 360 : lon - 360;
          const denom = lonAdj - prevLon;
          // Fallback to midpoint latitude when endpoints sit exactly on ±180 (denom=0)
          const t = Math.abs(denom) > 1e-9 ? (exitLon - prevLon) / denom : 0.5;
          const crossLat = prevLat + t * (lat - prevLat);
          current.push([exitLon, crossLat]);
          parts.push(current);
          current = [[enterLon, crossLat]];
        }
        current.push(ring[i]);
      }
      parts.push(current);

      // If the ring is closed (first == last vertex) and we produced ≥2 parts,
      // the first and last parts belong to the same landmass chunk — merge them
      // so SVG closes along the antimeridian edge (invisible) rather than with
      // a diagonal chord across the map.
      if (parts.length >= 2) {
        const f = ring[0], l = ring[ring.length - 1];
        const closed = Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6;
        if (closed) {
          const merged = parts[parts.length - 1].concat(parts[0].slice(1));
          parts.pop();
          parts[0] = merged;
        }
      }
      return parts.filter(p => p.length >= 3);
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    MAP.world.countries.forEach(ct => {
      const iso = numericToIso[ct.id] || null;
      const hasSites = iso && countriesWithSites.has(iso);
      ct.polygons.forEach(poly => {
        poly.forEach(ring => {
          if (ring.length < 3) return;
          const subRings = splitRingAtAntimeridian(ring);
          subRings.forEach(sub => {
            const { latMin, latMax, lonMin, lonMax } = MAP.bounds;
            const pts = sub.map(([lon, lat]) => {
              const latC = Math.max(latMin, Math.min(latMax, lat));
              const lonC = Math.max(lonMin, Math.min(lonMax, lon));
              return mapProject(latC, lonC).map(n => n.toFixed(1)).join(",");
            }).join(" ");
            if (!pts) return;
            const polyEl = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polyEl.setAttribute("points", pts);
            polyEl.setAttribute("class", "wm-country" + (hasSites ? " has-sites clickable" : ""));
            polyEl.setAttribute("data-iso", iso || "");
            polyEl.setAttribute("data-name", ct.name || "");
            if (hasSites) {
              polyEl.addEventListener("click", () => zoomToCountry(iso));
            }
            g.appendChild(polyEl);
          });
        });
      });
    });
    svg.appendChild(g);
  }

  // Site markers — aggregate nearby sites at same coords for clarity
  const clusters = {};
  sites.forEach(s => {
    if (s.lat == null || s.lon == null) return;
    const key = `${s.lat.toFixed(1)}|${s.lon.toFixed(1)}`;
    (clusters[key] = clusters[key] || []).push(s);
  });

  // SD-WAN connection layer — gold pulses from Safran HQ hub to migrated sites
  if (MAP_FX.showConnections) {
    const [hubX, hubY] = mapProject(SDWAN_HUB.lat, SDWAN_HUB.lon);
    const linksLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksLayer.setAttribute("class", "wm-links");
    let linkIdx = 0;
    Object.entries(clusters).forEach(([k, group]) => {
      const migratedN = group.filter(s => s.status === "migrated").length;
      if (migratedN === 0) return;
      const first = group[0];
      const [sx, sy] = mapProject(first.lat, first.lon);
      const dx = sx - hubX, dy = sy - hubY;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) return;  // skip sites sitting on top of the hub
      // Arc: midpoint lifted perpendicular to the line for a gentle bow
      const midX = (hubX + sx) / 2, midY = (hubY + sy) / 2;
      const bow = Math.min(dist * 0.18, 60);
      const nx = -dy / dist, ny = dx / dist;
      const cpX = midX + nx * bow, cpY = midY + ny * bow - bow * 0.3;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${hubX.toFixed(1)},${hubY.toFixed(1)} Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${sx.toFixed(1)},${sy.toFixed(1)}`);
      path.setAttribute("class", "wm-link");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.style.animationDelay = (linkIdx * 140 % 2800) + "ms";
      linksLayer.appendChild(path);
      linkIdx++;
    });
    svg.appendChild(linksLayer);
  }
  const dotsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  dotsLayer.setAttribute("class", "wm-dots");
  let dotIdx = 0;
  Object.entries(clusters).forEach(([k, group]) => {
    const first = group[0];
    const [x, y] = mapProject(first.lat, first.lon);
    // Status aggregation — priority: high > medium > postponed > migrated > none
    const migrated  = group.every(s => s.status === "migrated");
    const anyHigh   = group.some(s => s.status !== "migrated" && /high risk/i.test(s.risk_level || ""));
    const anyMed    = group.some(s => s.status !== "migrated" && /medium risk/i.test(s.risk_level || ""));
    const anyPost   = group.some(s => s.status !== "migrated" && (
        (s.status_detail || "") === "postponed"
        || /not possible/i.test(s.risk_level || "")
    ));
    let cls = "wm-site";
    if (anyHigh)        cls += " risk-high";
    else if (anyMed)    cls += " risk-med";
    else if (anyPost)   cls += " postponed";
    else if (migrated)  cls += " migrated";
    // otherwise falls back to grey default (no-risk)
    const r = Math.min(2.5 + Math.log2(group.length + 1) * 1.4, 8);

    const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circ.setAttribute("cx", x.toFixed(1));
    circ.setAttribute("cy", y.toFixed(1));
    circ.setAttribute("r", (r / MAP_ZOOM.scale).toFixed(2));
    circ.dataset.baseR = r.toFixed(2);
    circ.setAttribute("class", cls);
    circ.setAttribute("vector-effect", "non-scaling-stroke");
    circ.style.animationDelay = (dotIdx * 8) + "ms";
    circ.setAttribute("filter", "url(#wm-glow)");

    circ.addEventListener("mouseenter", evt => {
      const titleLabel = group.length === 1
        ? (group[0].geo_label || parseSiteId(group[0].site_id).locationDisplay)
        : `${group.length} sites · ${first.geo_label}`;
      const countryName = group[0].country_code ? group[0].country_code : "—";
      const migratedN = group.filter(s => s.status === "migrated").length;
      const riskN = group.filter(s => s.status !== "migrated" && /(high|medium)/i.test(s.risk_level || "")).length;
      const html = `
        <div class="tt-title">${escapeHTML(titleLabel)} <em>·</em> ${escapeHTML(countryName)}</div>
        <div class="tt-row"><span class="tt-k">Sites</span><span class="tt-v">${group.length}</span></div>
        <div class="tt-row"><span class="tt-k">Migrated</span><span class="tt-v">${migratedN}</span></div>
        <div class="tt-row"><span class="tt-k">At risk</span><span class="tt-v">${riskN}</span></div>
        ${group.slice(0, 5).map(s => `
          <div class="tt-row"><span class="tt-k mono" style="font-size:10px">${escapeHTML(s.site_id)}</span><span class="tt-v" style="font-style:italic">${escapeHTML(s.geo_label || "—")}</span></div>
        `).join("")}
        ${group.length > 5 ? `<div class="tt-row"><span class="tt-k">… +${group.length - 5} more</span></div>` : ""}
      `;
      showTooltip(html, evt);
    });
    circ.addEventListener("mousemove", positionTooltip);
    circ.addEventListener("mouseleave", hideTooltip);
    circ.addEventListener("click", () => {
      if (group.length === 1) {
        selectPMSite(group[0].site_id);
        activateTab("pm");
      }
    });
    dotsLayer.appendChild(circ);

    // pulse halo if at-risk (high or medium — not postponed/grey/migrated)
    if ((anyHigh || anyMed) && !migrated) {
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("cx", x.toFixed(1));
      halo.setAttribute("cy", y.toFixed(1));
      const baseHalo = r * 1.6;
      halo.setAttribute("r", (baseHalo / MAP_ZOOM.scale).toFixed(2));
      halo.dataset.baseR = baseHalo.toFixed(2);
      halo.setAttribute("class", "wm-pulse");
      halo.setAttribute("fill", anyHigh ? C.alert : "#F59E0B");
      halo.style.animationDelay = (dotIdx * 12 + 200) + "ms";
      dotsLayer.insertBefore(halo, circ);
    }
    dotIdx++;
  });
  svg.appendChild(dotsLayer);

  // Country tallies beneath map
  const tallies = $("#worldmap-tallies");
  tallies.innerHTML = "";
  const cc2info = {};
  sites.forEach(s => {
    const cc = s.country_code; if (!cc) return;
    cc2info[cc] = cc2info[cc] || { cc, total: 0, migrated: 0, risk: 0, name: s.geo_label };
    cc2info[cc].total += 1;
    if (s.status === "migrated") cc2info[cc].migrated += 1;
    if (s.status !== "migrated" && /(high|medium)/i.test(s.risk_level || "")) cc2info[cc].risk += 1;
  });
  const ccList = Object.values(cc2info).sort((a, b) => b.total - a.total).slice(0, 6);
  ccList.forEach(c => {
    const t = el("div", "wm-tally");
    const pct = c.total ? Math.round(100 * c.migrated / c.total) : 0;
    t.innerHTML = `
      <div class="wm-tally-label">${c.cc} · <span style="color:var(--ink-400)">${fmtCountryName(c.cc)}</span></div>
      <div class="wm-tally-value num-tab">${c.total}</div>
      <div class="wm-tally-sub">${c.migrated} migrated · ${pct}%</div>
    `;
    t.style.cursor = "pointer";
    t.title = `Zoom to ${fmtCountryName(c.cc)}`;
    t.addEventListener("click", () => zoomToCountry(c.cc));
    tallies.appendChild(t);
  });

}

function fmtCountryName(cc) {
  const dataNames = (DATA.countries || []).find(c => c.cc === cc);
  return dataNames ? dataNames.name : cc;
}

// ============================================================
// Map zoom & pan — wheel + drag
// ============================================================
function attachMapZoomPan(svg) {
  const FULL_W = MAP.viewBox.w;
  const FULL_H = MAP.viewBox.h;

  function applyBox() {
    svg.setAttribute("viewBox", MAP_ZOOM.box.join(" "));
    svg.style.cursor = MAP_ZOOM.scale > 1.01 ? "grab" : "default";
    updateZoomIndicator();
    updateDotSizes(svg);
  }

  function clampBox() {
    const [x, y, w, h] = MAP_ZOOM.box;
    const cx = Math.max(0, Math.min(FULL_W - w, x));
    const cy = Math.max(0, Math.min(FULL_H - h, y));
    MAP_ZOOM.box = [cx, cy, w, h];
  }

  // Convert a client (screen) point to SVG viewBox coordinates
  function clientToSvg(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const [vx, vy, vw, vh] = MAP_ZOOM.box;
    const sx = vx + ((clientX - rect.left) / rect.width)  * vw;
    const sy = vy + ((clientY - rect.top)  / rect.height) * vh;
    return [sx, sy];
  }

  // --- Wheel zoom (centered on cursor) ---
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    hideTooltip();
    const [mx, my] = clientToSvg(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const newScale = Math.max(MAP_ZOOM.minScale,
                     Math.min(MAP_ZOOM.maxScale, MAP_ZOOM.scale * factor));
    if (newScale === MAP_ZOOM.scale) return;
    const effective = newScale / MAP_ZOOM.scale;
    const [vx, vy, vw, vh] = MAP_ZOOM.box;
    const newW = vw / effective;
    const newH = vh / effective;
    const newX = mx - (mx - vx) / effective;
    const newY = my - (my - vy) / effective;
    MAP_ZOOM.scale = newScale;
    MAP_ZOOM.box = [newX, newY, newW, newH];
    clampBox();
    applyBox();
  }, { passive: false });

  // --- Drag to pan ---
  let dragging = false;
  let dragStart = null;
  svg.addEventListener("mousedown", (e) => {
    if (MAP_ZOOM.scale <= 1.01) return;
    if (e.target.classList && (e.target.classList.contains("wm-site") || e.target.classList.contains("wm-pulse"))) return;
    dragging = true;
    dragStart = { cx: e.clientX, cy: e.clientY, box: MAP_ZOOM.box.slice() };
    svg.style.cursor = "grabbing";
    hideTooltip();
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const dx = (dragStart.cx - e.clientX) / rect.width  * dragStart.box[2];
    const dy = (dragStart.cy - e.clientY) / rect.height * dragStart.box[3];
    MAP_ZOOM.box = [dragStart.box[0] + dx, dragStart.box[1] + dy, dragStart.box[2], dragStart.box[3]];
    clampBox();
    applyBox();
  });
  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      svg.style.cursor = MAP_ZOOM.scale > 1.01 ? "grab" : "default";
    }
  });

  // --- Double click to reset ---
  svg.addEventListener("dblclick", () => {
    MAP_ZOOM.scale = 1;
    MAP_ZOOM.box = [0, 0, FULL_W, FULL_H];
    applyBox();
  });

  // Reset button
  const resetBtn = $("#wm-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      MAP_ZOOM.scale = 1;
      MAP_ZOOM.box = [0, 0, FULL_W, FULL_H];
      applyBox();
    });
  }

  // SD-WAN connections toggle
  const toggle = $("#wm-toggle-links");
  if (toggle) {
    toggle.addEventListener("click", () => {
      MAP_FX.showConnections = !MAP_FX.showConnections;
      toggle.classList.toggle("active", MAP_FX.showConnections);
      renderWorldMap(applyFilter(DATA.sites));
    });
  }

  applyBox();
}

function updateZoomIndicator() {
  const el = $("#wm-zoom-level");
  if (el) el.textContent = `${Math.round(MAP_ZOOM.scale * 100)}%`;
  const reset = $("#wm-reset");
  if (reset) reset.style.opacity = MAP_ZOOM.scale > 1.01 ? "1" : "0.3";
}

// Keep site dots at constant visual size regardless of zoom level
function updateDotSizes(svg) {
  const s = MAP_ZOOM.scale || 1;
  svg.querySelectorAll(".wm-site, .wm-pulse, .wm-hub-halo").forEach(c => {
    const base = parseFloat(c.dataset.baseR);
    if (!isNaN(base)) c.setAttribute("r", (base / s).toFixed(2));
  });
}

// Smoothly animate the map viewBox from current state to target
function animateMapViewBox(targetBox, targetScale, duration = 500) {
  const svg = $("#worldmap-svg");
  if (!svg) return;
  const start = MAP_ZOOM.box.slice();
  const startScale = MAP_ZOOM.scale;
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const e = ease(t);
    MAP_ZOOM.box = start.map((v, i) => v + (targetBox[i] - v) * e);
    MAP_ZOOM.scale = startScale + (targetScale - startScale) * e;
    svg.setAttribute("viewBox", MAP_ZOOM.box.join(" "));
    svg.style.cursor = MAP_ZOOM.scale > 1.01 ? "grab" : "default";
    updateZoomIndicator();
    updateDotSizes(svg);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Zoom the map to focus on a single country (by ISO-2 code)
function zoomToCountry(cc) {
  if (!cc) return;
  const sitesInCountry = DATA.sites.filter(s =>
    s.country_code === cc && (s.status_detail || s.status) !== "closed"
  );
  if (!sitesInCountry.length) return;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  sitesInCountry.forEach(s => {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lon < minLon) minLon = s.lon;
    if (s.lon > maxLon) maxLon = s.lon;
  });

  // Padding — relative to extent, with reasonable floor / ceiling
  const latSpan = Math.max(0.1, maxLat - minLat);
  const lonSpan = Math.max(0.1, maxLon - minLon);
  const padLat = Math.min(12, Math.max(3, latSpan * 0.5));
  const padLon = Math.min(18, Math.max(4, lonSpan * 0.5));
  minLat -= padLat; maxLat += padLat;
  minLon -= padLon; maxLon += padLon;

  // Project corners into SVG coords (remember: y grows top→down, lat grows bot→top)
  const [x1, yBot] = mapProject(minLat, minLon);
  const [x2, yTop] = mapProject(maxLat, maxLon);
  const svgBoxW = x2 - x1;
  const svgBoxH = yBot - yTop;
  if (svgBoxW <= 0 || svgBoxH <= 0) return;

  // Pick a scale that fits the bbox entirely in the viewport
  const sx = MAP.viewBox.w / svgBoxW;
  const sy = MAP.viewBox.h / svgBoxH;
  const scale = Math.max(MAP_ZOOM.minScale, Math.min(MAP_ZOOM.maxScale, Math.min(sx, sy)));

  const newW = MAP.viewBox.w / scale;
  const newH = MAP.viewBox.h / scale;
  const cx = (x1 + x2) / 2;
  const cy = (yTop + yBot) / 2;
  let nx = cx - newW / 2;
  let ny = cy - newH / 2;
  nx = Math.max(0, Math.min(MAP.viewBox.w - newW, nx));
  ny = Math.max(0, Math.min(MAP.viewBox.h - newH, ny));

  animateMapViewBox([nx, ny, newW, newH], scale);
}

// ============================================================
// PHASE FUNNEL
// ============================================================
function renderFunnel(sites) {
  const container = $("#phase-funnel");
  container.innerHTML = "";
  const activeSites = sites.filter(s => (s.status_detail || s.status) !== "closed");

  CATEGORIES.forEach(cat => {
    const row = el("div", "pf-row");
    row.dataset.cat = cat.id;

    // Mutually-exclusive classification per site for this phase
    let done=0, partial=0, overdue=0, pending=0, totalSites=0;
    activeSites.forEach(s => {
      totalSites += 1;
      const st = sitePhaseState(s, cat.id);
      if      (st === "done")    done++;
      else if (st === "overdue") overdue++;
      else if (st === "partial") partial++;
      else                        pending++;
    });
    const pctDone = totalSites ? Math.round(100 * done / totalSites) : 0;

    const active = filters.phaseSlice;
    const actCls = st => (active && active.phase === cat.id && active.state === st) ? " active" : "";

    row.innerHTML = `
      <div class="pf-chevron">▸</div>
      <div class="pf-label"><em>${cat.label}</em></div>
      <div class="pf-bar">
        <div class="pf-bar-segment done${actCls("done")}"       data-state="done"    style="width:${(done/totalSites||0)*100}%"></div>
        <div class="pf-bar-segment partial${actCls("partial")}" data-state="partial" style="width:${(partial/totalSites||0)*100}%"></div>
        <div class="pf-bar-segment overdue${actCls("overdue")}" data-state="overdue" style="width:${(overdue/totalSites||0)*100}%"></div>
        <div class="pf-bar-segment pending${actCls("pending")}" data-state="pending" style="width:${(pending/totalSites||0)*100}%"></div>
      </div>
      <div class="pf-pct num-tab">${pctDone}%<span class="pct-total">${done}/${totalSites}</span></div>
    `;
    container.appendChild(row);

    const detail = el("div", "pf-detail");
    detail.dataset.cat = cat.id;
    cat.prereqs.forEach(pk => {
      const meta = (DATA.prereq_meta || {})[pk] || {};
      let sum = 0, count = 0, done100 = 0;
      activeSites.forEach(s => {
        const v = (s.prereqs || {})[pk];
        if (v === null || v === undefined) return;
        sum += v; count += 1; if (v >= 100) done100 += 1;
      });
      const pct = count ? Math.round(sum / count) : 0;
      const ms = el("div", "pf-milestone");
      ms.innerHTML = `
        <div class="pf-ms-dash">·</div>
        <div class="pf-ms-label">
          <div class="pf-ms-name">${escapeHTML(pk)}</div>
          <div class="pf-ms-owner">${escapeHTML(meta.owner || "—")}</div>
        </div>
        <div class="pf-ms-bar"><div class="pf-ms-bar-fill" style="width:${pct}%"></div></div>
        <div class="pf-ms-pct num-tab">${done100}/${count}</div>
      `;
      detail.appendChild(ms);
    });
    container.appendChild(detail);

    // Apply expanded state (independent of filter state)
    if (FUNNEL_EXPANDED.has(cat.id)) row.classList.add("open");

    // Chevron click → expand/collapse only (no filter)
    const chevron = row.querySelector(".pf-chevron");
    chevron.addEventListener("click", e => {
      e.stopPropagation();
      if (FUNNEL_EXPANDED.has(cat.id)) FUNNEL_EXPANDED.delete(cat.id);
      else FUNNEL_EXPANDED.add(cat.id);
      row.classList.toggle("open");
    });

    // Segment click → filter sites by (phase, state). Segments stop propagation.
    const stateLabels = { done: "Done", partial: "In progress", overdue: "Overdue", pending: "Pending" };
    row.querySelectorAll(".pf-bar-segment").forEach(seg => {
      const state = seg.dataset.state;
      seg.addEventListener("click", e => {
        e.stopPropagation();
        const curr = filters.phaseSlice;
        if (curr && curr.phase === cat.id && curr.state === state) {
          filters.phaseSlice = null;
        } else {
          filters.phaseSlice = { phase: cat.id, state };
          filters.phase.clear();
          $$("#f-phase input").forEach(cb => cb.checked = false);
        }
        renderAll();
      });
      seg.addEventListener("mouseenter", evt => {
        const counts = { done, partial, overdue, pending };
        showTooltip(`
          <div class="tt-title"><em>${cat.label}</em> · ${stateLabels[state]}</div>
          <div class="tt-row"><span class="tt-k">Sites</span><span class="tt-v">${counts[state]}</span></div>
          <div class="tt-hint">Click to filter to these sites</div>
        `, evt);
      });
      seg.addEventListener("mousemove", positionTooltip);
      seg.addEventListener("mouseleave", hideTooltip);
    });

    // Row hover (outside segments) → overview tooltip
    row.addEventListener("mouseenter", evt => {
      showTooltip(`
        <div class="tt-title"><em>${cat.label}</em></div>
        <div class="tt-row"><span class="tt-k">Done</span><span class="tt-v">${done}</span></div>
        <div class="tt-row"><span class="tt-k">In progress</span><span class="tt-v">${partial}</span></div>
        <div class="tt-row"><span class="tt-k">Overdue</span><span class="tt-v">${overdue}</span></div>
        <div class="tt-row"><span class="tt-k">Pending</span><span class="tt-v">${pending}</span></div>
        <div class="tt-hint">Arrow to expand · click a segment to filter</div>
      `, evt);
    });
    row.addEventListener("mousemove", positionTooltip);
    row.addEventListener("mouseleave", hideTooltip);
  });
}

// ============================================================
// RISK DONUT
// ============================================================
function renderDonut(sites) {
  const host = $("#risk-donut");
  host.innerHTML = "";

  // Base: sites not migrated AND not closed
  const nonMigrated = sites.filter(s =>
    s.status !== "migrated" &&
    (s.status_detail || s.status) !== "closed"
  );

  const buckets = [
    { key: "high",      label: "High risk",      color: "#D64545", count: 0 },
    { key: "medium",    label: "Medium risk",    color: "#F59E0B", count: 0 },
    { key: "postponed", label: "Postponed",      color: "#A78BFA", count: 0 },
    { key: "none",      label: "No risk flagged", color: C.ink200, count: 0 },
  ];
  // Single-pass mutually-exclusive classification (priority: high > medium > postponed > none)
  nonMigrated.forEach(s => {
    const r = s.risk_level || "";
    const detail = s.status_detail || "";
    if (/high risk/i.test(r))                                buckets[0].count++;
    else if (/medium risk/i.test(r))                          buckets[1].count++;
    else if (detail === "postponed" || /not possible/i.test(r)) buckets[2].count++;
    else                                                       buckets[3].count++;
  });
  const total = buckets.reduce((s, b) => s + b.count, 0);

  // SVG donut
  const size = 300, cx = size/2, cy = size/2, r = 115, rInner = 82;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.setAttribute("class", "donut-svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  let startAngle = -Math.PI/2;
  buckets.forEach((b, i) => {
    if (!b.count) return;
    const frac = b.count / total;
    const endAngle = startAngle + frac * Math.PI * 2;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const [x1, y1] = [cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle)];
    const [x2, y2] = [cx + r * Math.cos(endAngle),   cy + r * Math.sin(endAngle)];
    const [x3, y3] = [cx + rInner * Math.cos(endAngle),   cy + rInner * Math.sin(endAngle)];
    const [x4, y4] = [cx + rInner * Math.cos(startAngle), cy + rInner * Math.sin(startAngle)];
    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      "Z",
    ].join(" ");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", b.color);
    path.setAttribute("stroke", C.ink950);
    path.setAttribute("stroke-width", 1);
    path.style.cursor = "pointer";
    path.style.transition = "opacity .15s";
    path.addEventListener("mouseenter", evt => {
      path.style.opacity = 0.8;
      showTooltip(`
        <div class="tt-title"><em>${b.label}</em></div>
        <div class="tt-row"><span class="tt-k">Sites</span><span class="tt-v">${b.count}</span></div>
        <div class="tt-row"><span class="tt-k">Share</span><span class="tt-v">${(frac*100).toFixed(1)}%</span></div>
        <div class="tt-hint">Click to filter</div>
      `, evt);
    });
    path.addEventListener("mousemove", positionTooltip);
    path.addEventListener("mouseleave", () => { path.style.opacity = 1; hideTooltip(); });
    path.addEventListener("click", () => {
      filters.risk.clear(); filters.risk.add(b.key);
      $$("#f-risk input").forEach(cb => cb.checked = cb.value === b.key);
      renderAll();
    });
    svg.appendChild(path);
    startAngle = endAngle;
  });

  // Center total
  const centerVal = document.createElementNS(svgNS, "text");
  centerVal.setAttribute("x", cx); centerVal.setAttribute("y", cy - 4);
  centerVal.setAttribute("text-anchor", "middle");
  centerVal.setAttribute("class", "donut-center-total");
  centerVal.textContent = fmtNum(total);
  svg.appendChild(centerVal);
  const centerLab = document.createElementNS(svgNS, "text");
  centerLab.setAttribute("x", cx); centerLab.setAttribute("y", cy + 24);
  centerLab.setAttribute("text-anchor", "middle");
  centerLab.setAttribute("class", "donut-center-label");
  centerLab.textContent = "remaining";
  svg.appendChild(centerLab);

  host.appendChild(svg);

  const legend = el("div", "donut-legend");
  buckets.forEach(b => {
    const it = el("div", "donut-legend-item");
    const pct = total ? Math.round(100 * b.count / total) : 0;
    it.innerHTML = `
      <span class="donut-legend-dot" style="background:${b.color}"></span>
      <span class="donut-legend-label">${b.label}</span>
      <span class="donut-legend-count num-tab">${b.count}<span class="pct">${pct}%</span></span>
    `;
    it.addEventListener("click", () => {
      filters.risk.clear(); filters.risk.add(b.key);
      $$("#f-risk input").forEach(cb => cb.checked = cb.value === b.key);
      renderAll();
    });
    legend.appendChild(it);
  });
  host.appendChild(legend);
}

// ============================================================
// CADENCE BURNUP
// ============================================================
function renderBurnup(sites) {
  const host = $("#cadence-burnup");
  host.innerHTML = "";

  const unit = filters.displayUnit;

  // Bucket migrations by week/month
  function bucketKey(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (unit === "W") {
      return `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2,"0")}`;
    }
    return iso.slice(0, 7);
  }
  function fmtBucket(k) {
    if (!k) return "";
    if (k === "UNDATED") return "Undated";
    if (k.includes("-W")) return `W${k.slice(6)}`;
    const [y, m] = k.split("-");
    return new Date(y, parseInt(m)-1, 1).toLocaleDateString("en-GB", { month: "short" }) + " '" + y.slice(2);
  }

  // Gather migrated + risk-categorized plans by bucket
  // Categories stacked (bottom→top): migrated → noRisk → postponed → medRisk → highRisk
  function siteCat(s) {
    if (s.status === "migrated") return "migrated";
    const r = s.risk_level || "";
    const detail = s.status_detail || "";
    if (/high risk/i.test(r)) return "highRisk";
    if (/medium risk/i.test(r)) return "medRisk";
    if (detail === "postponed" || /not possible/i.test(r)) return "postponed";
    return "noRisk";
  }
  const EMPTY = () => ({ migrated: 0, noRisk: 0, postponed: 0, medRisk: 0, highRisk: 0 });

  // ---- Identify "to plan" sites (undated + W44 placeholder cluster) ----
  // PMO convention: sites awaiting validation are parked at end-of-October
  // (ISO W44) of the planning year. We detect such buckets dynamically: a
  // W44 bucket dominated by "To validate" sites is treated as placeholder
  // and excluded from the timeline.
  const bucketSitesPre = {};
  const undatedSites = [];
  sites.forEach(s => {
    if ((s.status_detail || s.status) === "closed") return;
    const md = s.migration_date;
    if (!md) { undatedSites.push(s); return; }
    const k = bucketKey(md);
    (bucketSitesPre[k] = bucketSitesPre[k] || []).push(s);
  });
  function isToValidate(s) {
    return /^to validate/i.test(s.status_raw || "");
  }
  const placeholderKeys = new Set();
  Object.entries(bucketSitesPre).forEach(([k, list]) => {
    const isW44 = unit === "W" ? k.endsWith("-W44") : false;
    if (!isW44 || list.length < 5) return;
    const tv = list.filter(isToValidate).length;
    if (tv / list.length >= 0.8) placeholderKeys.add(k);
  });
  // In month mode, treat any month whose sites are >=60% To validate AND
  // count >= 10 as a placeholder too (M='2026-10' aggregates the W44 spike).
  if (unit === "M") {
    Object.entries(bucketSitesPre).forEach(([k, list]) => {
      if (list.length < 10) return;
      const tv = list.filter(isToValidate).length;
      if (tv / list.length >= 0.6) placeholderKeys.add(k);
    });
  }
  const toPlanSites = [
    ...undatedSites,
    ...[...placeholderKeys].flatMap(k => bucketSitesPre[k]),
  ];

  // Build the regular byBucket excluding placeholder buckets
  const byBucket = {};
  let minBucket = null, maxBucket = null;
  Object.entries(bucketSitesPre).forEach(([k, list]) => {
    if (placeholderKeys.has(k)) return;
    const agg = EMPTY();
    list.forEach(s => { agg[siteCat(s)] += 1; });
    byBucket[k] = agg;
    if (minBucket === null || k < minBucket) minBucket = k;
    if (maxBucket === null || k > maxBucket) maxBucket = k;
  });
  // Undated counters (preserved for cumulative line — sites still count
  // toward the total scope even if their date is unknown).
  const undated = EMPTY();
  undatedSites.forEach(s => { undated[siteCat(s)] += 1; });
  const undatedTotal = undated.migrated + undated.noRisk + undated.postponed + undated.medRisk + undated.highRisk;

  // Baseline aggregation — initial planned migration dates (Mise en forme
  // sheet, columns M+N). Only sites included in the regular byBucket are
  // counted (i.e. non-closed, non-undated, non-W44-placeholder).
  const baselineByBucket = {};
  let baselineMin = null, baselineMax = null;
  sites.forEach(s => {
    if ((s.status_detail || s.status) === "closed") return;
    const bd = s.migration_date_baseline;
    if (!bd) return;
    const k = bucketKey(bd);
    if (!k) return;
    baselineByBucket[k] = (baselineByBucket[k] || 0) + 1;
    if (baselineMin === null || k < baselineMin) baselineMin = k;
    if (baselineMax === null || k > baselineMax) baselineMax = k;
  });
  // Derived simple counts for line computations
  const migratedByBucket = {}, plannedByBucket = {};
  Object.entries(byBucket).forEach(([k, v]) => {
    migratedByBucket[k] = v.migrated;
    plannedByBucket[k] = v.noRisk + v.postponed + v.medRisk + v.highRisk;
  });
  // Fill buckets between min..max
  function bucketRange(from, to) {
    if (!from || !to) return [];
    const out = [];
    if (unit === "W") {
      const [fy, fw] = from.split("-W");
      const [ty, tw] = to.split("-W");
      let y = parseInt(fy), w = parseInt(fw);
      while (y < parseInt(ty) || (y === parseInt(ty) && w <= parseInt(tw))) {
        out.push(`${y}-W${String(w).padStart(2,"0")}`);
        w += 1; if (w > 52) { y += 1; w = 1; }
        if (out.length > 260) break;
      }
    } else {
      const [fy, fm] = from.split("-");
      const [ty, tm] = to.split("-");
      let y = parseInt(fy), m = parseInt(fm);
      while (y < parseInt(ty) || (y === parseInt(ty) && m <= parseInt(tm))) {
        out.push(`${y}-${String(m).padStart(2,"0")}`);
        m += 1; if (m > 12) { y += 1; m = 1; }
        if (out.length > 80) break;
      }
    }
    return out;
  }
  // If the baseline is shown, extend the bucket range to include any
  // baseline dates that fall outside the actual-cadence range.
  let rangeMin = minBucket, rangeMax = maxBucket;
  if (filters.showBaseline) {
    if (baselineMin !== null && (rangeMin === null || baselineMin < rangeMin)) rangeMin = baselineMin;
    if (baselineMax !== null && (rangeMax === null || baselineMax > rangeMax)) rangeMax = baselineMax;
  }
  const buckets = bucketRange(rangeMin, rangeMax);
  // Cumulative baseline aligned with buckets
  let cumB = 0;
  const cumBaseline = buckets.map(k => cumB += (baselineByBucket[k] || 0));
  const totalBaseline = cumBaseline.length ? cumBaseline[cumBaseline.length - 1] : 0;
  // Undated + placeholder sites are handled by the "À planifier" side panel,
  // not as buckets — so the timeline shows real cadence only.
  if (!buckets.length && !toPlanSites.length) {
    host.innerHTML = `<div style="padding:40px;color:var(--ink-300);text-align:center;font-family:var(--font-serif);font-style:italic;">No dated migrations in filter.</div>`;
    return;
  }

  // Stack categories (hoisted so the side panel can reuse colors/labels)
  const STACK = [
    { key: "migrated",  color: C.leaf,   label: "Migrated"    },
    { key: "noRisk",    color: C.ink200, label: "No risk"     },
    { key: "postponed", color: "#A78BFA",label: "Postponed"   },
    { key: "medRisk",   color: "#F59E0B",label: "Medium risk" },
    { key: "highRisk",  color: "#D64545",label: "High risk"   },
  ];

  // Build the "À planifier" side panel
  function buildToPlanPanel() {
    const panel = document.createElement("aside");
    panel.className = "cadence-toplan";
    const total = toPlanSites.length;
    const cat = EMPTY();
    toPlanSites.forEach(s => { cat[siteCat(s)] += 1; });
    const barSegs = STACK.map(seg => {
      const v = cat[seg.key]; if (!v) return "";
      const pct = (v / total) * 100;
      return `<span class="ctp-seg" style="background:${seg.color};width:${pct}%" title="${seg.label}: ${v}"></span>`;
    }).join("");
    const rows = STACK.filter(seg => cat[seg.key] > 0).map(seg => `
      <div class="ctp-row">
        <span class="ctp-row-k"><span class="ctp-dot" style="background:${seg.color}"></span>${seg.label}</span>
        <span class="ctp-row-v">${cat[seg.key]}</span>
      </div>
    `).join("");
    panel.innerHTML = `
      <div class="ctp-kicker">À planifier</div>
      <div class="ctp-count">${total}</div>
      <div class="ctp-sub">site${total > 1 ? "s" : ""} sans date ferme</div>
      <div class="ctp-bar">${barSegs}</div>
      <div class="ctp-rows">${rows}</div>
    `;
    return panel;
  }

  // ---- Layout wrapper: chart on the left, "to plan" panel on the right ----
  const flex = document.createElement("div");
  flex.className = "cadence-flex";
  const chartCol = document.createElement("div");
  chartCol.className = "cadence-chart-col";
  flex.appendChild(chartCol);
  if (toPlanSites.length > 0) {
    flex.appendChild(buildToPlanPanel());
  }
  host.appendChild(flex);

  // Cumulative
  let cum = 0;
  const cumMigrated = buckets.map(k => cum += (migratedByBucket[k] || 0));
  cum = 0;
  const cumPlanned = buckets.map(k => cum += (migratedByBucket[k] || 0) + (plannedByBucket[k] || 0));

  // Velocity projection — computed per bucket, starting from today
  const narr_tmp = DATA.narrative || {};
  const velocityPerWeek = narr_tmp.velocity_per_week || 0;
  const perBucketVel = unit === "W" ? velocityPerWeek : velocityPerWeek * (52 / 12);
  const todayKeyForProj = (() => {
    const t = TODAY.toISOString().slice(0, 10);
    if (unit === "W") {
      const d = new Date(t);
      return `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, "0")}`;
    }
    return t.slice(0, 7);
  })();
  const todayIdxForProj = buckets.indexOf(todayKeyForProj);
  // Total scope = authoritative count from narrative (includes to-plan +
  // undated). The right-hand cumulative axis must always go up to this
  // value so the gap to cumulative-plan visualises remaining work.
  const totalScope = (narr_tmp.total != null) ? narr_tmp.total : cumPlanned[cumPlanned.length - 1] || 0;
  const projected = buckets.map((k, i) => {
    if (todayIdxForProj < 0 || velocityPerWeek <= 0) return null;
    if (i < todayIdxForProj) return cumMigrated[i];  // actuals for past
    const base = cumMigrated[todayIdxForProj];
    const v = base + perBucketVel * (i - todayIdxForProj);
    return Math.min(v, totalScope);
  });

  // Chart dimensions — stretch to container width, scroll only if too dense
  const margin = { top: 24, right: 60, bottom: 36, left: 44 };
  const gap = 4;
  const desiredBarW = unit === "W" ? 14 : 46;
  const containerW = chartCol.clientWidth || host.clientWidth || 1000;
  const desiredTotalW = margin.left + margin.right + buckets.length * (desiredBarW + gap);
  let barW, w;
  const avail = containerW - margin.left - margin.right - buckets.length * gap;
  if (desiredTotalW < containerW) {
    barW = Math.min(80, Math.max(desiredBarW, Math.floor(avail / buckets.length)));
  } else {
    // Squeeze bars so the whole chart fits the chartCol width (no overflow).
    barW = Math.max(2, Math.floor(avail / buckets.length));
  }
  w = margin.left + margin.right + buckets.length * (barW + gap);
  const h = 340;
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  const maxBar = Math.max(
    ...buckets.map(k => {
      const b = byBucket[k] || EMPTY();
      const actual = b.migrated + b.noRisk + b.postponed + b.medRisk + b.highRisk;
      const base = filters.showBaseline ? (baselineByBucket[k] || 0) : 0;
      return Math.max(actual, base);
    }),
    1
  );
  const maxCum = Math.max(...cumPlanned, totalScope, filters.showBaseline ? totalBaseline : 0, 1);

  const x = i => margin.left + i * (barW + 4);
  const yBar = v => margin.top + plotH - (v / maxBar) * plotH;
  const yCum = v => margin.top + plotH - (v / maxCum) * plotH;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "cadence-svg");
  svg.setAttribute("width", w); svg.setAttribute("height", h);

  // Grid horizontal lines
  const nGridY = 4;
  for (let i = 0; i <= nGridY; i++) {
    const y0 = margin.top + (plotH * i / nGridY);
    const ln = document.createElementNS(svgNS, "line");
    ln.setAttribute("x1", margin.left); ln.setAttribute("x2", w - margin.right);
    ln.setAttribute("y1", y0); ln.setAttribute("y2", y0);
    ln.setAttribute("class", "cad-grid-line");
    svg.appendChild(ln);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", margin.left - 8); label.setAttribute("y", y0 + 3);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "cad-axis-tick");
    label.textContent = fmtNum(Math.round(maxBar - (maxBar / nGridY) * i));
    svg.appendChild(label);
  }

  // Y-right axis (cumulative)
  for (let i = 0; i <= nGridY; i++) {
    const y0 = margin.top + (plotH * i / nGridY);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", w - margin.right + 8); label.setAttribute("y", y0 + 3);
    label.setAttribute("class", "cad-axis-tick");
    label.setAttribute("fill", C.goldSoft);
    label.textContent = fmtNum(Math.round(maxCum - (maxCum / nGridY) * i));
    svg.appendChild(label);
  }

  // When baseline is shown, split each bucket column into two side-by-side
  // bars: a baseline bar (gold, what *was* planned) and the actual stack
  // (what is currently planned / done). This makes "if I had respected the
  // baseline" directly comparable to "what I have now" week by week.
  const splitBaseline = filters.showBaseline && totalBaseline > 0;
  const baselineBarW = splitBaseline ? Math.max(2, Math.floor(barW * 0.42)) : 0;
  const actualBarW   = splitBaseline ? Math.max(2, barW - baselineBarW - 1) : barW;
  const baselineX = i => x(i);
  const actualX   = i => splitBaseline ? x(i) + baselineBarW + 1 : x(i);

  if (splitBaseline) {
    buckets.forEach((k, i) => {
      const v = baselineByBucket[k] || 0;
      if (!v) return;
      const y0 = yBar(v);
      const y1 = yBar(0);
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", baselineX(i));
      r.setAttribute("y", y0);
      r.setAttribute("width", baselineBarW);
      r.setAttribute("height", y1 - y0);
      r.setAttribute("class", "cad-bar-baseline");
      svg.appendChild(r);
    });
  }

  // Hover hit zones — one transparent column per bucket, drawn BEFORE the
  // bars so bars stay on top for segment-specific tooltips. The hit zone
  // catches hovers above the bar (on the cumulative lines, projection,
  // empty space) and shows a bucket-level tooltip.
  buckets.forEach((k, i) => {
    const b = byBucket[k] || EMPTY();
    const hz = document.createElementNS(svgNS, "rect");
    hz.setAttribute("x", x(i) - gap / 2);
    hz.setAttribute("y", margin.top);
    hz.setAttribute("width", barW + gap);
    hz.setAttribute("height", plotH);
    hz.setAttribute("fill", "transparent");
    hz.setAttribute("pointer-events", "all");
    hz.addEventListener("mouseenter", evt => {
      const rows = STACK.filter(s => (b[s.key] || 0) > 0)
        .map(s => `<div class="tt-row"><span class="tt-k" style="color:${s.color}">${s.label}</span><span class="tt-v">${b[s.key]}</span></div>`)
        .join("");
      const projRow = projected[i] != null
        ? `<div class="tt-row"><span class="tt-k" style="color:${C.tealSoft}">Projected</span><span class="tt-v">${Math.round(projected[i])}</span></div>
           <div class="tt-row"><span class="tt-k" style="color:${C.tealSoft}">Velocity <em style="opacity:.6;font-style:normal">(8w avg)</em></span><span class="tt-v">${velocityPerWeek}/wk</span></div>`
        : "";
      const baseRow = filters.showBaseline && (baselineByBucket[k] || cumBaseline[i])
        ? `<div class="tt-row"><span class="tt-k" style="color:${C.goldSoft}">Baseline</span><span class="tt-v">${baselineByBucket[k] || 0}</span></div>
           <div class="tt-row"><span class="tt-k" style="color:${C.goldSoft}">Cumul. baseline</span><span class="tt-v">${cumBaseline[i]}</span></div>`
        : "";
      const bodyRows = rows || `<div class="tt-row" style="color:var(--ink-300);font-style:italic">No migrations this bucket</div>`;
      showTooltip(`
        <div class="tt-title"><em>${fmtBucket(k)}</em></div>
        ${bodyRows}
        <div class="tt-row" style="border-top:1px dashed var(--hairline);margin-top:6px;padding-top:4px"><span class="tt-k">Cumul. migrated</span><span class="tt-v">${cumMigrated[i]}</span></div>
        <div class="tt-row"><span class="tt-k">Cumul. plan</span><span class="tt-v">${cumPlanned[i]}</span></div>
        ${baseRow}
        ${projRow}
      `, evt);
    });
    hz.addEventListener("mousemove", positionTooltip);
    hz.addEventListener("mouseleave", hideTooltip);
    svg.appendChild(hz);
  });

  // Bars — stacked by category (STACK defined above for side-panel reuse)
  buckets.forEach((k, i) => {
    const b = byBucket[k] || EMPTY();
    const x0 = actualX(i);
    let cum = 0;
    STACK.forEach(seg => {
      const v = b[seg.key] || 0;
      if (!v) return;
      const y0 = yBar(cum + v);
      const y1 = yBar(cum);
      const bar = document.createElementNS(svgNS, "rect");
      bar.setAttribute("x", x0);
      bar.setAttribute("y", y0);
      bar.setAttribute("width", actualBarW);
      bar.setAttribute("height", y1 - y0);
      bar.setAttribute("fill", seg.color);
      bar.setAttribute("class", "cad-bar");
      bar.addEventListener("mouseenter", evt => {
        const rows = STACK.filter(s => (b[s.key] || 0) > 0)
          .map(s => `<div class="tt-row"><span class="tt-k" style="color:${s.color}">${s.label}</span><span class="tt-v">${b[s.key]}</span></div>`)
          .join("");
        const projRow = projected[i] != null
          ? `<div class="tt-row"><span class="tt-k" style="color:${C.tealSoft}">Projected</span><span class="tt-v">${Math.round(projected[i])}</span></div>
             <div class="tt-row"><span class="tt-k" style="color:${C.tealSoft}">Velocity <em style="opacity:.6;font-style:normal">(8w avg)</em></span><span class="tt-v">${velocityPerWeek}/wk</span></div>`
          : "";
        const baseRow = filters.showBaseline && (baselineByBucket[k] || cumBaseline[i])
          ? `<div class="tt-row"><span class="tt-k" style="color:${C.goldSoft}">Baseline</span><span class="tt-v">${baselineByBucket[k] || 0}</span></div>
             <div class="tt-row"><span class="tt-k" style="color:${C.goldSoft}">Cumul. baseline</span><span class="tt-v">${cumBaseline[i]}</span></div>`
          : "";
        showTooltip(`
          <div class="tt-title"><em>${fmtBucket(k)}</em></div>
          ${rows}
          <div class="tt-row" style="border-top:1px dashed var(--hairline);margin-top:6px;padding-top:4px"><span class="tt-k">Cumul. migrated</span><span class="tt-v">${cumMigrated[i]}</span></div>
          <div class="tt-row"><span class="tt-k">Cumul. plan</span><span class="tt-v">${cumPlanned[i]}</span></div>
          ${baseRow}
          ${projRow}
          <div class="tt-hint">Click to filter · ${seg.label}</div>
        `, evt);
      });
      bar.addEventListener("mousemove", positionTooltip);
      bar.addEventListener("mouseleave", hideTooltip);
      bar.style.cursor = "pointer";
      bar.addEventListener("click", () => applyBurnupFilter(k, seg.key));
      svg.appendChild(bar);
      cum += v;
    });

    // X-tick label (every Nth) — center on the whole bucket column,
    // not on the actual sub-bar (which is offset when baseline is shown).
    const every = unit === "W" ? Math.max(1, Math.round(buckets.length/12)) : 1;
    if (i % every === 0 || i === buckets.length - 1) {
      const tick = document.createElementNS(svgNS, "text");
      tick.setAttribute("x", x(i) + barW/2);
      tick.setAttribute("y", h - margin.bottom + 18);
      tick.setAttribute("text-anchor", "middle");
      tick.setAttribute("class", "cad-axis-tick");
      tick.textContent = fmtBucket(k);
      svg.appendChild(tick);
    }
  });

  // Cumulative lines
  function polyline(values, cls, color) {
    const pts = values.map((v, i) => `${x(i) + barW/2},${yCum(v)}`).join(" ");
    const p = document.createElementNS(svgNS, "polyline");
    p.setAttribute("points", pts);
    p.setAttribute("class", "cad-line " + cls);
    if (color) p.setAttribute("stroke", color);
    svg.appendChild(p);
  }
  polyline(cumMigrated, "", C.leaf);
  polyline(cumPlanned,  "baseline", C.paper);
  if (filters.showBaseline && totalBaseline > 0) {
    polyline(cumBaseline, "baseline-initial");
  }

  // Projection polyline from the "today" bucket onward
  if (todayIdxForProj >= 0 && velocityPerWeek > 0) {
    const pts = [];
    for (let i = todayIdxForProj; i < buckets.length; i++) {
      const v = projected[i];
      if (v == null) continue;
      pts.push(`${x(i) + barW / 2},${yCum(v)}`);
      if (v >= totalScope) break; // stop at landing
    }
    if (pts.length >= 2) {
      const proj = document.createElementNS(svgNS, "polyline");
      proj.setAttribute("points", pts.join(" "));
      proj.setAttribute("class", "cad-line projection");
      svg.appendChild(proj);
    }
  }

  // Today vertical line
  const todayKey = bucketKey(TODAY.toISOString().slice(0, 10));
  const todayIdx = buckets.indexOf(todayKey);
  if (todayIdx >= 0) {
    const x0 = x(todayIdx) + barW / 2;
    const ln = document.createElementNS(svgNS, "line");
    ln.setAttribute("x1", x0); ln.setAttribute("x2", x0);
    ln.setAttribute("y1", margin.top); ln.setAttribute("y2", margin.top + plotH);
    ln.setAttribute("class", "cad-today");
    svg.appendChild(ln);
    const lab = document.createElementNS(svgNS, "text");
    lab.setAttribute("x", x0); lab.setAttribute("y", margin.top - 6);
    lab.setAttribute("text-anchor", "middle");
    lab.setAttribute("class", "cad-today-label");
    lab.textContent = "TODAY";
    svg.appendChild(lab);
  }

  chartCol.appendChild(svg);

  // Legend
  const lg = el("div", "chart-legend");
  lg.innerHTML = `
    <span><span class="swatch" style="background:${C.leaf}"></span>Migrated</span>
    <span><span class="swatch" style="background:${C.ink200}"></span>No risk</span>
    <span><span class="swatch" style="background:#A78BFA"></span>Postponed</span>
    <span><span class="swatch" style="background:#F59E0B"></span>Medium risk</span>
    <span><span class="swatch" style="background:#D64545"></span>High risk</span>
    <span><span class="swatch" style="background:${C.leaf};height:3px"></span>Cumulative migrated</span>
    <span><span class="swatch" style="background:${C.paper};height:3px;opacity:.6"></span>Cumulative plan</span>
    <span><span class="swatch" style="background:${C.tealSoft};height:3px;opacity:.8"></span>Velocity projection</span>
    ${filters.showBaseline && totalBaseline > 0 ? `<span><span class="swatch" style="background:${C.goldSoft};height:3px;opacity:.75"></span>Initial baseline</span>` : ""}
  `;
  host.appendChild(lg);
}

// Filter handler for burnup bar clicks — by time bucket + risk segment
function applyBurnupFilter(bucketKey, segKey) {
  // Compute date range for the bucket (M = "YYYY-MM", W = "YYYY-Wxx")
  let dateFrom = "", dateTo = "";
  if (bucketKey.includes("-W")) {
    const [ys, ws] = bucketKey.split("-W");
    const year = parseInt(ys, 10);
    const w = parseInt(ws, 10);
    // ISO-8601 Monday of week w
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Dow = jan4.getUTCDay() || 7;
    const mon = new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate() - jan4Dow + 1 + (w - 1) * 7);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    dateFrom = mon.toISOString().slice(0, 10);
    dateTo = sun.toISOString().slice(0, 10);
  } else {
    const [ys, ms] = bucketKey.split("-");
    const y = parseInt(ys, 10);
    const m = parseInt(ms, 10);
    dateFrom = `${ys}-${ms}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    dateTo = `${ys}-${ms}-${String(lastDay).padStart(2, "0")}`;
  }

  // Toggle behaviour: if the same filter is already active, clear it
  const already = filters.dateFrom === dateFrom && filters.dateTo === dateTo
    && ((segKey === "migrated" && filters.kpi === "migrated")
      || (segKey === "noRisk"  && filters.risk.has("none") && filters.risk.size === 1)
      || (segKey === "postponed" && filters.risk.has("postponed") && filters.risk.size === 1)
      || (segKey === "medRisk" && filters.risk.has("medium") && filters.risk.size === 1)
      || (segKey === "highRisk" && filters.risk.has("high") && filters.risk.size === 1));

  if (already) {
    filters.dateFrom = ""; filters.dateTo = "";
    filters.risk.clear();
    filters.kpi = null;
    const df = $("#f-date-from"); if (df) df.value = "";
    const dt = $("#f-date-to");   if (dt) dt.value = "";
    $$("#f-risk input").forEach(cb => cb.checked = false);
    $$("#f-window .pill-btn").forEach(b => b.classList.toggle("active", b.dataset.value === "all"));
    filters.window = "all";
  } else {
    filters.dateFrom = dateFrom;
    filters.dateTo = dateTo;
    filters.window = "";
    filters.risk.clear();
    filters.kpi = null;
    if (segKey === "migrated")      filters.kpi = "migrated";
    else if (segKey === "noRisk")    filters.risk.add("none");
    else if (segKey === "postponed") filters.risk.add("postponed");
    else if (segKey === "medRisk")   filters.risk.add("medium");
    else if (segKey === "highRisk")  filters.risk.add("high");
    // Sync sidebar UI
    const df = $("#f-date-from"); if (df) df.value = dateFrom;
    const dt = $("#f-date-to");   if (dt) dt.value = dateTo;
    $$("#f-risk input").forEach(cb => cb.checked = filters.risk.has(cb.value));
  }
  renderAll();
}

// ============================================================
// COMPANY STACKED
// ============================================================
function renderCompanyStacked(sites) {
  const host = $("#company-stacked");
  host.innerHTML = "";

  const byCo = {};
  sites.forEach(s => {
    const c = s.company || "—";
    byCo[c] = byCo[c] || { migrated: 0, noRisk: 0, postponed: 0, medRisk: 0, highRisk: 0, otdOk: 0, otdTotal: 0, total: 0 };
    byCo[c].total += 1;
    const r = s.risk_level || "";
    const detail = s.status_detail || "";
    if (s.status === "migrated") byCo[c].migrated += 1;
    else if (/high risk/i.test(r)) byCo[c].highRisk += 1;
    else if (/medium risk/i.test(r)) byCo[c].medRisk += 1;
    else if (detail === "postponed" || /not possible/i.test(r)) byCo[c].postponed += 1;
    else byCo[c].noRisk += 1;
    // OTD computation
    if (s.status === "migrated" && s.baseline_week && s.baseline_year && s.migration_date) {
      const md = new Date(s.migration_date);
      const w = isoWeek(md);
      const deltaW = (md.getFullYear() - s.baseline_year) * 52 + (w - s.baseline_week);
      byCo[c].otdTotal += 1;
      if (deltaW <= 1) byCo[c].otdOk += 1;
    }
  });

  const entries = Object.entries(byCo).sort((a, b) => b[1].total - a[1].total);
  const maxTotal = Math.max(...entries.map(([, d]) => d.total), 1);
  entries.forEach(([co, d]) => {
    const row = el("div", "co-row");
    const otdPct = d.otdTotal ? Math.round(100 * d.otdOk / d.otdTotal) : null;
    // Bar width relative to the largest company so the chart respects real proportions
    const widthPct = (100 * d.total / maxTotal).toFixed(1);
    row.innerHTML = `
      <div class="co-label">${escapeHTML(co)}
        <span class="co-fullname">${d.total} sites</span>
      </div>
      <div class="co-bar-wrap">
        <div class="co-bar" style="width:${widthPct}%">
          <div class="co-bar-seg migrated"  style="width:${100*d.migrated/d.total}%"></div>
          <div class="co-bar-seg noRisk"    style="width:${100*d.noRisk/d.total}%"></div>
          <div class="co-bar-seg postponed" style="width:${100*d.postponed/d.total}%"></div>
          <div class="co-bar-seg medRisk"   style="width:${100*d.medRisk/d.total}%"></div>
          <div class="co-bar-seg highRisk"  style="width:${100*d.highRisk/d.total}%"></div>
        </div>
      </div>
      <div class="co-otd">${otdPct !== null ? otdPct + "% OTD" : "—"}
        <small>${d.otdTotal} measured</small>
      </div>
      <div class="co-count num-tab">${d.migrated}/${d.total}</div>
    `;
    row.addEventListener("click", () => {
      filters.company.clear(); filters.company.add(co);
      $$("#f-company input").forEach(cb => cb.checked = cb.value === co);
      renderAll();
    });
    row.addEventListener("mouseenter", evt => showTooltip(`
      <div class="tt-title"><em>${escapeHTML(co)}</em></div>
      <div class="tt-row"><span class="tt-k">Migrated</span><span class="tt-v">${d.migrated}</span></div>
      <div class="tt-row"><span class="tt-k">No risk</span><span class="tt-v">${d.noRisk}</span></div>
      <div class="tt-row"><span class="tt-k">Postponed</span><span class="tt-v">${d.postponed}</span></div>
      <div class="tt-row"><span class="tt-k">Medium risk</span><span class="tt-v">${d.medRisk}</span></div>
      <div class="tt-row"><span class="tt-k">High risk</span><span class="tt-v">${d.highRisk}</span></div>
      ${otdPct !== null ? `<div class="tt-row"><span class="tt-k">OTD</span><span class="tt-v">${otdPct}%</span></div>` : ""}
      <div class="tt-hint">Click to filter</div>
    `, evt));
    row.addEventListener("mousemove", positionTooltip);
    row.addEventListener("mouseleave", hideTooltip);
    host.appendChild(row);
  });
}

// ============================================================
// SITES LIST (appendix)
// ============================================================
let siteSortKey = "migration_date";
let siteSortDir = 1;
function renderSitesList(sites) {
  const host = $("#sites-list");
  host.innerHTML = "";

  const q = ($("#sites-list-search")?.value || "").trim().toLowerCase();
  const filtered = sites.filter(s => {
    if (!q) return true;
    const hay = [s.site_id, s.company, s.geo_label, s.address, s.it_contact].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  // Synthesize a `migrated_on` field used by the Migrated column / sort.
  // Defined as migration_date only when the site has actually migrated.
  filtered.forEach(s => { s.migrated_on = (s.status === "migrated") ? s.migration_date : null; });
  // Δ baseline days: positive = late vs initial plan, negative = early.
  // Uses migrated_on for migrated sites, current migration_date otherwise.
  filtered.forEach(s => {
    s.delta_baseline_days = null;
    if (!s.migration_date_baseline) return;
    const ref = s.migrated_on || s.migration_date;
    if (!ref) return;
    const b = new Date(s.migration_date_baseline);
    const a = new Date(ref);
    if (isNaN(b) || isNaN(a)) return;
    s.delta_baseline_days = Math.round((a - b) / 86400000);
  });
  filtered.sort((a, b) => {
    const va = a[siteSortKey]; const vb = b[siteSortKey];
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    return va > vb ? siteSortDir : -siteSortDir;
  });

  const c1 = $("#sites-list-count");   if (c1) c1.textContent = `${filtered.length} sites`;
  const c2 = $("#sites-list-count-2"); if (c2) c2.textContent = `${filtered.length} shown`;

  const table = el("table", "sites-table");
  const cols = [
    { k: "site_id",        label: "Site ID" },
    { k: "geo_label",      label: "City" },
    { k: "company",        label: "Co" },
    { k: "country_code",   label: "Cy" },
    { k: "status",         label: "Status" },
    { k: "risk_level",     label: "Risk" },
    { k: "migrated_on",    label: "Migrated" },     // actual go-live date (only for migrated sites)
    { k: "migration_date", label: "Cutover" },      // planned/scheduled cutover date for all sites
    { k: "migration_date_baseline", label: "Baseline" },  // initial planned date (Mise en forme)
    { k: "delta_baseline_days", label: "Δ", numeric: true },  // (actual or planned) − baseline, days
    { k: "added_date",     label: "Added" },
    { k: "t_minus_days",   label: "T−", numeric: true },
    { k: "migration_referent", label: "Referent" },
  ];
  const thead = el("thead");
  const tr = el("tr");
  cols.forEach(c => {
    const th = el("th", c.numeric ? "tcol-num" : null, c.label);
    th.addEventListener("click", () => {
      if (siteSortKey === c.k) siteSortDir = -siteSortDir;
      else { siteSortKey = c.k; siteSortDir = 1; }
      renderSitesList(sites);
    });
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = el("tbody");
  filtered.slice(0, 300).forEach(s => {
    const row = el("tr");
    row.innerHTML = `
      <td><span class="mono" style="font-size:11px;color:var(--paper-light)">${escapeHTML(s.site_id || "—")}</span></td>
      <td><span class="sl-loc" style="font-size:13px;color:var(--paper-light)">${escapeHTML(s.geo_label || "—")}</span></td>
      <td><span class="mono" style="font-size:11px;color:var(--ink-200)">${escapeHTML(s.company || "—")}</span></td>
      <td><span class="mono" style="font-size:11px;color:var(--gold-700)">${escapeHTML(s.country_code || "—")}</span></td>
      <td>${statusBadge(s)}</td>
      <td>${riskBadge(s)}</td>
      <td class="tcol-num">${s.migrated_on ? fmtDateCutover(s.migrated_on) : '<span style="color:var(--ink-400)">—</span>'}</td>
      <td class="tcol-num">${fmtDateCutover(s.migration_date)}</td>
      <td class="tcol-num">${s.migration_date_baseline ? fmtDateCutover(s.migration_date_baseline) : '<span style="color:var(--ink-400)">—</span>'}</td>
      <td class="tcol-num">${fmtDeltaDays(s.delta_baseline_days)}</td>
      <td>${fmtAddedDate(s)}</td>
      <td class="tcol-num">${s.t_minus_days == null ? "—" : (s.t_minus_days < 0 ? "+" + (-s.t_minus_days) + "d" : "T-" + s.t_minus_days)}</td>
      <td><span style="color:var(--text-mid)">${escapeHTML(s.migration_referent || "—")}</span></td>
    `;
    row.addEventListener("click", () => { selectPMSite(s.site_id); activateTab("pm"); });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  host.appendChild(table);
  if (filtered.length > 300) {
    const more = el("div");
    more.style.cssText = "padding:12px;font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-300);text-align:center;";
    more.textContent = `+ ${filtered.length - 300} more — refine filters above`;
    host.appendChild(more);
  }
}

function statusBadge(s) {
  const st = s.status || "unknown";
  const detail = s.status_detail || st;
  if (st === "migrated") return `<span class="badge leaf">migrated</span>`;
  if (st === "closed")   return `<span class="badge">closed</span>`;
  if (detail === "blocked") return `<span class="badge alert">blocked</span>`;
  if (detail === "postponed") return `<span class="badge gold">postponed</span>`;
  if (st === "ready")    return `<span class="badge teal">ready</span>`;
  if (st === "to_validate") return `<span class="badge gold">to validate</span>`;
  return `<span class="badge">${escapeHTML(detail)}</span>`;
}
function riskBadge(s) {
  const r = (s.risk_level || "").trim();
  if (!r) return `<span style="color:var(--ink-400)">—</span>`;
  if (/high/i.test(r))   return `<span class="badge alert">High</span>`;
  if (/medium/i.test(r)) return `<span class="badge rust">Medium</span>`;
  if (/not possible/i.test(r)) return `<span class="badge gold">Not possible</span>`;
  return `<span class="badge">${escapeHTML(r)}</span>`;
}

// ============================================================
// PM VIEW
// ============================================================
let pmSelectedSiteId = null;

// Resolve the color swatch that reflects a site's risk/status
function siteSwatchColor(s) {
  if (s.status === "migrated") return "#6FA868";              // green
  const r = (s.risk_level || "").toLowerCase();
  const det = s.status_detail || "";
  if (/high risk/.test(r))   return "#D64545";                // red
  if (/medium risk/.test(r)) return "#F59E0B";                // orange
  if (det === "postponed" || /not possible/.test(r)) return "#A78BFA"; // purple
  return "#8FA5BE";                                           // grey
}

function renderPMView(sites) {
  const listBody = $("#pm-list-body");
  listBody.innerHTML = "";

  const q = ($("#pm-search").value || "").trim().toLowerCase();
  const filtered = sites
    .filter(s => {
      if (!q) return true;
      const hay = [s.site_id, s.company, s.geo_label].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      if ((a.status === "migrated") !== (b.status === "migrated")) {
        return a.status === "migrated" ? 1 : -1;
      }
      const va = a.t_minus_days == null ? 9999 : Math.abs(a.t_minus_days);
      const vb = b.t_minus_days == null ? 9999 : Math.abs(b.t_minus_days);
      return va - vb;
    });

  // Build a proper table — tabular data deserves a table
  const table = el("table", "pm-table");
  const tbody = el("tbody");
  filtered.slice(0, 400).forEach(s => {
    const phase = currentPhaseOfSite(s);
    const phaseLabel = (CATEGORIES.find(c => c.id === phase) || {}).label || phase;
    const tr = el("tr", "pm-row");
    if (s.site_id === pmSelectedSiteId) tr.classList.add("selected");

    const tmLabel = s.t_minus_days == null
      ? "—"
      : (s.t_minus_days < 0 ? "+" + (-s.t_minus_days) + "d" : "T-" + s.t_minus_days);

    tr.innerHTML = `
      <td class="pm-c-site">
        <div class="pm-site-flex">
          <span class="pm-swatch" style="background:${siteSwatchColor(s)}"></span>
          <span class="pm-site-text">
            <span class="pm-site-name">${escapeHTML(s.geo_label || parseSiteId(s.site_id).locationDisplay)}</span>
            <span class="pm-site-id">${escapeHTML(parseSiteId(s.site_id).id)}</span>
          </span>
        </div>
      </td>
      <td class="pm-c-company mono">${escapeHTML(s.company || "—")}</td>
      <td class="pm-c-tminus mono num-tab">${tmLabel}</td>
      <td class="pm-c-phase" style="color:${(CATEGORIES.find(c => c.id === phase) || {}).color || C.ink200}">${phaseLabel}</td>
      <td class="pm-c-status">${statusBadge(s)}</td>
    `;
    tr.addEventListener("click", () => selectPMSite(s.site_id));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listBody.appendChild(table);

  if (pmSelectedSiteId) renderPMDetail(pmSelectedSiteId);
}

function selectPMSite(siteId) {
  pmSelectedSiteId = siteId;
  $$(".pm-list-row", $("#pm-list-body")).forEach(r => r.classList.remove("selected"));
  renderPMDetail(siteId);
  renderPMView(applyFilter(DATA.sites));
}

function renderPMDetail(siteId) {
  const host = $("#pm-detail");
  const s = DATA.sites.find(x => x.site_id === siteId);
  if (!s) { host.innerHTML = `<div class="empty-state">Site not found</div>`; return; }

  const phase = currentPhaseOfSite(s);
  const parts = parseSiteId(s.site_id);
  const ov = overdueCountForSite(s);
  const risk = (s.risk_level || "").trim();

  // Helper: render one bar+pct cell. side ∈ {"safran","obs"}
  const renderSplitCell = (side, split) => {
    if (!split.hasData) {
      return `<div class="m-cell empty"><div class="m-dash"></div><div class="m-pct">—</div></div>`;
    }
    const fillCls = split.pct >= 100 ? "" : (split.pct === 0 ? "zero" : "partial");
    return `
      <div class="m-cell">
        <div class="m-bar m-bar-${side}"><div class="m-bar-fill ${fillCls}" style="width:${split.pct}%"></div></div>
        <div class="m-pct num-tab">${split.pct}%</div>
      </div>
    `;
  };
  const deltaTag = (sp) => {
    const sH = sp.safran.hasData, oH = sp.obs.hasData;
    if (sH && oH) {
      return Math.abs(sp.safran.pct - sp.obs.pct) <= 5
        ? '<span class="m-delta-tag match">match</span>'
        : '<span class="m-delta-tag diff">diff</span>';
    }
    return '<span class="m-delta-tag solo">solo</span>';
  };

  const matrixOpen = currentMatrixPhase(s);
  const blocks = PHASES.map(phase => {
    const ps = phaseSplit(s, phase);
    const isOpen = phase.id === matrixOpen;
    const headerCell = (split) => {
      if (!split.hasData) {
        return `<div class="cat-bar empty"><div class="m-dash"></div></div><div class="cat-pct">—</div>`;
      }
      const fillCls = split.pct >= 100 ? "" : (split.pct === 0 ? "zero" : "partial");
      return `
        <div class="cat-bar"><div class="cat-bar-fill ${fillCls}" style="width:${split.pct}%"></div></div>
        <div class="cat-pct num-tab">${split.pct}%</div>
      `;
    };

    const rows = phase.milestones.map(m => {
      const ms = milestoneSplit(s, m);
      const late = milestoneLate(s, m);
      return `
        <div class="m-row">
          <div class="m-when">${escapeHTML(m.when)}</div>
          <div class="m-label">
            ${escapeHTML(m.label)}${m.subhint ? ` <small>${escapeHTML(m.subhint)}</small>` : ''}
            ${late ? ' <span class="badge alert">Late</span>' : ''}
          </div>
          ${renderSplitCell('safran', ms.safran)}
          ${renderSplitCell('obs', ms.obs)}
          <div class="m-delta">${deltaTag(ms)}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="cat-block matrix-block ${isOpen ? "open" : ""}">
        <div class="cat-header matrix-header">
          <div class="cat-chevron">▸</div>
          <div class="cat-label"><em>${escapeHTML(phase.label)}</em></div>
          <div class="matrix-header-side"><div class="matrix-header-tag safran">Safran</div>${headerCell(ps.safran)}</div>
          <div class="matrix-header-side"><div class="matrix-header-tag obs">OBS</div>${headerCell(ps.obs)}</div>
        </div>
        <div class="cat-body matrix-body">
          <div class="m-row m-row-head">
            <div class="m-when">When</div>
            <div class="m-label">Milestone</div>
            <div class="m-cell-head safran">Safran view</div>
            <div class="m-cell-head obs">OBS view</div>
            <div class="m-delta">Δ</div>
          </div>
          ${rows}
        </div>
      </div>
    `;
  }).join("");

  const prereqMeta = DATA.prereq_meta || {};
  const lateList = Object.entries(s.prereqs || {})
    .filter(([k, v]) => v != null && v < 100 && s.t_minus_days != null && prereqMeta[k] && s.t_minus_days > prereqMeta[k].when_days)
    .sort((a, b) => prereqMeta[a[0]].when_days - prereqMeta[b[0]].when_days);

  host.innerHTML = `
    <div class="pm-detail-hero">
      <h3><em>${escapeHTML(s.geo_label || parts.locationDisplay)}</em></h3>
      <div class="pm-subline">${escapeHTML(parts.id)} · ${escapeHTML(s.company || "—")} · ${escapeHTML(s.topology || "—")} · ${escapeHTML(s.country_code || "—")}</div>
    </div>
    <div class="pm-kpi-row">
      <div class="pm-mini-kpi"><div class="k-lab">Status</div><div class="k-val" style="font-size:15px">${statusBadge(s)}</div></div>
      <div class="pm-mini-kpi"><div class="k-lab">Cutover</div><div class="k-val">${fmtDateShort(s.migration_date)}</div></div>
      <div class="pm-mini-kpi"><div class="k-lab">T−</div><div class="k-val num-tab">${s.t_minus_days == null ? "—" : s.t_minus_days + "d"}</div></div>
      <div class="pm-mini-kpi"><div class="k-lab">Late</div><div class="k-val num-tab" style="color:${ov ? 'var(--overdue-soft)' : 'var(--paper-light)'}">${ov}</div></div>
    </div>

    ${lateList.length ? `
      <div style="padding:12px 14px;background:rgba(168,130,84,0.1);border-left:3px solid var(--overdue);border-radius:3px;margin-bottom:14px;">
        <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--overdue-soft);margin-bottom:4px;">Critical path — late milestones</div>
        ${lateList.slice(0, 3).map(([k, v]) => `
          <div style="font-family:var(--font-serif);font-size:13px;color:var(--paper-light);margin:2px 0;">
            ${escapeHTML(k)} · <span class="mono" style="color:var(--ink-300);font-size:10px">${escapeHTML(prereqMeta[k].owner||"—")} ${escapeHTML(prereqMeta[k].when_label||"")}</span> · <span class="mono num-tab">${v}%</span>
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${risk ? `<div style="padding:10px 14px;background:rgba(214,69,69,0.08);border-left:3px solid var(--alert);border-radius:3px;margin-bottom:14px;font-family:var(--font-serif);font-size:14px;color:var(--paper-light);">Risk: <em style="color:var(--alert-soft)">${escapeHTML(risk)}</em></div>` : ""}

    ${renderRiskTimeline(s)}

    ${blocks}

    <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border);font-size:12px;color:var(--text-mid);line-height:1.6;">
      ${s.address ? `<div><span class="mono" style="color:var(--ink-300);text-transform:uppercase;letter-spacing:1px;font-size:10px;">Address</span><br>${escapeHTML(s.address)}</div>` : ""}
      ${s.it_contact ? `<div style="margin-top:8px;"><span class="mono" style="color:var(--ink-300);text-transform:uppercase;letter-spacing:1px;font-size:10px;">IT contact</span><br>${escapeHTML(s.it_contact)}</div>` : ""}
      ${s.comment ? `<div style="margin-top:8px;"><span class="mono" style="color:var(--ink-300);text-transform:uppercase;letter-spacing:1px;font-size:10px;">Comment</span><br>${escapeHTML(s.comment)}</div>` : ""}
    </div>
  `;

  // Wire up chevrons
  $$(".cat-header", host).forEach(h => {
    h.addEventListener("click", () => h.parentElement.classList.toggle("open"));
  });
}

// ============================================================
// GANTT
// ============================================================
const GANTT_STATE = {
  zoom: parseInt(localStorage.getItem("sdwan_v2_zoom") || "5", 10),
  group: localStorage.getItem("sdwan_v2_group") || "none",
  collapsed: new Set(JSON.parse(localStorage.getItem("sdwan_v2_collapsed") || "[]")),
};

function renderGantt(sites) {
  const host = $("#gantt-inner");
  host.innerHTML = "";

  // KPIs
  $("#gantt-count").textContent = fmtNum(sites.length);
  let overdueSites = 0, overdueTotal = 0;
  const peakBuckets = {};
  sites.forEach(s => {
    const ov = overdueCountForSite(s);
    if (ov > 0) { overdueSites += 1; overdueTotal += ov; }
    if (s.migration_date && s.status !== "migrated") {
      const d = new Date(s.migration_date);
      const diffDays = (d - TODAY) / 86400000;
      if (diffDays > 0 && diffDays <= 84) {
        const k = `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2,"0")}`;
        peakBuckets[k] = (peakBuckets[k] || 0) + 1;
      }
    }
  });
  $("#gantt-overdue").textContent = fmtNum(overdueSites);
  $("#gantt-overdue-total").textContent = fmtNum(overdueTotal);
  const peak = Object.entries(peakBuckets).sort((a, b) => b[1] - a[1])[0];
  if (peak) {
    $("#gantt-peak").textContent = peak[1];
    $("#gantt-peak-sub").textContent = `peak at ${peak[0].replace("-W", " W")}`;
  } else {
    $("#gantt-peak").textContent = "0";
    $("#gantt-peak-sub").textContent = "no peak in next 12 wks";
  }

  // Date range
  const dates = sites.map(s => s.migration_date).filter(Boolean).map(d => new Date(d));
  if (!dates.length) {
    host.innerHTML = `<div style="padding:40px;color:var(--ink-300);font-family:var(--font-serif);font-style:italic;text-align:center">No dated sites in filter.</div>`;
    return;
  }
  // Cover full phase extent: prep (-90d) + decom (+60d), with breathing room
  const dMin = new Date(Math.min(...dates)); dMin.setDate(dMin.getDate() - 100);
  const dMax = new Date(Math.max(...dates)); dMax.setDate(dMax.getDate() + 80);
  const spanDays = Math.ceil((dMax - dMin) / 86400000);
  const pxPerDay = GANTT_STATE.zoom;
  const trackW = spanDays * pxPerDay;

  // Header row
  const headerRow = el("div", "gantt-header-row");
  headerRow.appendChild(Object.assign(el("div", "gantt-left"), { textContent: "Site" }));
  const headTrack = el("div", "gantt-track-head");
  headTrack.style.width = trackW + "px";
  headTrack.style.minWidth = trackW + "px";

  // Month labels
  const cur = new Date(dMin); cur.setDate(1);
  while (cur <= dMax) {
    const dx = ((cur - dMin) / 86400000) * pxPerDay;
    const lbl = el("div", "gantt-month-label");
    lbl.style.left = dx + 4 + "px";
    lbl.innerHTML = cur.toLocaleDateString("en-GB", { month: "long", year: "numeric" }).replace(/ (\d+)/, " <small>$1</small>");
    headTrack.appendChild(lbl);
    cur.setMonth(cur.getMonth() + 1);
  }
  // Week ticks
  const wk = new Date(dMin);
  while (wk.getDay() !== 1) wk.setDate(wk.getDate() + 1);
  while (wk <= dMax) {
    const dx = ((wk - dMin) / 86400000) * pxPerDay;
    const t = el("div", "gantt-week-tick");
    t.style.left = dx + "px";
    headTrack.appendChild(t);
    wk.setDate(wk.getDate() + 7);
  }
  // Today line
  const todayDx = ((TODAY - dMin) / 86400000) * pxPerDay;
  const todayLn = el("div", "gantt-today");
  todayLn.style.left = todayDx + "px";
  headTrack.appendChild(todayLn);
  headerRow.appendChild(headTrack);
  host.appendChild(headerRow);

  // Chronological sort: by migration_date ascending, undated sites last
  const chronoSort = (a, b) => {
    const da = a.migration_date;
    const db = b.migration_date;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -1 : da > db ? 1 : 0;
  };

  // Grouping (sites inside each group are sorted chronologically)
  let groups = [];
  if (GANTT_STATE.group === "none") {
    groups = [{ label: "All sites", sites: sites.slice().sort(chronoSort) }];
  } else {
    const key = GANTT_STATE.group === "zone" ? "batch_underlay"
              : GANTT_STATE.group === "batch" ? "batch"
              : GANTT_STATE.group === "country" ? "country_code"
              : "company";
    const map = {};
    sites.forEach(s => { const k = s[key] || "—"; (map[k] = map[k] || []).push(s); });
    groups = Object.entries(map).sort((a, b) => b[1].length - a[1].length)
      .map(([k, g]) => ({ label: k, sites: g.sort(chronoSort) }));
  }

  groups.forEach(gp => {
    // Lane header
    const laneHead = el("div", "gantt-lane-header");
    const laneLeft = el("div", "gantt-lane-header-left");
    const collapsed = GANTT_STATE.collapsed.has(gp.label);
    const ovCount = gp.sites.filter(s => overdueCountForSite(s) > 0).length;
    laneLeft.innerHTML = `<span>${collapsed ? "▶" : "▼"}</span><span>${escapeHTML(gp.label)}</span><span class="gantt-lane-count">${gp.sites.length}${ovCount?` · <span style="color:var(--overdue-soft)">${ovCount} late</span>`:""}</span>`;
    laneLeft.addEventListener("click", () => {
      if (GANTT_STATE.collapsed.has(gp.label)) GANTT_STATE.collapsed.delete(gp.label);
      else GANTT_STATE.collapsed.add(gp.label);
      localStorage.setItem("sdwan_v2_collapsed", JSON.stringify([...GANTT_STATE.collapsed]));
      renderGantt(sites);
    });
    laneHead.appendChild(laneLeft);
    const laneTrack = el("div", "gantt-lane-track");
    laneTrack.style.flex = "1"; laneTrack.style.width = trackW + "px"; laneTrack.style.minWidth = trackW + "px";
    laneHead.appendChild(laneTrack);
    host.appendChild(laneHead);

    if (collapsed) return;

    gp.sites.slice(0, 300).forEach(s => {
      const row = el("div", "gantt-row");
      const left = el("div", "gantt-row-left");
      left.innerHTML = `
        <div class="gr-site">${escapeHTML(s.geo_label || parseSiteId(s.site_id).locationDisplay)}</div>
        <div class="gr-meta"><span>${escapeHTML(s.company || "")}</span><span>${escapeHTML(s.country_code || "")}</span></div>
      `;
      left.addEventListener("click", () => { selectPMSite(s.site_id); activateTab("pm"); });
      row.appendChild(left);

      const track = el("div", "gantt-track");
      track.style.width = trackW + "px"; track.style.minWidth = trackW + "px";

      if (s.migration_date) {
        const md = new Date(s.migration_date);
        const dxMig = ((md - dMin) / 86400000) * pxPerDay;
        // Phases (approx durations from Safran SD-WAN typical timeline)
        const phases = [
          { cls: "prep",    start: -90, end: -40 },
          { cls: "config",  start: -40, end: -10 },
          { cls: "install", start: -10, end: 0 },
          { cls: "hyper",   start: 1,   end: 30 },
          { cls: "decom",   start: 30,  end: 60 },
        ];
        phases.forEach(p => {
          const x = dxMig + p.start * pxPerDay;
          const w = (p.end - p.start) * pxPerDay;
          const ph = el("div", "gantt-phase " + p.cls);
          ph.style.left = x + "px"; ph.style.width = w + "px";
          track.appendChild(ph);
        });
        // Cutover marker
        const mk = el("div", "gantt-marker");
        mk.style.left = dxMig + "px";
        mk.addEventListener("mouseenter", evt => showTooltip(`
          <div class="tt-title">${escapeHTML(s.geo_label || "—")} <em>· cutover</em></div>
          <div class="tt-row"><span class="tt-k">Site ID</span><span class="tt-v mono" style="font-size:10px">${escapeHTML(s.site_id)}</span></div>
          <div class="tt-row"><span class="tt-k">Date</span><span class="tt-v">${fmtDate(s.migration_date)}</span></div>
          <div class="tt-row"><span class="tt-k">Status</span><span class="tt-v">${escapeHTML(s.status)}</span></div>
        `, evt));
        mk.addEventListener("mousemove", positionTooltip);
        mk.addEventListener("mouseleave", hideTooltip);
        track.appendChild(mk);

        // Milestone dots (from prereq_meta when_days offsets)
        const prereqMeta = DATA.prereq_meta || {};
        Object.entries(s.prereqs || {}).forEach(([pk, val]) => {
          const meta = prereqMeta[pk]; if (!meta) return;
          const dx = dxMig + meta.when_days * pxPerDay;
          const dot = el("div", "gantt-dot");
          const late = val != null && val < 100 && s.t_minus_days != null && s.t_minus_days > meta.when_days;
          const cls = val == null ? "pending" : val >= 100 ? "done" : late ? "overdue" : "partial";
          dot.className = "gantt-dot " + cls;
          dot.style.left = dx + "px";
          track.appendChild(dot);
        });
      }
      row.appendChild(track);
      host.appendChild(row);
    });
  });
}

// ============================================================
// TABS + routing
// ============================================================
function activateTab(tabId) {
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  $$(".tabpane").forEach(p => p.classList.toggle("active", p.id === "tab-" + tabId));
}

// ============================================================
// Footer actions
// ============================================================
function bindFooter() {
  $("#btn-export-csv")?.addEventListener("click", () => {
    const sites = applyFilter(DATA.sites);
    const headers = ["site_id","company","country","geo_label","status","risk_level","migration_date","t_minus_days","topology","migration_referent"];
    const rows = sites.map(s => headers.map(h => {
      if (h === "country") return (s.country_code || "");
      return (s[h] == null ? "" : String(s[h])).replace(/[\r\n";]/g, " ");
    }).join(";"));
    const csv = "﻿" + headers.join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sdwan_v2_${DATA.as_of_date}_${sites.length}sites.csv`;
    a.click();
  });

  $("#btn-share-url")?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.hash = filtersToHash();
    navigator.clipboard.writeText(url.toString()).then(() => {
      const btn = $("#btn-share-url");
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = "✓ Copied";
      setTimeout(() => { btn.textContent = old; }, 1800);
    });
  });

  $("#btn-present")?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
}

function filtersToHash() {
  const p = new URLSearchParams();
  if (filters.search) p.set("q", filters.search);
  if (filters.window && filters.window !== "all") p.set("w", filters.window);
  if (filters.dateFrom) p.set("df", filters.dateFrom);
  if (filters.dateTo)   p.set("dt", filters.dateTo);
  if (filters.risk.size) p.set("r", [...filters.risk].join(","));
  if (filters.phase.size) p.set("p", [...filters.phase].join(","));
  if (filters.company.size) p.set("co", [...filters.company].join(","));
  if (filters.country.size) p.set("cy", [...filters.country].join(","));
  return p.toString();
}

// ============================================================
// UI bindings
// ============================================================
function bindUI() {
  $$(".tab").forEach(t => {
    t.addEventListener("click", () => activateTab(t.dataset.tab));
  });
  $("#sites-list-search")?.addEventListener("input", () => renderSitesList(applyFilter(DATA.sites)));
  $("#pm-search").addEventListener("input", () => renderPMView(applyFilter(DATA.sites)));

  // Gantt controls
  $$(".gantt-controls [data-zoom]").forEach(b => {
    b.addEventListener("click", () => {
      GANTT_STATE.zoom = parseInt(b.dataset.zoom, 10);
      localStorage.setItem("sdwan_v2_zoom", GANTT_STATE.zoom);
      $$(".gantt-controls [data-zoom]").forEach(x => x.classList.toggle("active", x === b));
      renderGantt(applyFilter(DATA.sites));
    });
    if (parseInt(b.dataset.zoom) === GANTT_STATE.zoom) b.classList.add("active");
    else b.classList.remove("active");
  });
  $$(".gantt-controls [data-group]").forEach(b => {
    b.addEventListener("click", () => {
      GANTT_STATE.group = b.dataset.group;
      localStorage.setItem("sdwan_v2_group", GANTT_STATE.group);
      $$(".gantt-controls [data-group]").forEach(x => x.classList.toggle("active", x === b));
      renderGantt(applyFilter(DATA.sites));
    });
    if (b.dataset.group === GANTT_STATE.group) b.classList.add("active");
    else b.classList.remove("active");
  });
}

// ============================================================
// Filter count display
// ============================================================
function updateFilterCount() { /* removed — footer is gone */ }

// ============================================================
// Top-level render
// ============================================================
function renderAll() {
  const sites = applyFilter(DATA.sites);
  renderStatusBar(sites);
  renderNarrative(sites);
  renderKPIs(sites);
  renderWorldMap(sites);
  renderFunnel(sites);
  renderDonut(sites);
  renderBurnup(sites);
  renderCompanyStacked(sites);
  renderSitesList(sites);
  renderPMView(sites);
  renderGantt(sites);
  updateFilterCount();
  updateKpiActiveState();
}

// ============================================================
// Init
// ============================================================
async function init() {
  if (!DATA) {
    document.body.innerHTML = `<div style="padding:60px;text-align:center;font-family:var(--font-serif);font-size:20px;color:#C9A449">data.js not loaded — run build_data.py</div>`;
    return;
  }
  renderHeader();
  computeSiteAddedDates();
  initFilters();
  bindUI();
  bindFooter();
  bindKpiTiles();
  setupCompareUI();
  await loadWorldMap();
  renderAll();
}

init();
