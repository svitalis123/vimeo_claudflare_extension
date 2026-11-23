export const WORKER_TEMPLATE = `// Cloudflare Worker: Vimeo -> R2 Direct Edge Migrator
// Bind your R2 bucket as "BUCKET" and set secret "MIGRATION_SECRET"
export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return Response.json({ status: "ready" });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const auth = request.headers.get("Authorization");
    if (!env.MIGRATION_SECRET || auth !== \`Bearer \${env.MIGRATION_SECRET}\`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (body.action === "head") {
      const obj = await env.BUCKET.head(body.key);
      return Response.json({ exists: obj !== null, size: obj?.size ?? 0 });
    }
    if (body.action === "bucket_stats") {
      let cursor, totalObjects = 0, videoObjects = 0, totalBytes = 0;
      do {
        const listed = await env.BUCKET.list({ limit: 1000, cursor });
        for (const o of listed.objects) {
          totalObjects++; totalBytes += o.size;
          if (o.key.endsWith("/video.mp4")) videoObjects++;
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      return Response.json({ totalObjects, videoObjects, totalBytes });
    }
    if (body.action === "probe_size") {
      const probe = await fetch(body.sourceUrl, { headers: { Range: "bytes=0-0" } });
      const cr = probe.headers.get("Content-Range") || "";
      const m = cr.match(/\\/(\\d+)$/);
      const size = m ? parseInt(m[1], 10) : parseInt(probe.headers.get("Content-Length") || "0", 10);
      return Response.json({ ok: probe.ok, size });
    }
    if (body.action === "put_json") {
      const obj = await env.BUCKET.put(body.key, JSON.stringify(body.jsonBody, null, 2), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: body.customMetadata,
      });
      return Response.json({ ok: true, key: obj.key, size: obj.size });
    }
    if (body.action === "direct") {
      const up = await fetch(body.sourceUrl);
      if (!up.ok || !up.body) return Response.json({ error: \`Upstream \${up.status}\` }, 502);
      const obj = await env.BUCKET.put(body.key, up.body, {
        httpMetadata: { contentType: body.contentType || "video/mp4" },
        customMetadata: body.customMetadata,
      });
      return Response.json({ ok: true, key: obj.key, size: obj.size });
    }
    if (body.action === "init") {
      const u = await env.BUCKET.createMultipartUpload(body.key, {
        httpMetadata: { contentType: body.contentType || "video/mp4" },
        customMetadata: body.customMetadata,
      });
      return Response.json({ ok: true, uploadId: u.uploadId });
    }
    if (body.action === "part") {
      const up = await fetch(body.sourceUrl, {
        headers: { Range: \`bytes=\${body.rangeStart}-\${body.rangeEnd}\` },
      });
      if ((up.status !== 206 && up.status !== 200) || !up.body) {
        return Response.json({ error: \`Range \${up.status}\` }, 502);
      }
      const u = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
      const p = await u.uploadPart(body.partNumber, up.body);
      return Response.json({ ok: true, partNumber: p.partNumber, etag: p.etag });
    }
    if (body.action === "complete") {
      const u = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
      const obj = await u.complete(body.parts);
      return Response.json({ ok: true, key: obj.key, size: obj.size });
    }
    if (body.action === "abort") {
      const u = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
      await u.abort();
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, 400);
  }
};`;
