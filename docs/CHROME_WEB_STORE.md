# Publishing to the Chrome Web Store (Works for Both Chrome & Brave)

Brave uses the **Chrome Web Store** natively, so publishing once to the Chrome Web Store allows both Chrome and Brave users to install the extension in one click.

---

## 1. File to Upload
Upload **`chrome-web-store-upload.zip`** (located in the root of this repository) to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
- Unlike `vimeo-cloudflare-r2-extension.zip` (which wraps the files inside a `chrome-extension/` folder for manual GitHub downloaders), `chrome-web-store-upload.zip` has `manifest.json` at the root level as required by Google.

---

## 2. Copy-Paste Answers for the "Privacy Practices" Tab

### Single Purpose Description
> Allows users to scan their Vimeo video library and migrate or back up their video files (.mp4), thumbnails, and metadata directly to their own Cloudflare R2 storage bucket via a Cloudflare Worker.

### Permission Justifications

- **`storage`**:
  > Stores the user's configuration (Vimeo access token, Cloudflare Worker URL, and Worker secret) and per-video migration progress locally in `chrome.storage.local`. Credentials never leave the user's browser except to authenticate directly with `api.vimeo.com` and the user's own Cloudflare Worker.
- **`unlimitedStorage`**:
  > Allows storing large video catalog manifests (e.g., 1,000+ video metadata records and transfer receipts) in `chrome.storage.local` without hitting the 10 MB quota during bulk migrations.
- **`sidePanel`**:
  > Enables opening the migration dashboard in the Chrome/Brave Side Panel so users can monitor transfer progress alongside their Vimeo or Cloudflare tabs.
- **`host_permissions` (`https://api.vimeo.com/*`, `https://*.workers.dev/*`, `https://*.vimeocdn.com/*`)**:
  > Required to query the user's video catalog from the official Vimeo API (`api.vimeo.com`), render video thumbnails (`*.vimeocdn.com`), and dispatch edge-to-edge multipart transfer commands to the user's Cloudflare Worker (`*.workers.dev`).
- **`optional_host_permissions` (`https://*/*`)**:
  > Requested dynamically only if the user enters a custom domain for their Cloudflare Worker instead of a standard `*.workers.dev` subdomain.

### Data Usage Certification
- Check **"No, I do not collect any user data"** (all tokens and metadata stay locally in `chrome.storage.local` and communicate strictly between the user's browser, `api.vimeo.com`, and the user's own Cloudflare Worker).
- **Privacy Policy URL**:
  `https://github.com/svitalis123/vimeo_claudflare_extension/blob/main/PRIVACY_POLICY.md`
