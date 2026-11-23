const VIMEO_FIELDS =
  "uri,name,description,link,duration,width,height,created_time,modified_time,release_time,privacy,tags,parent_folder,pictures,download,files";

export function slugify(value) {
  const cleaned = (value || "").trim().toLowerCase().replace(/[^\w\s-]/g, "");
  return cleaned.replace(/[-\s]+/g, "-") || "untitled";
}

export function pickBestSource(video) {
  const downloads = (video.download || []).filter((d) => d.link);
  if (downloads.length > 0) {
    const sourceFiles = downloads.filter((d) => d.quality === "source");
    const pool = sourceFiles.length > 0 ? sourceFiles : downloads;
    const best = pool.reduce((a, b) =>
      Number(b.size || 0) > Number(a.size || 0) ? b : a
    );
    return {
      link: best.link,
      size: Number(best.size || 0),
      width: best.width,
      height: best.height,
      quality: best.quality,
      type: best.type || "video/mp4",
      origin: "download",
    };
  }
  const progressive = (video.files || []).filter(
    (f) => f.link && f.quality !== "hls" && (f.type || "mp4").includes("mp4")
  );
  if (progressive.length > 0) {
    const best = progressive.reduce((a, b) =>
      Number(b.size || 0) > Number(a.size || 0) ? b : a
    );
    return {
      link: best.link,
      size: Number(best.size || 0),
      width: best.width,
      height: best.height,
      quality: best.quality,
      type: best.type || "video/mp4",
      origin: "files",
    };
  }
  return null;
}

export function formatVideoRecord(video) {
  const uri = video.uri || "";
  const vimeoId = uri.split("/").pop();
  const folderName = video.parent_folder?.name || "root";
  const folderSlug = slugify(folderName);
  const title = video.name || `video-${vimeoId}`;
  const titleSlug = slugify(title).slice(0, 80);
  const sizes = video.pictures?.sizes || [];
  const bestThumb =
    sizes.length > 0
      ? sizes.reduce((a, b) => (Number(b.width || 0) > Number(a.width || 0) ? b : a)).link
      : null;
  const r2Prefix = `videos/${folderSlug}/${vimeoId}-${titleSlug}`;
  return {
    vimeo_id: vimeoId,
    uri,
    title,
    description: video.description || "",
    folder_name: folderName,
    folder_slug: folderSlug,
    tags: (video.tags || []).map((t) => t.name).filter(Boolean),
    duration: video.duration || 0,
    width: video.width || 0,
    height: video.height || 0,
    created_time: video.created_time,
    vimeo_link: video.link,
    thumbnail_url: bestThumb,
    source: pickBestSource(video),
    r2_video_key: `${r2Prefix}/video.mp4`,
    r2_meta_key: `${r2Prefix}/metadata.json`,
    r2_thumb_key: `${r2Prefix}/thumbnail.jpg`,
  };
}

export async function verifyVimeoToken(token) {
  const res = await fetch("https://api.vimeo.com/oauth/verify", {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });
  if (!res.ok) throw new Error(`Vimeo auth failed (${res.status})`);
  return res.json();
}
