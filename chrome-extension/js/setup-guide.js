import { WORKER_TEMPLATE } from "./worker-template.js";

export function renderSetupGuide(containerEl) {
  containerEl.innerHTML = `
    <div class="guide-grid">
      <div class="guide-step">
        <div class="guide-step-head"><span class="step-num">1</span><strong>Get Vimeo Access Token</strong></div>
        <ol class="guide-list">
          <li>Open <a href="https://developer.vimeo.com/apps/new" target="_blank" rel="noreferrer">developer.vimeo.com/apps</a> and click <b>Create an app</b>.</li>
          <li>In your app page, click <b>Generate Access Token</b> on the left menu.</li>
          <li>Select <b>Authenticated (you)</b>.</li>
          <li>Under Scopes, check <code>Public</code>, <code>Private</code>, and <b><code>Video Files</code></b> (required for MP4 download links).</li>
          <li>Click <b>Generate</b> and paste the token above.</li>
        </ol>
      </div>

      <div class="guide-step">
        <div class="guide-step-head"><span class="step-num">2</span><strong>Get Cloudflare Worker URL</strong></div>
        <ol class="guide-list">
          <li>In <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">Cloudflare Dashboard</a> → <b>R2 Object Storage</b>, create your bucket (e.g. <code>fireside-chats</code>).</li>
          <li>Go to <b>Compute (Workers)</b> → <b>Workers & Pages</b> → <b>Create Worker</b> → name it <code>vimeo-r2-migrator</code> and click <b>Deploy</b>.</li>
          <li>Click <b>Edit code</b>, replace everything with our Worker code (<button type="button" id="btnGuideCopyCode" class="link-btn">Copy Worker Code</button>), and click <b>Deploy</b>.</li>
          <li>Go to Worker <b>Settings → Bindings → Add → R2 bucket</b>: set Variable name to <b><code>BUCKET</code></b> and select your R2 bucket.</li>
          <li>Copy your Worker's <code>https://vimeo-r2-migrator.&lt;subdomain&gt;.workers.dev</code> URL and paste it above.</li>
        </ol>
      </div>

      <div class="guide-step">
        <div class="guide-step-head"><span class="step-num">3</span><strong>Create Worker Migration Secret</strong></div>
        <ol class="guide-list">
          <li>This is a password you invent so only your extension can trigger uploads to your Worker.</li>
          <li>Click <b>Generate Random Secret</b> next to the input above (or type any strong secret) and copy it.</li>
          <li>In Cloudflare Dashboard → your Worker → <b>Settings → Variables and Secrets → Add</b>:</li>
          <li>Set Type to <b>Secret</b> (or Text), Variable name to <b><code>MIGRATION_SECRET</code></b>, paste the exact same secret value, and click <b>Deploy</b>.</li>
        </ol>
      </div>
    </div>
  `;

  containerEl.querySelector("#btnGuideCopyCode")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(WORKER_TEMPLATE);
    const feedback = document.getElementById("settingsFeedback");
    if (feedback) feedback.textContent = "Cloudflare Worker code copied to clipboard!";
  });
}
