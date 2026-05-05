# Safran SD-WAN — Executive Dashboard

Self-contained dashboard for the Safran SD-WAN migration program. Renders
KPIs, world map, phase funnel, risk donut, cadence/burnup, company delivery,
per-site critical path, and a Gantt timeline.

The full Python data pipeline runs **in the browser** via [Pyodide](https://pyodide.org/) —
visitors upload their own PMO xlsx files (drag-and-drop) and the dashboard
rebuilds itself locally. Files never leave the browser.

## Source files expected at upload

| Slot | Required | Filename pattern |
|---|---|---|
| SDWAN_Timeline_Intern | yes | filename contains `intern` |
| Sprint SD-WAN Week — RAMPUP | yes | filename contains `RAMPUP` or `Sprint SD-WAN` |
| Onglet suivi SDWAN Orange | optional | filename contains `Orange` + `SDWAN` |
| Onglet suivi underlay Orange | optional | filename contains `Orange` + `underlay` |

## Layout

```
index.html              Dashboard entry
app.js                  All UI logic
style.css               Theme
upload-loader.js        Pyodide bootstrap + pipeline orchestration
data.js                 Empty stub in this repo (populated at upload)
world.json              Country outlines
sites_geo.csv           Per-site lat/lon overrides (empty in this repo)
safran-logo.svg
snapshots/              Historical aggregates (empty in this repo)
_pipeline/              Python pipeline (mounted into Pyodide MEMFS)
  mockup/
    build_input.py        Consolidates raw xlsx → clean canonical xlsx
    build_input_orange.py Orange Business operational tracker extractor
    build_data.py         Reshapes consolidated xlsx → data.js (v1 shape)
  mockup_v2/
    build_data.py         Enriches with geocoding + snapshots → data.js (v2)
    geocode.py            Country / city resolver (CITIES dict empty here)
vercel.json             Static-deploy headers
```

## Deploy on Vercel

```bash
# CLI
npm i -g vercel
vercel deploy --prod
```

Or drag-and-drop the folder onto https://vercel.com/new — Vercel
auto-detects it as a static site, no build step.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

The first upload downloads Pyodide (~10 MB) from CDN; subsequent runs are instant.

## Customizing

This public skeleton has the data structures stripped. If you fork it for
your own organization, you'll typically want to:

- Populate `_pipeline/mockup_v2/geocode.py` `CITIES` dict with your sites
- Populate `sites_geo.csv` with overrides (or regenerate from your data)
- Add aliases to `_pipeline/mockup/build_input.py` `SITE_ID_ALIASES`,
  `SITE_ID_EXCLUDE`, `WEEKLY_PLAN_ALIASES` if your extracts have recurring
  variants to normalize
- Drop your historical snapshots under `snapshots/` (filenames `YYYY-MM-DD.json`,
  registered in `snapshots/index.json`)

## Privacy

The deployed site is fully static — no backend, no telemetry. Uploaded xlsx
files are processed locally in the browser tab and never transmitted. The
processed dataset is held in `sessionStorage` for the lifetime of the tab
only; closing the tab clears it.
