import { formatVideoRecord } from "./vimeo.js";

const VIMEO_FIELDS =
  "uri,name,description,link,duration,width,height,created_time,modified_time,release_time,privacy,tags,parent_folder,pictures,download,files";

export async function fetchAllVimeoVideos(token, onProgress) {
  const catalog = [];
  let page = 1;
  while (true) {
    const url = `https://api.vimeo.com/me/videos?per_page=100&page=${page}&fields=${encodeURIComponent(VIMEO_FIELDS)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    });
    if (!res.ok) {
      throw new Error(`Vimeo API error ${res.status} on page ${page}`);
    }
    const payload = await res.json();
    const batch = (payload.data || []).map(formatVideoRecord);
    catalog.push(...batch);
    const total = payload.total || catalog.length;
    if (onProgress) onProgress({ loaded: catalog.length, total, page });
    if (!payload.paging?.next || batch.length === 0) break;
    page += 1;
  }
  return catalog;
}

export async function fetchSingleVimeoVideo(token, vimeoId) {
  const url = `https://api.vimeo.com/videos/${vimeoId}?fields=${encodeURIComponent(VIMEO_FIELDS)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh video ${vimeoId}: HTTP ${res.status}`);
  }
  return formatVideoRecord(await res.json());
}
