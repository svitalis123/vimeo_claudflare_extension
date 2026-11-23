# Privacy Policy — Vimeo to Cloudflare R2 Migrator

**Last Updated:** November 2026

**Vimeo to Cloudflare R2 Migrator** is an open-source browser extension for Google Chrome and Brave. We take privacy and credential security seriously.

## 1. Data We Collect: None
This extension **does not** collect, transmit, log, or sell any personal data, analytics, telemetry, browsing history, or user credentials to the developer or any third party.

## 2. How Your Credentials and Data Are Handled
- **Local Storage Only (`chrome.storage.local`)**: Your Vimeo Access Token, Cloudflare Worker URL, Worker Migration Secret (`MIGRATION_SECRET`), and video catalog state are stored strictly inside your own browser's local extension storage (`chrome.storage.local`).
- **Direct User-to-Account Communication**:
  - The extension communicates directly from your browser to the official Vimeo API (`https://api.vimeo.com`) using your Vimeo Access Token to list your video catalog and retrieve signed download links.
  - The extension sends migration jobs directly to the Cloudflare Worker URL (`https://*.workers.dev`) that **you** deploy and control in your own Cloudflare account.
  - Video files stream directly from Vimeo's CDN to your Cloudflare Worker and into your Cloudflare R2 bucket.

## 3. Third-Party Services
No analytics scripts, tracking pixels, or external servers operated by the extension author are used. All network requests go exclusively to:
1. `https://api.vimeo.com` (Vimeo API)
2. `https://*.vimeocdn.com` (Vimeo thumbnail/video CDN)
3. Your configured Cloudflare Worker endpoint (`https://*.workers.dev` or custom domain you authorize)

## 4. Revoking Access
You can clear your stored tokens at any time by clearing the fields in the extension Settings or uninstalling the extension, and you can revoke your Vimeo token in your Vimeo Developer Portal or delete your Cloudflare Worker in the Cloudflare Dashboard.

## 5. Contact
For questions or issues, please open an issue on GitHub:
https://github.com/svitalis123/vimeo_claudflare_extension/issues
