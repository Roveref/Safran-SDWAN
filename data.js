/* Empty payload — public skeleton.
   The dashboard renders a blank state on first load; click "⇡ Load data"
   in the top bar to upload your own PMO xlsx files and rebuild it
   in-browser via Pyodide. */
window.SDWAN_DATA = {
  as_of_date: new Date().toISOString().slice(0, 10),
  sites: [],
  countries: [],
  snapshots: [],
  narrative: {
    as_of: null,
    total: 0, migrated: 0, remaining: 0, pct_migrated: 0,
    velocity_per_week: 0, weeks_to_land: null, projected_landing: null,
    high_risk: 0, medium_risk: 0,
    top_blockers: []
  },
  prereq_meta: {},
  risk_trend: {},
  v2_build: null
};
