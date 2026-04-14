# Lil Bloomers Childcare Centre — website

Static site for **Lil Bloomers Childcare Centre** (North Vancouver, BC): programs, team, gallery, contact, and play-based learning content.

## Repository

**GitHub:** [github.com/sarahajati/Lilbloomerschildcare](https://github.com/sarahajati/Lilbloomerschildcare)

## Contents

| Path | Purpose |
| ---- | ------- |
| `index.html` | Main page |
| `styles.css` | Layout and styling |
| `script.js` | Navigation, team & gallery from JSON, contact form submit |
| `config.js` | **Web3Forms** access key (see below) |
| `data/site.json` | Staff groups, roles, photo URLs, and daycare gallery images |
| `admin.html` + `admin.js` + `admin.css` | PIN-protected editor for staff & gallery |
| `admin-config.js` | Admin PIN (change the default) |
| `media/` | Optional: commit photos here and reference `/media/...` in `site.json` |

## Contact form → your email

Messages are sent through **[Web3Forms](https://web3forms.com/)** (free tier: create an account, add your email, copy the **Access Key**).

1. Open `config.js`.
2. Set `web3formsAccessKey` to your key (keep the quotes).
3. In the Web3Forms dashboard you can restrict submissions by **domain** (recommended): `lilbloomerschildcarecenter.ca`.

The form submits in the browser; you do not need your own mail server.

## Staff photos & daycare gallery

The homepage loads **`data/site.json`**. To update photos or the gallery:

1. Open **`/admin.html`** on your live site (footer link: **Update photos**), or open `admin.html` locally with a static server.
2. Sign in with the PIN from **`admin-config.js`** (change `changeme` to something only staff know).
3. Edit team rows and gallery entries. You can use:
   - **Image URL** — e.g. commit files under `media/gallery/` or `media/staff/` in GitHub and use paths like `/media/staff/ali.jpg`, or any `https://…` direct image link.
   - **Small file upload** in the admin UI — images are compressed and stored as **data URLs** inside JSON (fine for a few staff shots; for many large photos, prefer files in `media/` + URL).
4. Click **Download site.json**, then in GitHub replace **`data/site.json`** with the downloaded file, **commit**, and **push**. Cloudflare will redeploy from Git.

**Stronger access control:** add [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) for `/admin.html` so only invited people can open the page (the PIN alone is only light protection).

## Run locally

```powershell
cd "path\to\Daycare"
npx --yes serve .
```

Then open the printed URL (include **`/admin.html`** when testing the editor). `config.js` and `data/site.json` must load from the same origin (opening `index.html` as a `file://` URL may block `fetch` for JSON in some browsers—use `serve`).

## Deploy (Cloudflare)

If you use **Git-connected Workers/Pages** with static assets:

- Build: none  
- Output / root: repository root (`index.html` at root)  
- **Custom domain:** attach your domain under the project’s **Custom domains** (do not rely on a random Worker **route** for the same hostname unless you know you need it).

## License

Content reflects publicly stated centre information. Use and branding are subject to the centre’s policies.
