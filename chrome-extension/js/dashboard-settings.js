import { renderSetupGuide } from "./setup-guide.js";
import { getSettings, saveSettings } from "./storage.js";
import { verifyVimeoToken } from "./vimeo.js";
import { callWorker } from "./worker-api.js";
import { WORKER_TEMPLATE } from "./worker-template.js";

export async function loadSettingsForm() {
  const settings = await getSettings();
  document.getElementById("inpVimeoToken").value = settings.vimeoToken;
  document.getElementById("inpWorkerUrl").value = settings.workerUrl;
  document.getElementById("inpMigrationSecret").value = settings.migrationSecret;
  document.getElementById("inpConcurrency").value = settings.concurrency || 6;

  const guideEl = document.getElementById("setupGuideContainer");
  renderSetupGuide(guideEl);
  if (!settings.vimeoToken || !settings.workerUrl || !settings.migrationSecret) {
    guideEl.classList.remove("hidden");
  }
}

export function bindSettingsActions() {
  const feedback = document.getElementById("settingsFeedback");
  const badge = document.getElementById("bucketBadge");
  const guideEl = document.getElementById("setupGuideContainer");
  const toggleGuide = () => {
    document.getElementById("settingsPanel").classList.remove("hidden");
    guideEl.classList.toggle("hidden");
  };

  document.getElementById("btnToggleGuide").addEventListener("click", toggleGuide);
  document.getElementById("btnInlineGuide").addEventListener("click", toggleGuide);
  document.getElementById("btnToggleSettings").addEventListener("click", () => {
    document.getElementById("settingsPanel").classList.toggle("hidden");
  });

  document.getElementById("btnGenSecret").addEventListener("click", async () => {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const secret = "r2mig_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const inp = document.getElementById("inpMigrationSecret");
    inp.type = "text";
    inp.value = secret;
    await navigator.clipboard.writeText(secret);
    feedback.textContent = "Generated & copied secret! Paste it into Cloudflare Worker -> Settings -> Variables (MIGRATION_SECRET).";
  });

  document.getElementById("btnSaveSettings").addEventListener("click", async () => {
    feedback.textContent = "Testing connections...";
    const saved = await saveSettings({
      vimeoToken: document.getElementById("inpVimeoToken").value.trim(),
      workerUrl: document.getElementById("inpWorkerUrl").value.trim(),
      migrationSecret: document.getElementById("inpMigrationSecret").value.trim(),
      concurrency: Number(document.getElementById("inpConcurrency").value || 6),
    });
    try {
      const workerOrigin = new URL(saved.workerUrl).origin + "/*";
      if (!saved.workerUrl.includes(".workers.dev") && chrome.permissions?.request) {
        await chrome.permissions.request({ origins: [workerOrigin] });
      }
      const vimeoInfo = await verifyVimeoToken(saved.vimeoToken);
      const workerRes = await fetch(saved.workerUrl);
      const workerJson = await workerRes.json();
      badge.textContent = `Connected: ${workerJson.bucket || "R2"}`;
      badge.className = "pill pill-ok";
      feedback.textContent = `Vimeo (${vimeoInfo.user?.name || "OK"}, scopes: ${vimeoInfo.scope}) & Worker verified!`;
    } catch (err) {
      badge.textContent = "Connection Error";
      badge.className = "pill pill-err";
      feedback.textContent = err.message;
    }
  });

  document.getElementById("btnCheckR2Stats").addEventListener("click", async () => {
    const s = await getSettings();
    const el = document.getElementById("statLiveR2");
    el.textContent = "Querying R2...";
    try {
      const stats = await callWorker(s.workerUrl, s.migrationSecret, { action: "bucket_stats", key: "" });
      el.textContent = `${stats.videoObjects} videos | ${(stats.totalBytes / 1000 ** 3).toFixed(2)} GB`;
    } catch (err) {
      el.textContent = `Error: ${err.message}`;
    }
  });

  document.getElementById("btnCopyWorkerCode").addEventListener("click", async () => {
    await navigator.clipboard.writeText(WORKER_TEMPLATE);
    feedback.textContent = "Cloudflare Worker code copied to clipboard!";
  });
}
