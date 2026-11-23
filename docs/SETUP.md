# Detailed Setup Guide: Vimeo → Cloudflare R2 Migrator

This guide walks through configuring **Vimeo**, **Cloudflare R2**, and **Cloudflare Workers** from scratch so the Chrome/Brave extension can stream your video library edge-to-edge.

---

## Step 1: Create Your Vimeo Access Token

To export raw `.mp4` download links from Vimeo's API, your Vimeo account must have access to its own video files (Pro, Business, Premium, Standard, or Advanced) and your token must include the `video_files` scope.

1. Log in to [developer.vimeo.com/apps](https://developer.vimeo.com/apps) and click **Create an app**.
2. Fill in any App Name (e.g., `R2 Migrator`) and Description, then click **Create App**.
3. In the left navigation menu under **Authentication**, click **Generate Access Token**.
4. Select **Authenticated (you)**.
5. Check the following scopes:
   - [x] `Public`
   - [x] `Private`
   - [x] `Video Files` *(Mandatory — without this scope, Vimeo returns `download: null`)*
6. Click **Generate** and copy the token.

---

## Step 2: Create Your Cloudflare R2 Bucket & Worker

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com) and go to **R2 Object Storage**.
2. Click **Create bucket**, give it a name (e.g., `fireside-chats`), and click **Create bucket**.
3. In the left sidebar, go to **Compute (Workers)** → **Workers & Pages** → **Create**.
4. Click **Create Worker**, name it `vimeo-r2-migrator`, and click **Deploy**.
5. Click **Edit code** (top right):
   - In the Chrome/Brave extension, click **Copy Cloudflare Worker Code** (or copy [`chrome-extension/js/worker-template.js`](../chrome-extension/js/worker-template.js)).
   - Replace the contents of `worker.js` in Cloudflare's editor with the copied Worker script and click **Deploy**.

---

## Step 3: Bind the R2 Bucket & Set `MIGRATION_SECRET`

1. Exit the code editor back to your `vimeo-r2-migrator` Worker overview page and click the **Settings** tab.
2. Under **Bindings**, click **Add** → **R2 bucket**:
   - **Variable name**: `BUCKET` *(must be exact uppercase `BUCKET`)*
   - **R2 bucket**: Select the bucket you created in Step 2.
   - Click **Add binding** / **Deploy**.
3. Under **Variables and Secrets**, click **Add**:
   - In the extension, click **Generate & Copy** next to `Worker Migration Secret (MIGRATION_SECRET)`.
   - Set **Variable name** to `MIGRATION_SECRET`.
   - Paste the copied secret as the **Value** and click **Deploy**.
4. Copy your Worker URL (e.g. `https://vimeo-r2-migrator.<your-subdomain>.workers.dev`) and paste it into the extension.

---

## Output Folder Structure in R2

Every migrated video creates 3 objects inside your R2 bucket plus a master `catalog.json` at the root:

```text
<your-r2-bucket>/
├── catalog.json
└── videos/
    └── <folder-slug>/
        └── <vimeo-id>-<title-slug>/
            ├── video.mp4
            ├── metadata.json
            └── thumbnail.jpg
```
