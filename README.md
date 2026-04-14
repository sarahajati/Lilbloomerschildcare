# Lil Bloomers Childcare Centre — website

Static one-page site for **Lil Bloomers Childcare Centre** (North Vancouver, BC): programs, team, contact, and play-based learning content.

## Repository

**GitHub:** [github.com/sarahajati/Lilbloomerschildcare](https://github.com/sarahajati/Lilbloomerschildcare)

## Contents

| File        | Purpose                          |
| ----------- | -------------------------------- |
| `index.html`| Page structure and copy          |
| `styles.css`| Layout, typography, responsive UI|
| `script.js` | Mobile nav + footer year         |

## Run locally

Open `index.html` in a browser, or from this folder:

```powershell
start index.html
```

For a local server (optional):

```powershell
npx --yes serve .
```

Then visit the URL shown in the terminal (often `http://localhost:3000`).

## Deploy on Cloudflare Pages

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository and branch **`main`**.
3. **Build settings:** framework preset **None**, build command **empty**, output directory **`/`** (repository root so `index.html` is at the site root).
4. Under the project → **Custom domains** → add your domain (e.g. `lilbloomerschildcarecenter.ca`).

Avoid putting a **Worker** route on the same hostname unless you intend to intercept traffic; use **Pages → Custom domains** for the main site.

## Notes

- The contact form is **demo-only**; connect it to a form backend or service when you go live.
- Update social links in `index.html` when you have the official profiles.

## License

Content reflects publicly stated centre information. Use and branding are subject to the centre’s policies.
