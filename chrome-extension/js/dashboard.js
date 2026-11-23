import { bindSettingsActions, loadSettingsForm } from "./dashboard-settings.js";
import { getCatalog, getMigrationState } from "./storage.js";
import { filterCatalog, populateFolderSelect, renderVideoRows } from "./table-renderer.js";

let catalogData = [];
let migrationState = {};
const selectedIds = new Set();

const tbody = document.getElementById("videoTableBody");
const selFolder = document.getElementById("selFolder");
const selStatus = document.getElementById("selStatus");
const inpSearch = document.getElementById("inpSearch");

async function initDashboard() {
  await loadSettingsForm();
  bindSettingsActions();
  await reloadData();
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (res?.state) renderLiveBanner(res.state);
  });
}

async function reloadData() {
  [catalogData, migrationState] = await Promise.all([getCatalog(), getMigrationState()]);
  populateFolderSelect(selFolder, catalogData);
  const totalBytes = catalogData.reduce((s, c) => s + Number(c.source?.size || 0), 0);
  const doneCount = Object.values(migrationState).filter((m) => m.status === "done").length;
  document.getElementById("statCatalogCount").textContent = `${catalogData.length.toLocaleString()} videos (${(
    totalBytes / 1024 ** 3
  ).toFixed(2)} GB)`;
  document.getElementById("statMigratedCount").textContent = `${doneCount.toLocaleString()} / ${catalogData.length.toLocaleString()}`;
  refreshTable();
}

function getFilteredList() {
  return filterCatalog(catalogData, migrationState, inpSearch.value, selFolder.value, selStatus.value);
}

function refreshTable() {
  renderVideoRows(tbody, getFilteredList(), migrationState, selectedIds, (id, checked) => {
    if (checked) selectedIds.add(id);
    else selectedIds.delete(id);
  });
}

function renderLiveBanner(state) {
  const banner = document.getElementById("liveBanner");
  const stopBtn = document.getElementById("btnStopMigration");
  if (!state.isScanning && !state.isMigrating) {
    banner.classList.add("hidden");
    stopBtn.classList.add("hidden");
    return;
  }
  banner.classList.remove("hidden");
  stopBtn.classList.toggle("hidden", !state.isMigrating);

  const titleEl = document.getElementById("liveBannerTitle");
  const countEl = document.getElementById("liveBannerCounts");
  const barEl = document.getElementById("liveBannerBar");
  const activeEl = document.getElementById("activeWorkersList");

  if (state.isScanning) {
    titleEl.textContent = "Scanning Vimeo Video Catalog...";
    countEl.textContent = `${state.scanProgress.loaded} / ${state.scanProgress.total || "?"}`;
    barEl.style.width = `${state.scanProgress.total ? (state.scanProgress.loaded / state.scanProgress.total) * 100 : 50}%`;
    activeEl.innerHTML = "";
  } else if (state.isMigrating) {
    const done = state.completedCount + state.failedCount;
    titleEl.textContent = `Migrating Videos to R2 (${state.failedCount} failed)`;
    countEl.textContent = `${done} / ${state.totalToMigrate}`;
    barEl.style.width = `${state.totalToMigrate ? (done / state.totalToMigrate) * 100 : 0}%`;
    activeEl.innerHTML = Object.entries(state.activeVideos || {})
      .map(([, info]) => `<span class="active-chip">${info.title.slice(0, 32)} (${info.progress})</span>`)
      .join("");
  }
}

document.getElementById("btnScanVimeo").addEventListener("click", () => chrome.runtime.sendMessage({ type: "SCAN_CATALOG" }));
document.getElementById("btnMigrateSelected").addEventListener("click", () => {
  const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : getFilteredList().map((i) => i.vimeo_id);
  chrome.runtime.sendMessage({ type: "START_MIGRATION", selectedIds: targetIds });
});
document.getElementById("btnStopMigration").addEventListener("click", () => chrome.runtime.sendMessage({ type: "STOP_MIGRATION" }));
document.getElementById("btnExportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vimeo_r2_catalog.json";
  a.click();
});
document.getElementById("chkSelectAll").addEventListener("change", (e) => {
  getFilteredList().forEach((i) => (e.target.checked ? selectedIds.add(i.vimeo_id) : selectedIds.delete(i.vimeo_id)));
  refreshTable();
});
[inpSearch, selFolder, selStatus].forEach((el) => el.addEventListener("input", refreshTable));
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") { renderLiveBanner(msg.state); reloadData(); }
});

initDashboard();
