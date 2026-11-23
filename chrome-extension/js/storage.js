const DEFAULTS = {
  vimeoToken: "",
  workerUrl: "",
  migrationSecret: "",
  concurrency: 6,
  publicBaseUrl: "",
};

export async function getSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  return { ...DEFAULTS, ...(data.settings || {}) };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ settings: updated });
  return updated;
}

export async function getCatalog() {
  const data = await chrome.storage.local.get(["catalog"]);
  return data.catalog || [];
}

export async function saveCatalog(catalog) {
  await chrome.storage.local.set({ catalog });
}

export async function getMigrationState() {
  const data = await chrome.storage.local.get(["migrationState"]);
  return data.migrationState || {};
}

export async function updateMigrationItem(vimeoId, record) {
  const state = await getMigrationState();
  state[vimeoId] = record;
  await chrome.storage.local.set({ migrationState: state });
  return state;
}

export async function clearMigrationState() {
  await chrome.storage.local.set({ migrationState: {} });
}
