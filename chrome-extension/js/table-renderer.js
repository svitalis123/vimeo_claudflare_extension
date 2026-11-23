export function populateFolderSelect(selectEl, catalog) {
  const current = selectEl.value;
  const counts = {};
  for (const item of catalog) {
    counts[item.folder_name] = (counts[item.folder_name] || 0) + 1;
  }
  const folders = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  selectEl.innerHTML = `<option value="">All Folders (${ folders.length })</option>`;
  for (const [name, count] of folders) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = `${name} (${count})`;
    selectEl.appendChild(opt);
  }
  selectEl.value = current;
}

export function filterCatalog(catalog, migState, query, folder, status) {
  const q = (query || "").trim().toLowerCase();
  return catalog.filter((item) => {
    if (folder && item.folder_name !== folder) return false;
    const itemStatus = !item.source?.link
      ? "no_source"
      : migState[item.vimeo_id]?.status || "pending";
    if (status && itemStatus !== status) return false;
    if (q) {
      const hay = `${item.title} ${item.folder_name} ${item.vimeo_id} ${item.r2_video_key}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderVideoRows(tbody, items, migState, selectedSet, onToggleSelect) {
  tbody.innerHTML = "";
  const slice = items.slice(0, 300);
  for (const item of slice) {
    const tr = document.createElement("tr");
    const sizeMb = ((item.source?.size || 0) / 1024 ** 2).toFixed(1);
    const res = item.width && item.height ? `${item.width}x${item.height}` : "—";
    const st = !item.source?.link
      ? "no_source"
      : migState[item.vimeo_id]?.status || "pending";

    const statusBadge =
      st === "done"
        ? `<span class="pill pill-ok">Migrated</span>`
        : st === "failed"
          ? `<span class="pill pill-err" title="${migState[item.vimeo_id]?.error || ""}">Failed</span>`
          : st === "no_source"
            ? `<span class="pill pill-warn">No File</span>`
            : `<span class="pill pill-muted">Pending</span>`;

    tr.innerHTML = `
      <td><input type="checkbox" class="row-chk" data-id="${item.vimeo_id}" ${
        selectedSet.has(item.vimeo_id) ? "checked" : ""
      } /></td>
      <td>
        <div class="video-cell">
          ${item.thumbnail_url ? `<img src="${item.thumbnail_url}" class="thumb" loading="lazy" />` : ""}
          <div>
            <div class="video-title">${escapeHtml(item.title)}</div>
            <div class="video-sub">ID: ${item.vimeo_id} • ${item.duration}s</div>
          </div>
        </div>
      </td>
      <td><span class="folder-tag">${escapeHtml(item.folder_name)}</span></td>
      <td>${res}<br/><small>${sizeMb} MB</small></td>
      <td><code class="key-code">${escapeHtml(item.r2_video_key)}</code></td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".row-chk").forEach((chk) => {
    chk.addEventListener("change", (e) => {
      onToggleSelect(e.target.dataset.id, e.target.checked);
    });
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
