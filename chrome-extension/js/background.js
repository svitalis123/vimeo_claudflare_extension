import { getCatalog, getMigrationState, getSettings, saveCatalog, updateMigrationItem } from "./storage.js";
import { fetchAllVimeoVideos, fetchSingleVimeoVideo } from "./vimeo-scanner.js";
import { callWorker } from "./worker-api.js";
import { transferVideoToR2 } from "./worker-transfer.js";

const runState = {
  isScanning: false, scanProgress: { loaded: 0, total: 0, page: 0 },
  isMigrating: false, cancelRequested: false, totalToMigrate: 0,
  completedCount: 0, failedCount: 0, activeVideos: {}, lastError: null,
};

const broadcastState = () => chrome.runtime.sendMessage({ type: "STATE_UPDATE", state: runState }).catch(() => {});

async function handleScanCatalog() {
  if (runState.isScanning) return;
  const settings = await getSettings();
  if (!settings.vimeoToken) return;
  Object.assign(runState, { isScanning: true, lastError: null });
  broadcastState();
  try {
    const catalog = await fetchAllVimeoVideos(settings.vimeoToken, (prog) => {
      runState.scanProgress = prog;
      broadcastState();
    });
    await saveCatalog(catalog);
  } catch (err) {
    runState.lastError = err.message;
  } finally {
    runState.isScanning = false;
    broadcastState();
  }
}

async function runWithAutoRefresh(settings, item, onPart) {
  try {
    return await transferVideoToR2(settings.workerUrl, settings.migrationSecret, item, onPart);
  } catch (firstErr) {
    if (!settings.vimeoToken) throw firstErr;
    const fresh = await fetchSingleVimeoVideo(settings.vimeoToken, item.vimeo_id);
    return transferVideoToR2(settings.workerUrl, settings.migrationSecret, fresh, onPart);
  }
}

async function handleStartMigration(selectedIds) {
  if (runState.isMigrating) return;
  const [settings, catalog, migState] = await Promise.all([getSettings(), getCatalog(), getMigrationState()]);
  if (!settings.workerUrl || !settings.migrationSecret) return;
  const idSet = selectedIds ? new Set(selectedIds) : null;
  const queue = catalog.filter((i) => i.source?.link && (!idSet || idSet.has(i.vimeo_id)) && migState[i.vimeo_id]?.status !== "done");
  Object.assign(runState, {
    isMigrating: true, cancelRequested: false, totalToMigrate: queue.length,
    completedCount: 0, failedCount: 0, activeVideos: {}, lastError: null,
  });
  broadcastState();
  const concurrency = Math.max(1, Math.min(15, Number(settings.concurrency || 6)));
  let index = 0;
  async function workerLoop() {
    while (!runState.cancelRequested && index < queue.length) {
      const item = queue[index++];
      const vid = item.vimeo_id;
      runState.activeVideos[vid] = { title: item.title, progress: "Starting..." };
      broadcastState();
      try {
        const res = await runWithAutoRefresh(settings, item, (p, t) => {
          runState.activeVideos[vid] = { title: item.title, progress: `Part ${p}/${t}` };
          broadcastState();
        });
        await updateMigrationItem(vid, { status: "done", key: item.r2_video_key, size: res.size });
        runState.completedCount += 1;
      } catch (err) {
        await updateMigrationItem(vid, { status: "failed", error: err.message });
        runState.failedCount += 1;
      } finally {
        delete runState.activeVideos[vid];
        broadcastState();
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
  if (!runState.cancelRequested && queue.length > 0) {
    const manifest = catalog.map(({ source, ...rest }) => rest);
    await callWorker(settings.workerUrl, settings.migrationSecret, { action: "put_json", key: "catalog.json", jsonBody: manifest })
      .catch((err) => { runState.lastError = err.message; });
  }
  runState.isMigrating = false;
  broadcastState();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATE") sendResponse({ state: runState });
  else if (msg.type === "SCAN_CATALOG") { handleScanCatalog(); sendResponse({ ok: true }); }
  else if (msg.type === "START_MIGRATION") { handleStartMigration(msg.selectedIds || null); sendResponse({ ok: true }); }
  else if (msg.type === "STOP_MIGRATION") { runState.cancelRequested = true; broadcastState(); sendResponse({ ok: true }); }
  return false;
});
