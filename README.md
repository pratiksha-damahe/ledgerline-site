# Ledgerline marketing site

A hand-built, no-framework marketing site for **Ledgerline** (fictional B2B invoice/approval automation software), built for the Digital Heroes training task.

No page builder, no client-side framework, no CMS. Static HTML + one CSS file + ~25 lines of JS for the mobile nav toggle. A tiny Node build script stitches shared partials into each page at build time.

## 1. Architecture — how a content team extends this without touching layout code

```
/partials/header.html   ← nav + logo, used by every page
/partials/footer.html   ← footer + required credit line, used by every page
/pages/home.html        ← page-specific <head> (title/meta/OG/schema) + <main> content
/pages/product.html
/pages/pricing.html
/pages/contact.html
/pages/_template.html   ← starting point for a 5th page
/css/style.css          ← one shared stylesheet, all design tokens as CSS variables
/js/main.js             ← mobile nav toggle only
build.js                ← stitches partials into pages, outputs static HTML to /dist
```

Each file in `/pages` contains only two things: that page's unique `<head>` (title, meta description, Open Graph tags, JSON-LD) and its `<main>` content. The `{{HEADER}}` and `{{FOOTER}}` tokens get replaced by `build.js` with the shared partials, and the build script also marks the correct nav link `aria-current="page"` based on the filename — so nav highlighting is never hand-maintained per page.

**To add a 5th page**, a content editor:
1. Copies `pages/_template.html` to `pages/new-page.html`
2. Fills in the title, meta description, OG tags, any structured data, and the content inside `<main>`
3. Adds one `<li>` to `partials/header.html` for the nav link (`data-nav="new-page"` matching the filename)
4. Runs `node build.js`

They never touch the header markup, the footer, the CSS, or the nav-toggle JS. Layout and navigation logic live in exactly one place each.

Run the build:
```bash
node build.js
# outputs static HTML + copied /css and /js into /dist
```
`/dist` is what you deploy — point your host at that directory (or, for GitHub Pages, at the repo root if you commit `/dist` as the published branch; see deployment below).

## 2. Accessibility & semantics

- Landmarks: `<header>`, `<nav aria-label="Primary">`, `<main id="main">`, `<footer>` on every page.
- One `<h1>` per page; headings step down without skipping levels (verified programmatically — see `build.js` output / heading audit below).
- Skip link (`Skip to main content`) as the first focusable element on every page.
- Visible focus ring via `:focus-visible` (3px, high contrast) — never removed.
- Mobile nav toggle is a real `<button>` with `aria-expanded`/`aria-controls`, closes on `Escape` and returns focus to the trigger, closes when a link is activated. No `div onclick`.
- FAQ accordions use native `<details>/<summary>` — keyboard and screen-reader operable with zero JS.
- Contact form: every input has a bound `<label>`, related fields are grouped in `<fieldset>/<legend>`, hint text is linked with `aria-describedby`, and required fields use the native `required` attribute.
- `prefers-reduced-motion` is respected globally (smooth scroll and any transition durations collapse to near-zero).
- Color contrast: body text `#12201c` on `#eef1ee` background exceeds 12:1; button and link colors were chosen to clear WCAG AA (4.5:1) at their font sizes — check current numbers with a contrast checker if you change the palette.
- No content is conveyed by color alone (nav's current-page indicator uses both a color change and an underline; the pricing "Most chosen" plan uses a text label, not just a border color).

## 3. Structured data & meta

Every page has: a unique `<title>`, meta description, canonical URL, Open Graph (`og:title`, `og:description`, `og:url`, `og:image` + explicit width/height, `og:type`, `og:site_name`), and Twitter card tags.

JSON-LD per page:
- **Home** — `Organization` (with `sameAs` and a `ContactPoint`) + `FAQPage` (mirrors the visible `<details>` FAQ content — this matters, Google's guidance is that FAQPage markup should match visible page content).
- **Product** — `SoftwareApplication` with an `Offer`.
- **Pricing** — `Product` with an array of `Offer`s, one per plan.
- **Contact** — `ContactPage` with an embedded `Organization`/`ContactPoint`.

Before you rely on this, validate against the live URL (not just the source file) with:
- https://validator.schema.org/
- https://search.google.com/test/rich-results

Replace every `ledgerline.example` URL and the placeholder `og:image` paths with your real deployed domain and generated OG images (1200×630 PNG/JPG, one per page) before submitting — search engines and social platforms will fetch the *live* URL, not this repo.

## 4. Core Web Vitals — what's built in, and how to prove it

This site is designed to hit green CWV on mobile by removing the usual causes of failure rather than optimizing around them after the fact:

| Lever | What's done |
|---|---|
| **LCP** | No web fonts (system font stack only — zero extra network round trips, zero render-blocking font requests). No hero image; the hero's visual is a ~40-line inline SVG-free CSS shape (the "stamp"), so there's no large image to wait on. One stylesheet, no render-blocking JS in `<head>` (`main.js` is `defer`red). |
| **CLS** | No web fonts means no font-swap layout shift. No images without explicit space (this build ships no raster images by default — if you add photography/OG art, set `width`/`height` or `aspect-ratio` on every `<img>`). Sticky header height is fixed, doesn't reflow content on scroll. |
| **INP** | Minimal JS (~25 lines, one listener set, no framework hydration, nothing runs on scroll). Native `<details>` for FAQs instead of a JS accordion library. |
| **Requests** | Per page: 1 HTML document, 1 CSS file, 1 JS file. No third-party scripts, no analytics beacon, no icon font, no web font. |

**To generate the evidence the task asks for**, after you deploy (see below):
1. Run https://pagespeed.web.dev/ against your live URL for **each of the 4 pages**, mobile strategy, and screenshot/export the Core Web Vitals (LCP, INP, CLS) plus the Lighthouse category scores.
2. Or run Lighthouse locally: `npx lighthouse https://your-domain/ --view --preset=mobile` (repeat per page), and export the HTML report.
3. Attach both the PageSpeed screenshots and the Lighthouse reports (or a link to `web.dev/measure` results) to your submission alongside the live URL.

I can't generate real Lighthouse/PageSpeed numbers here — those tools measure an actually-deployed, publicly reachable URL, which only exists once you've pushed this to a host. Everything above is what the build does to make those numbers come out green; the report itself has to come from your live deployment.

## 5. Deploy it (pick one)

**GitHub Pages (simplest, matches the "public GitHub repo" deliverable):**

This repo includes `.github/workflows/deploy.yml`, which runs `node build.js` and publishes `/dist` on every push to `main` — you don't need to build or push `/dist` yourself.

```bash
git init
git add .
git commit -m "Ledgerline marketing site"
git branch -M main
git remote add origin https://github.com/<you>/ledgerline-site.git
git push -u origin main
```
Then in the repo **Settings → Pages**, set **Source** to **GitHub Actions** (not "Deploy from a branch"). The workflow will run automatically and your live URL will be `https://<you>.github.io/ledgerline-site/`.

One thing to fix once you know that URL: it will be served from a subpath (`/ledgerline-site/`), but every page here links with root-relative paths (`/css/style.css`, `/product.html`, etc.), which assumes a custom domain or an apex-level Pages URL. Either add a custom domain in Pages settings, or set `og:url`/`canonical` to the subpath and add `<base href="/ledgerline-site/">` — otherwise internal links and asset paths will 404 on GitHub Pages' default subpath. Netlify/Vercel below don't have this problem.

**Netlify / Vercel (drag-and-drop or CLI, arguably faster):**
- Build command: `node build.js`
- Publish directory: `dist`
Both give you a live HTTPS URL immediately on push, plus their own (optional) Lighthouse CI integration you can screenshot as extra evidence.

## 6. Before you submit

- [ ] Replace `ledgerline.example` with your real deployed domain in every `<link rel="canonical">`, every `og:url`/`og:image`, `robots.txt`, and `sitemap.xml`.
- [ ] Generate 4 real OG images (1200×630) or point `og:image` at real screenshots.
- [ ] Run PageSpeed Insights (mobile) on all 4 live pages, save screenshots.
- [ ] Validate JSON-LD on the live URL via Rich Results Test.
- [ ] Confirm the footer credit line renders and links to `digitalheroesco.com` on all 4 pages (it's in `partials/footer.html`, shared — already done, just confirm after deploy).
