import { getCatalog, getMigrationState, getSettings } from "./storage.js";

const connStatus = document.getElementById("connStatus");
const popTotalVideos = document.getElementById("popTotalVideos");
const popMigratedVideos = document.getElementById("popMigratedVideos");
const popTotalSize = document.getElementById("popTotalSize");
const popLiveBox = document.getElementById("popLiveBox");
const popLiveTitle = document.getElementById("popLiveTitle");
const popLiveCount = document.getElementById("popLiveCount");
const popProgressBar = document.getElementById("popProgressBar");

async function refreshPopup() {
  const [settings, catalog, migState] = await Promise.all([
    getSettings(),
    getCatalog(),
    getMigrationState(),
  ]);

  const configured = Boolean(settings.vimeoToken && settings.workerUrl && settings.migrationSecret);
  connStatus.textContent = configured ? "Ready" : "Setup Needed";
  connStatus.className = `pill ${configured ? "pill-ok" : "pill-warn"}`;

  const totalBytes = catalog.reduce((acc, c) => acc + Number(c.source?.size || 0), 0);
  const doneCount = Object.values(migState).filter((m) => m.status === "done").length;

  popTotalVideos.textContent = catalog.length.toLocaleString();
  popMigratedVideos.textContent = doneCount.toLocaleString();
  popTotalSize.textContent = `${(totalBytes / 1024 ** 3).toFixed(1)} GB`;

  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (res?.state) renderRunState(res.state);
  });
}

function renderRunState(state) {
  if (state.isScanning) {
    popLiveBox.classList.remove("hidden");
    popLiveTitle.textContent = "Scanning Vimeo...";
    popLiveCount.textContent = `${state.scanProgress.loaded} / ${state.scanProgress.total || "?"}`;
    const pct = state.scanProgress.total
      ? Math.round((state.scanProgress.loaded / state.scanProgress.total) * 100)
      : 50;
    popProgressBar.style.width = `${pct}%`;
  } else if (state.isMigrating) {
    popLiveBox.classList.remove("hidden");
    popLiveTitle.textContent = "Migrating to R2...";
    const done = state.completedCount + state.failedCount;
    popLiveCount.textContent = `${done} / ${state.totalToMigrate}`;
    const pct = state.totalToMigrate ? Math.round((done / state.totalToMigrate) * 100) : 0;
    popProgressBar.style.width = `${pct}%`;
  } else {
    popLiveBox.classList.add("hidden");
  }
}

document.getElementById("btnOpenSidePanel").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    window.close();
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }
});

document.getElementById("btnOpenDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") {
    renderRunState(msg.state);
    refreshPopup();
  }
});

refreshPopup();
