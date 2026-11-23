export const CHUNK_SIZE = 50 * 1024 * 1024;
export const DIRECT_LIMIT = 95 * 1024 * 1024;

export async function callWorker(workerUrl, secret, payload) {
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Worker HTTP ${res.status}`);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export async function multipartUpload(workerUrl, secret, item, customMetadata, onPartProgress) {
  const videoKey = item.r2_video_key;
  const probe = await callWorker(workerUrl, secret, {
    action: "probe_size",
    key: videoKey,
    sourceUrl: item.source.link,
  });
  const totalSize = Number(probe.size || item.source.size);
  const init = await callWorker(workerUrl, secret, {
    action: "init",
    key: videoKey,
    contentType: item.source.type || "video/mp4",
    customMetadata,
  });
  const uploadId = init.uploadId;
  const parts = [];
  let offset = 0;
  let partNumber = 1;
  const totalParts = Math.ceil(totalSize / CHUNK_SIZE);

  try {
    while (offset < totalSize) {
      const end = Math.min(offset + CHUNK_SIZE - 1, totalSize - 1);
      if (onPartProgress) onPartProgress(partNumber, totalParts);
      const partRes = await callWorker(workerUrl, secret, {
        action: "part",
        key: videoKey,
        uploadId,
        partNumber,
        sourceUrl: item.source.link,
        rangeStart: offset,
        rangeEnd: end,
      });
      parts.push({ partNumber, etag: partRes.etag });
      offset = end + 1;
      partNumber += 1;
    }
    return await callWorker(workerUrl, secret, { action: "complete", key: videoKey, uploadId, parts });
  } catch (err) {
    await callWorker(workerUrl, secret, { action: "abort", key: videoKey, uploadId });
    throw err;
  }
}
