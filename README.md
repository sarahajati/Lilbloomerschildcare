# Lil Bloomers Childcare Centre — website

Static site for **Lil Bloomers Childcare Centre** (North Vancouver, BC): programs, team, gallery, contact, and play-based learning content.

## Repository

**GitHub:** [github.com/sarahajati/Lilbloomerschildcare](https://github.com/sarahajati/Lilbloomerschildcare)

## Contents

| Path | Purpose |
| ---- | ------- |
| `worker.js` | Cloudflare Worker: serves files + **`/api/site`** (read/write site JSON in KV) |
| `wrangler.toml` | Worker + static assets config (`name` should match your Worker in Cloudflare) |
| `index.html` | Main page |
| `styles.css` | Layout and styling |
| `script.js` | Navigation, team & gallery (loads **`/api/site`** then falls back to `data/site.json`) |
| `config.js` | **Web3Forms** access key |
| `data/site.json` | Default / fallback site data (Git) |
| `admin.html` + `admin.js` + `admin.css` | PIN-protected editor |
| `admin-config.js` | Admin PIN; optional `LILBLOOMERS_SAVE_TOKEN` |
| `media/` | Optional image files referenced by URL |

## Contact form → your email

Use **[Web3Forms](https://web3forms.com/)**: put your **Access Key** in `config.js` as `web3formsAccessKey`, and restrict by domain in the Web3Forms dashboard.

## Staff & gallery — **Save to website** (no GitHub for staff)

After a **one-time** Cloudflare setup, anyone with the **admin PIN** + **save token** can publish changes from **Save to website** without touching GitHub.

### One-time setup (owner)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) open your **Worker** that serves this site (same name as in `wrangler.toml` → `name`, or rename `name` to match your Worker).
2. **KV namespace:** This repo’s `wrangler.toml` binds **`KV`** to your namespace id (so Git deploys keep it). The Worker also accepts **`SITE_DATA`** or **`SAVE_DATA`** if you rename the binding later.
3. **Save token** (pick one place — same string staff type in admin):
   - **Recommended:** Worker → **Variables and Secrets** → **Secret** → name **`save_token`** or **`SAVE_TOKEN`**.
   - **Also supported:** KV → open your namespace → **KV Pairs** → add key **`save_token`** or **`SAVE_TOKEN`** with that password (if you already added it there, redeploy after pulling the latest `worker.js`).

   Do **not** put a leading `=` in the value (spreadsheet quirk); use the raw password only.
4. Deploy this repo so **`worker.js`** is the Worker entry point and static files use the **`ASSETS`** binding (see [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)). If you deploy via **Git**, pushing `wrangler.toml` + `worker.js` is usually enough once the project is linked.

### Day-to-day (staff)

1. Open **`https://your-domain/admin.html`**, enter the **PIN** from `admin-config.js`.
2. Edit team / gallery (URLs or small image uploads as before).
3. Click **Save to website**. The first time, the browser asks for the **save token** (same value as your **`SAVE_TOKEN`** or **`save_token`** secret). It is then remembered for that browser until **Forget save token**.
4. Refresh the public homepage — it loads data from **`GET /api/site`** (KV), with fallback to `data/site.json` if KV is empty.

Optional: set `LILBLOOMERS_SAVE_TOKEN` in `admin-config.js` to the same string as your Cloudflare save secret so trusted browsers skip the prompt (**avoid** in a public Git repo).

### Without cloud setup

**Save to website** returns a clear error until a **KV binding** (`SITE_DATA` or `SAVE_DATA`) and a **save secret** (`SAVE_TOKEN` or `save_token`) exist. You can still use **Download site.json** and replace `data/site.json` in GitHub.

## Run locally

```powershell
cd "path\to\Daycare"
npx --yes serve .
```

Use a local server so `fetch("/api/site")` and JSON paths work. For full Worker behaviour, use `npx wrangler dev`.

## Deploy (Cloudflare)

- Connect this Git repo to the Worker / static asset project.  
- **`wrangler.toml`** `name` must match the Worker name in Cloudflare (or change it to match).  
- Add **custom domain** on the project; avoid extra Worker **routes** on the same hostname unless intended.

### Why KV / bindings “disappear” after a while

Your build uses **`npx wrangler deploy`**. Each deploy applies the Worker config from **`wrangler.toml` + the dashboard only for what Wrangler merges**.

If **KV** (or other bindings) were added **only** under **Worker → Settings → Bindings** in the UI, but **`wrangler.toml` does not declare that same binding**, the next Git deploy can **drop** those UI-only bindings. It is not random Cloudflare decay—it usually happens on the **next push / redeploy**.

**Fix (pick one):**

1. **Recommended:** In `wrangler.toml`, add a **`[[kv_namespaces]]`** block with `binding = "SITE_DATA"` and your namespace **`id`** (UUID from **KV** in the dashboard). See the commented template at the bottom of `wrangler.toml`. Uncomment, paste your real id, commit, push.  
2. **Alternative:** Stop using Git auto-deploy for this Worker and deploy only from the dashboard (not ideal if you want Git as source of truth).

**Secrets** (`save_token`, etc.) added under **Variables and Secrets** can be affected the same way if your deploy pipeline replaces config; keeping secrets in the dashboard is common, but **KV namespace bindings** should live in **`wrangler.toml`** so Git deploys stay consistent.

Also double-check you are not looking at a **preview** deployment vs **production**, or a **different Worker** name, when comparing bindings.

## License

Content reflects publicly stated centre information. Use and branding are subject to the centre’s policies.
