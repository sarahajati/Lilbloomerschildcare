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
2. **Settings → Bindings → Add** → **KV Namespace** → variable name **`SITE_DATA`** (must match `worker.js`). Create a new namespace if needed.
3. **Settings → Variables and Secrets** → **Add** → **Secret** → name **`SAVE_TOKEN`**, value = a **long random password** (this is the “save token” staff will type once per browser).
4. Deploy this repo so **`worker.js`** is the Worker entry point and static files use the **`ASSETS`** binding (see [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)). If you deploy via **Git**, pushing `wrangler.toml` + `worker.js` is usually enough once the project is linked.

### Day-to-day (staff)

1. Open **`https://your-domain/admin.html`**, enter the **PIN** from `admin-config.js`.
2. Edit team / gallery (URLs or small image uploads as before).
3. Click **Save to website**. The first time, the browser asks for the **save token** (same value as the **`SAVE_TOKEN`** secret). It is then remembered for that browser until **Forget save token**.
4. Refresh the public homepage — it loads data from **`GET /api/site`** (KV), with fallback to `data/site.json` if KV is empty.

Optional: set `LILBLOOMERS_SAVE_TOKEN` in `admin-config.js` to the same string as `SAVE_TOKEN` so trusted browsers skip the prompt (**avoid** in a public Git repo).

### Without cloud setup

**Save to website** returns a clear error until KV + `SAVE_TOKEN` exist. You can still use **Download site.json** and replace `data/site.json` in GitHub.

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

## License

Content reflects publicly stated centre information. Use and branding are subject to the centre’s policies.
