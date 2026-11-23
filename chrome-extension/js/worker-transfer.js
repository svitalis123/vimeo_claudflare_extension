import { DIRECT_LIMIT, callWorker, multipartUpload } from "./worker-api.js";

export async function transferVideoToR2(workerUrl, secret, item, onPartProgress) {
  if (!item.source?.link) {
    throw new Error("Missing download link (requires Vimeo video_files scope)");
  }
  const videoKey = item.r2_video_key;
  const customMetadata = {
    vimeo_id: String(item.vimeo_id),
    title: (item.title || "").slice(0, 200),
    folder: (item.folder_name || "root").slice(0, 100),
  };

  const head = await callWorker(workerUrl, secret, { action: "head", key: videoKey });
  if (head.exists && head.size > 0) {
    return { status: "skipped_existing", key: videoKey, size: head.size };
  }

  let result;
  if (item.source.size > 0 && item.source.size <= DIRECT_LIMIT) {
    result = await callWorker(workerUrl, secret, {
      action: "direct",
      key: videoKey,
      sourceUrl: item.source.link,
      contentType: item.source.type || "video/mp4",
      customMetadata,
    });
  } else {
    result = await multipartUpload(workerUrl, secret, item, customMetadata, onPartProgress);
  }

  const { source, ...metaDoc } = item;
  await callWorker(workerUrl, secret, {
    action: "put_json",
    key: item.r2_meta_key,
    jsonBody: metaDoc,
    customMetadata,
  });
  if (item.thumbnail_url) {
    await callWorker(workerUrl, secret, {
      action: "direct",
      key: item.r2_thumb_key,
      sourceUrl: item.thumbnail_url,
      contentType: "image/jpeg",
      customMetadata,
    });
  }
  return result;
}
