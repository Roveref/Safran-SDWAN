/* ============================================================
   SD-WAN Safran — Upload + Pyodide pipeline runner
   ============================================================
   Lets the dashboard rebuild itself from raw PMO xlsx uploads,
   in-browser, by running the existing Python pipeline through
   Pyodide. No server-side step; files never leave the tab.
   ============================================================ */

(() => {
  const PYODIDE_VERSION = "0.26.4";
  const PYODIDE_INDEX   = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  const STORAGE_KEY     = "SDWAN_DATA_UPLOADED";
  const EXCLUSIONS_KEY  = "SDWAN_EXCLUSIONS";
  const CLEARED_KEY     = "SDWAN_DATA_CLEARED";

  // Files we mount into Pyodide MEMFS. Each entry: [memfsPath, fetchUrl].
  // The MEMFS layout mirrors the original Planning/ tree so the Python
  // scripts (which compute paths via __file__.parent.parent) work unchanged.
  const STATIC_ASSETS = [
    ["/work/Planning/mockup/build_input.py",         "_pipeline/mockup/build_input.py"],
    ["/work/Planning/mockup/build_input_orange.py",  "_pipeline/mockup/build_input_orange.py"],
    ["/work/Planning/mockup/build_data.py",          "_pipeline/mockup/build_data.py"],
    ["/work/Planning/mockup_v2/build_data.py",       "_pipeline/mockup_v2/build_data.py"],
    ["/work/Planning/mockup_v2/geocode.py",          "_pipeline/mockup_v2/geocode.py"],
    ["/work/Planning/mockup_v2/sites_geo.csv",       "sites_geo.csv"],
  ];

  // Canonical filenames we use when staging uploads. The Python pipeline locates
  // its inputs via "latest dated file" globs — we pick a sentinel YYYYMMDD that
  // always wins (also valid as DDMMYYYY for the Orange regex: 31/12/9999).
  const STAGED_NAMES = {
    intern:           "/work/Planning/SDWAN_Timeline_Intern_31129999.xlsx",
    sprint:           "/work/Planning/Sprint SD-WAN Week - RAMPUP_31129999.xlsx",
    orange_sdwan:     "/work/Planning/Onglet suivi SDWAN Orange 31129999.xlsx",
    orange_underlay:  "/work/Planning/Onglet suivi underlay Orange 31129999.xlsx",
  };

  // ----------------------------------------------------------------
  // DOM helpers
  // ----------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ----------------------------------------------------------------
  // Module state
  // ----------------------------------------------------------------
  const state = {
    files: { intern: null, sprint: null, orange_sdwan: null, orange_underlay: null },
    pyodide: null,           // Pyodide instance (cached across runs)
    pyodideLoading: null,    // in-flight Promise
    running: false,
  };

  // ================================================================
  // IndexedDB persistence — keep uploaded files across reloads
  // so the user can re-open the modal and only swap one file
  // ================================================================
  const IDB_NAME    = "sdwan-uploads";
  const IDB_STORE   = "files";
  const IDB_VERSION = 1;

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbGetAll() {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbPut(rec) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
  async function idbDelete(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
  async function idbClear() {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async function hydrateFilesFromIDB() {
    try {
      const records = await idbGetAll();
      let hydrated = 0;
      for (const r of records) {
        if (!Object.prototype.hasOwnProperty.call(state.files, r.key)) continue;
        if (state.files[r.key]) continue;     // don't override what user just dropped
        state.files[r.key] = new File([r.blob], r.name, { type: r.type || "" });
        hydrated++;
      }
      if (hydrated > 0) {
        refreshStatusRows();
        updateRunButton();
      }
    } catch (e) {
      console.warn("[upload-loader] IDB hydrate failed:", e);
    }
  }

  function persistFile(key, file) {
    idbPut({ key, name: file.name, size: file.size, type: file.type || "", blob: file })
      .catch(e => console.warn("[upload-loader] IDB put failed:", e));
  }
  function forgetFile(key) {
    idbDelete(key).catch(e => console.warn("[upload-loader] IDB delete failed:", e));
  }
  function clearFile(key) {
    state.files[key] = null;
    forgetFile(key);
    refreshStatusRows();
    refreshWarnings([]);
    updateRunButton();
  }

  // ================================================================
  // Source badge — "Custom upload" pill in masthead
  // ================================================================
  function refreshSourceBadge() {
    const badge = $("#hdr-source-badge");
    if (!badge) return;
    const txt = badge.querySelector(".hdr-source-text");
    const btn = badge.querySelector(".hdr-source-reset");
    const isUpload  = window.SDWAN_DATA_SOURCE === "upload"
                    || !!localStorage.getItem(STORAGE_KEY);
    const isCleared = window.SDWAN_DATA_SOURCE === "cleared"
                    || localStorage.getItem(CLEARED_KEY) === "1";
    if (isCleared) {
      badge.hidden = false;
      badge.classList.add("cleared");
      if (txt) txt.textContent = "Cleared";
      if (btn) btn.textContent = "restore";
      if (btn) btn.title = "Restore the shipped demo snapshot";
    } else {
      badge.classList.remove("cleared");
      badge.hidden = !isUpload;
      if (txt) txt.textContent = "Custom upload";
      if (btn) btn.textContent = "reset";
      if (btn) btn.title = "Revert to shipped snapshot";
    }
  }

  function bindSourceBadgeReset() {
    const btn = $("#hdr-source-reset");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isCleared = localStorage.getItem(CLEARED_KEY) === "1";
      if (isCleared) {
        // Restore the shipped demo: clear the cleared flag and reload.
        localStorage.removeItem(CLEARED_KEY);
        window.location.reload();
        return;
      }
      // Reset to a clean zero state: wipe uploads + exclusions, set the
      // cleared flag so the dashboard renders with zero scope on reload.
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXCLUSIONS_KEY);
      localStorage.setItem(CLEARED_KEY, "1");
      idbClear().catch(() => {}).finally(() => window.location.reload());
    });
  }

  // ================================================================
  // Persist + restore the "Site IDs to exclude" textarea
  // ================================================================
  function bindExclusionsPersistence() {
    const ta = $("#upload-exclusions");
    if (!ta) return;
    try {
      const saved = localStorage.getItem(EXCLUSIONS_KEY);
      if (saved !== null) ta.value = saved;
    } catch (e) { /* ignore */ }
    ta.addEventListener("input", () => {
      try {
        if (ta.value) localStorage.setItem(EXCLUSIONS_KEY, ta.value);
        else          localStorage.removeItem(EXCLUSIONS_KEY);
      } catch (e) { /* quota / private mode — ignore */ }
    });
  }

  // ================================================================
  // Modal open / close
  // ================================================================
  const modal       = () => $("#upload-modal");
  const progressBox = () => $("#upload-progress");
  const runBtn      = () => $("#upload-run");

  function openModal() {
    if (state.running) return;        // don't reopen mid-run
    const m = modal();
    if (!m) return;
    m.hidden = false;
    document.body.classList.add("upload-modal-open");
    const dz = $("#upload-dropzone");
    if (dz) dz.focus();
    // Re-hydrate from IDB so the previously-uploaded files reappear; the
    // user only needs to drop the one they want to swap.
    hydrateFilesFromIDB();
  }

  function closeModal() {
    if (state.running) return;
    const m = modal();
    if (!m) return;
    m.hidden = true;
    document.body.classList.remove("upload-modal-open");
  }

  function bindModalChrome() {
    const btn = $("#btn-load-data");
    if (btn) btn.addEventListener("click", openModal);

    const closers = $$("[data-upload-close], #upload-close");
    closers.forEach((el) => el.addEventListener("click", closeModal));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal()?.hidden) closeModal();
    });
  }

  // ================================================================
  // File pickers — single multi-drop zone, classify by filename
  // ================================================================

  // Classify a file based on its filename. Returns one of the STAGED_NAMES
  // keys, or null if we can't tell what it is.
  function classifyFile(file) {
    const n = (file.name || "").toLowerCase();
    if (!n.endsWith(".xlsx")) return null;
    if (n.startsWith("~$")) return null;                       // Excel lock files
    if (n.includes("intern"))                                  return "intern";
    if (n.includes("rampup") || n.includes("sprint sd-wan"))   return "sprint";
    if (n.includes("orange") && n.includes("underlay"))        return "orange_underlay";
    if (n.includes("orange") && n.includes("sdwan"))           return "orange_sdwan";
    return null;
  }

  function ingestFiles(fileList) {
    const accepted = [];
    const rejected = [];
    for (const f of fileList) {
      const key = classifyFile(f);
      if (key) {
        state.files[key] = f;
        persistFile(key, f);     // IDB-backed so it survives reload
        accepted.push({ key, f });
      } else {
        rejected.push(f);
      }
    }
    refreshStatusRows();
    refreshWarnings(rejected);
    updateRunButton();
  }

  function refreshStatusRows() {
    $$(".upload-status-row").forEach((row) => {
      const key = row.dataset.key;
      const f   = state.files[key];
      const ico = row.querySelector(".upload-status-icon");
      const lbl = row.querySelector(`[data-filename-for="${key}"]`);
      let clearBtn = row.querySelector(".upload-clear-btn");
      if (f) {
        row.classList.add("ok");
        if (ico) ico.textContent = "✓";
        if (lbl) lbl.textContent = `${f.name} · ${humanSize(f.size)}`;
        if (!clearBtn) {
          clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.className = "upload-clear-btn";
          clearBtn.title = "Remove this file";
          clearBtn.setAttribute("aria-label", "Remove " + key);
          clearBtn.textContent = "✕";
          clearBtn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            clearFile(key);
          });
          row.appendChild(clearBtn);
        }
      } else {
        row.classList.remove("ok");
        if (ico) ico.textContent = "○";
        if (lbl) lbl.textContent = "";
        if (clearBtn) clearBtn.remove();
      }
    });
  }

  function refreshWarnings(rejected) {
    const box = $("#upload-status-warn");
    if (!box) return;
    if (!rejected || rejected.length === 0) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    box.hidden = false;
    const names = rejected.map(f => f.name).join(", ");
    box.textContent = `⚠ Couldn't identify: ${names}. Make sure the filename includes "Intern", "RAMPUP", "SDWAN Orange" or "underlay Orange".`;
  }

  function bindFilePickers() {
    const dz    = $("#upload-dropzone");
    const input = $("#upload-multi");
    if (!dz || !input) return;

    // Click anywhere in the drop zone → open native file picker
    dz.addEventListener("click", () => input.click());
    dz.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });

    // Multi-select via the picker
    input.addEventListener("change", () => {
      ingestFiles(input.files || []);
      input.value = "";  // allow re-selecting the same file
    });

    // Drag & drop
    const setActive = (on) => dz.classList.toggle("dragover", on);
    ["dragenter", "dragover"].forEach((evt) =>
      dz.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        setActive(true);
      })
    );
    ["dragleave", "dragend"].forEach((evt) =>
      dz.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        setActive(false);
      })
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault(); e.stopPropagation();
      setActive(false);
      const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [];
      ingestFiles(files);
    });

    // Prevent the browser from opening dropped files when the user misses the zone
    ["dragover", "drop"].forEach((evt) =>
      window.addEventListener(evt, (e) => {
        if (modal()?.hidden) return;             // only while the modal is open
        if (dz.contains(e.target)) return;       // bubbled from the zone itself
        e.preventDefault();
      })
    );
  }

  function updateRunButton() {
    const btn = runBtn();
    if (!btn) return;
    btn.disabled = !(state.files.intern && state.files.sprint) || state.running;
  }

  function humanSize(bytes) {
    if (!bytes) return "0 B";
    const u = ["B","KB","MB","GB"];
    let i = 0, v = bytes;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
  }

  // ================================================================
  // Progress
  // ================================================================
  let _logBuf = "";
  function showProgress() {
    progressBox().hidden = false;
    setProgressLabel("Loading…");
    setProgressPct(null);
    setProgressFill(0);
    _logBuf = "";
    $("#upload-progress-log").textContent = "";
  }

  function setProgressLabel(text)  { $("#upload-progress-label").textContent = text; }
  function setProgressPct(pct)     {
    const el = $("#upload-progress-pct");
    el.textContent = (pct === null || pct === undefined) ? "" : `${Math.round(pct)}%`;
  }
  function setProgressFill(pct)    {
    const el = $("#upload-progress-fill");
    el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
  function appendLog(line) {
    _logBuf += (_logBuf ? "\n" : "") + line;
    const el = $("#upload-progress-log");
    el.textContent = _logBuf;
    el.scrollTop = el.scrollHeight;
  }
  function flashError(msg) {
    setProgressLabel("✗ " + msg);
    setProgressPct(null);
    setProgressFill(100);
    progressBox().classList.add("err");
  }

  // ================================================================
  // Pyodide bootstrap
  // ================================================================
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });
  }

  async function ensurePyodide() {
    if (state.pyodide) return state.pyodide;
    if (state.pyodideLoading) return state.pyodideLoading;

    state.pyodideLoading = (async () => {
      setProgressLabel("Fetching Python runtime (Pyodide)…");
      setProgressFill(8);
      if (typeof loadPyodide === "undefined") {
        await loadScript(PYODIDE_INDEX + "pyodide.js");
      }
      setProgressFill(20);
      setProgressLabel("Booting Python runtime…");
      const py = await loadPyodide({
        indexURL: PYODIDE_INDEX,
        stdout: (m) => appendLog(m),
        stderr: (m) => appendLog("⚠ " + m),
      });
      setProgressFill(45);
      setProgressLabel("Installing openpyxl…");
      await py.loadPackage("micropip");
      await py.runPythonAsync(`
import micropip
await micropip.install("openpyxl")
`);
      setProgressFill(60);
      state.pyodide = py;
      return py;
    })();

    return state.pyodideLoading;
  }

  // ================================================================
  // FS staging
  // ================================================================
  async function stageStaticAssets(py) {
    setProgressLabel("Staging pipeline files…");
    py.FS.mkdirTree("/work/Planning/mockup");
    py.FS.mkdirTree("/work/Planning/mockup_v2/snapshots");

    // Static text assets (Python sources, sites_geo.csv)
    for (const [memPath, url] of STATIC_ASSETS) {
      const txt = await fetchText(url);
      py.FS.writeFile(memPath, txt);
    }

    // Snapshots — fetch via index.json so the list stays in sync with disk.
    let idx = null;
    try {
      idx = await fetchJSON("snapshots/index.json");
    } catch { idx = { snapshots: [] }; }
    py.FS.writeFile("/work/Planning/mockup_v2/snapshots/index.json", JSON.stringify(idx));
    for (const date of (idx.snapshots || [])) {
      try {
        const txt = await fetchText(`snapshots/${date}.json`);
        py.FS.writeFile(`/work/Planning/mockup_v2/snapshots/${date}.json`, txt);
      } catch (e) {
        appendLog(`⚠ snapshot ${date}.json missing — skipped`);
      }
    }
  }

  // Always revalidate with the server (sends If-None-Match). Vercel
  // returns 304 when the asset hasn't changed, so this is cheap, but
  // it guarantees a fresh pipeline whenever GitHub pushes a new build.
  async function fetchText(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.text();
  }
  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  }

  async function stageUploads(py) {
    for (const [key, file] of Object.entries(state.files)) {
      if (!file) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      py.FS.writeFile(STAGED_NAMES[key], buf);
      appendLog(`staged ${key}: ${file.name} (${humanSize(file.size)})`);
    }
  }

  // ================================================================
  // Pipeline
  // ================================================================
  // Read the "Site IDs to exclude" textarea (one per line, comments allowed).
  function getRuntimeExclusions() {
    const ta = $("#upload-exclusions");
    if (!ta || !ta.value) return [];
    return ta.value
      .split("\n")
      .map(s => s.trim())
      .filter(s => s && !s.startsWith("#"));
  }

  function buildPipelinePy(runtimeExclusions) {
    const exclusionsJson = JSON.stringify(runtimeExclusions || []);
    return `
import os, sys, importlib.util, traceback

ROOT = "/work/Planning"
os.chdir(ROOT)

for p in (f"{ROOT}/mockup", f"{ROOT}/mockup_v2"):
    if p not in sys.path:
        sys.path.insert(0, p)

def _import(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

# 1) Consolidate raw → sdwan_dashboard_input.xlsx
print("▶ build_input.py")
build_input = _import("build_input", f"{ROOT}/mockup/build_input.py")
RUNTIME_EXCLUSIONS = ${exclusionsJson}
if RUNTIME_EXCLUSIONS:
    base = set(getattr(build_input, "SITE_ID_EXCLUDE", set()))
    build_input.SITE_ID_EXCLUDE = base | set(RUNTIME_EXCLUSIONS)
    print(f"  applying {len(RUNTIME_EXCLUSIONS)} runtime exclusion(s): {RUNTIME_EXCLUSIONS}")
sys.argv = ["build_input.py"]
build_input.main()

# 2) Reshape → mockup/data.js
print("▶ build_data.py (v1 reshape)")
build_data_v1 = _import("build_data_v1", f"{ROOT}/mockup/build_data.py")
sys.argv = ["build_data.py"]
build_data_v1.main()

# 3) Enrich + embed snapshots → mockup_v2/data.js
print("▶ build_data.py (v2 enrich)")
build_data_v2 = _import("build_data_v2", f"{ROOT}/mockup_v2/build_data.py")
build_data_v2.main()

# 4) Read final payload back out
with open(f"{ROOT}/mockup_v2/data.js", "r", encoding="utf-8") as f:
    raw = f.read()
PREFIX = "window.SDWAN_DATA = "
i = raw.find(PREFIX)
assert i == 0, f"Unexpected data.js header: {raw[:60]!r}"
RESULT = raw[len(PREFIX):].rstrip().rstrip(";")
print("✓ pipeline complete")
RESULT
`;
  }

  async function runPipeline(py) {
    setProgressLabel("Running pipeline…");
    setProgressFill(75);
    const exclusions = getRuntimeExclusions();
    const result = await py.runPythonAsync(buildPipelinePy(exclusions));
    if (typeof result !== "string") {
      throw new Error("Pipeline returned non-string payload");
    }
    return result;
  }

  // ================================================================
  // Run button
  // ================================================================
  async function handleRun() {
    if (state.running) return;
    if (!state.files.intern || !state.files.sprint) return;

    state.running = true;
    runBtn().disabled = true;
    progressBox().classList.remove("err");
    showProgress();

    try {
      const py = await ensurePyodide();
      await stageStaticAssets(py);
      await stageUploads(py);
      const payloadJson = await runPipeline(py);

      setProgressLabel("Saving payload…");
      setProgressFill(95);

      try {
        localStorage.setItem(STORAGE_KEY, payloadJson);
        // Upload supersedes any previous "cleared" state.
        localStorage.removeItem(CLEARED_KEY);
      } catch (e) {
        appendLog("⚠ localStorage write failed: " + e.message);
        throw new Error("Could not persist the result (storage full or unavailable).");
      }

      setProgressFill(100);
      setProgressLabel("Reloading dashboard…");
      // Brief pause so the user reads the success state.
      setTimeout(() => window.location.reload(), 350);
    } catch (err) {
      console.error("[upload-loader]", err);
      appendLog("✗ " + (err && err.message ? err.message : String(err)));
      flashError("Pipeline failed — see log");
      state.running = false;
      updateRunButton();
    }
  }

  function bindRunButton() {
    const btn = runBtn();
    if (btn) btn.addEventListener("click", handleRun);
  }

  // ================================================================
  // Boot
  // ================================================================
  function boot() {
    refreshSourceBadge();
    bindSourceBadgeReset();
    bindModalChrome();
    bindFilePickers();
    bindRunButton();
    bindExclusionsPersistence();
    updateRunButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
