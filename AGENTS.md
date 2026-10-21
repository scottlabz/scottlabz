# AGENTS.md

Instructions for AI coding agents working in this repo. Follow these exactly. When a rule here conflicts with a chat instruction from Scott, the chat instruction wins.

## Project overview

- Source for scottlabz.com, the production website of Scott Labz, LLC.
- Hand-authored static HTML, CSS, and JS. No framework, no package.json, no build step.
- Hosted on Cloudflare Pages (free plan). Every push to `main` deploys to production. There is no staging branch, so treat every commit as live.
- Cloudflare Pages serves extensionless URLs and 308-redirects `*.html` to them. Canonical tags, internal links, sitemap entries, and JSON manifest URLs all use the extensionless form (`/insights/some-note`, not `/insights/some-note.html`).

## What runs automatically on push to main

Do not do these by hand. CI does them and commits the result. Cloudflare Pages deploys each push on its own (its Git integration, not a GitHub workflow).

| Workflow | When | What it does |
|---|---|---|
| `.github/workflows/sitemap.yml` ("Generate Sitemap & Cache Bust") | Every push | Runs `scripts/generate_indexes.py`, `scripts/generate_sitemap.py`, `scripts/cache_bust.py`, auto-commits ("Auto-update sitemap.xml and asset cache-bust versions"), then `scripts/indexnow_submit.py` |
| `.github/workflows/audit.yml` ("Site Audit") | Pushes that change `.html`, `.js`, or `sitemap.xml` | Runs `scripts/audit_site.py` and `scripts/check_redirect_stubs.py` |
| `.github/workflows/purge-cache.yml` ("Purge Cache") | Pushes that change content file types | Purges the whole Cloudflare cache, then requests every sitemap URL and fails on any non-200 |
| `.github/workflows/codeql.yml` ("CodeQL Advanced") | Every push and pull request, and weekly (Mondays 23:22 UTC) | Code scanning for JavaScript, Python, and the workflow files |
| `.github/workflows/hsts-preload.yml` ("HSTS Preload Check") | Weekly (Mondays 12:30 UTC), not on push | Checks the live `Strict-Transport-Security` header still has `includeSubDomains` and `preload`, checks hstspreload.org eligibility, and submits the domain if it isn't listed yet; fails if it was rejected or lost eligibility |

Site Audit, Purge Cache, and the HSTS check can also be run by hand from the repo's Actions tab.

The bot's auto-commit is deployed by Cloudflare but doesn't trigger these workflows again (pushes made with the workflow token never do). So a push that adds or removes a page shows a failed Site Audit for the expected sitemap reason, and that red X stays on that commit; the next push's audit passes. Any other audit failure is real.

The repo is public, so run results can be read without logging in: `https://api.github.com/repos/scottlabz/scottlabz/actions/runs?per_page=10` (name, commit, and `conclusion` for each run). Check it after a push alongside the live site.

## Never hand-edit generated content

- `sitemap.xml` - regenerated automatically on every push to `main` by `scripts/generate_sitemap.py` and auto-committed. Never add, remove, or edit entries by hand, and never run `generate_sitemap.py` locally and commit the result. Adding or deleting a page is all it takes.
- `?v=` hash query strings on CSS, JS, and image references - set by `scripts/cache_bust.py`. Leave existing hashes alone; CI recomputes them.
- Anything between `START`/`END` marker comments (`FN-CARDS` and `INSIGHT-ROWS` on the Field Notes page, `FN-RELATED` in each Field Note, `CS-CLIENTS`, `CS-CARDS`), plus hub JSON-LD ItemLists.
- Section JSON manifests: `field-notes/field-notes.json`, `insights/insights.json`, `case-studies/case-studies.json`.

To change a card, listing, or manifest entry, edit the `<meta>` tags in the article's own `<head>` (for example `fn-card-title`, `insight-summary`, `cs-order`). The full field list for each section is in the docstring at the top of `scripts/generate_indexes.py`. Read it before adding or editing any article.

Category keys must already exist in `FN_CATEGORIES`, `INSIGHT_CATEGORIES`, or `CS_CATEGORIES` in `scripts/generate_indexes.py` (key and label, plus the card color for case studies); add a new key there first. None of the article lists has a filter bar, search, topic pages, or paging any more (Scott removed them, 2026-10-15), so don't add them back. An Insights row's kicker color is set per key in the Field Notes page's CSS (`.idea-row[data-categories~="..."]`).

`/case-studies` is a client showcase: one generated card per client page (`cs-type` `client`), large logo beside the details. A client's `cs-button-class` sets both its branded button and its card accent; add matching `.button.<class>` and `.cs-showcase-card.is-<class>` rules to `case-studies.html` for a new client. Deep dives (`cs-type` `deep-dive`) live in a folder named after their client page: `case-studies/hawkeye-fan-shop/digital-analytics-implementation.html` is served at `/case-studies/hawkeye-fan-shop/digital-analytics-implementation` and belongs to `case-studies/hawkeye-fan-shop.html`. The generator puts each folder's cards on that client's page (in its `CS-CARDS` markers), not on the hub. A new client folder needs an `index.html` redirect stub pointing at the client page, and moving a deep dive means adding its old URL to the `REDIRECTS` map. Hawkeye Fan Shop's 12 deep dives were merged into 7 in October 2026, one per workstream (measurement and implementation, connected reporting, data quality, storefront and infrastructure, performance and security, experience optimization, campaigns). Work that fits one of them goes into that page instead of a new near-duplicate. Each deep dive's Results bullets name only what that workstream produced, and there is no separate "Approach & Capabilities" section, since it repeated "The Approach".

## CSS and JS assets

- Pages load minified files from `assets/js/` and `assets/css/` (for example `footer-min.js`, `navigation-min.js`, `main-min.css`).
- Every minified file has a readable source next to it (`footer.js`, `navigation.js`, `main.css`, `scott-filter-bar.js`, and so on).
- Edit the source file, then regenerate the matching `-min` file. Both must change in the same commit. Never edit only the `-min` file.
- JS: regenerate with `node scripts/minifyall.cjs assets/js/<file>.js`. It runs the installed MinifyAll VS Code extension's own code from the terminal (its npm CLI doesn't work on current Node) and writes the `-min` sibling. It reproduces the committed `footer-min.js`, `navigation-min.js`, `header-min.js`, `main-min.js`, and `case-study-hotspots-min.js` byte for byte. `scott-filter-bar-min.js` was built differently, so its first regeneration produces a larger diff than the source change; say so in the report. Do not use any other minifier (terser directly, esbuild, and so on).
- CSS: `main.css`, `noscript.css`, and `engineering.css` have `-min` files that were not produced by MinifyAll (different output style), and MinifyAll's CSS minifier would rewrite the whole file. For those three, when a source change only deletes whole rules, delete the matching contiguous run of rules from the `-min` file and confirm the neighboring rules are untouched. For any other change to them, stop and tell Scott which source file changed. `scripts/minifyall.cjs` refuses them.
- CSS built with MinifyAll: `solutions.css` (added 2026-10-14) and `cta-band.css` (added 2026-10-18). Regenerate either with `node scripts/minifyall.cjs assets/css/<file>.css`. A new stylesheet should follow the same route, not the three legacy files' manual process.
- After regenerating, diff the `-min` file and confirm the only change is the intended one.
- Site-wide UI is built as custom elements: `<scott-nav>` (`assets/js/navigation.js`), `<scott-footer>` (`assets/js/footer.js`), `<scott-filter-bar>` (`assets/js/scott-filter-bar.js`, uses shadow DOM). New shared UI follows this same custom-element pattern rather than copy-pasted HTML.

## Solutions, Company, and content hub pages

- `services.html`, `analytics-data.html`, `web-digital.html`, `conversion-optimization.html`, `advertising-media-buying.html`, and `industries.html` share `assets/css/solutions.css` (classes `sx-*`). It carries the homepage's look; the homepage itself keeps its `hx-*` styles inline in `index.html`.
- The homepage "Trusted by" strip scrolls on a loop at every width (desktop too since 2026-10-18; hovering pauses it, and under reduced motion it holds still and wraps in place). The `<ul class="hx-logos">` sits in a `.hx-logos-track` that clips it and fades the edges. The loop needs a second copy of the logos (`li.is-dup`, `aria-hidden="true"`, `alt=""`), so adding or removing a logo means changing both copies, and one copy must stay wider than the track or a blank gap shows. Strip logos are 96px-tall WebP files named `images/logo-strip-<client>.webp`, wide lockups (icon beside wordmark) rather than stacked marks; near-square ones take `class="is-badge"` to show taller. The current partners are all in it: Hawkeye Fan Shop, The Black & Gold Shop, Kitchens, Couchletics, Snoring Beagle, The Lottery Matrix, Abracalytics.
- The homepage Client work gallery (`#fourth`) is one sideways-scrolling row: a brand tile per client case study first (Hawkeye Fan Shop, The Black & Gold Shop, Couchletics, Snoring Beagle; logo on the client's dark color), then topic tiles that link to deep dives. Tiles are 309x250 images in `images/gallery/thumbs/` with 3px white dividers between them.
- The homepage Website Grant section repeats the top section of `website-grant.html` (status line, heading, lede, buttons, note, and the two site frames), with its CSS copied and scoped to `.home-grant`. Change the two together. On the homepage the heading is an `<h2>` and the buttons link to `/website-grant#apply` and `/website-grant#how-it-works`; years and the closing countdown come from `website-grant.js`.
- The Company pages use the same stylesheet: `about.html`, `why-us.html`, `founder.html`, `find-us.html` (Credentials), `faq.html`, and `contact.html`.
  - `contact.html`: the Web3Forms `<form>` (action, hidden `access_key`, `subject`, `from_name`, `redirect`, `botcheck`, and the field names) must stay exactly as is. Restyle around it, never inside it.
  - `faq.html`: every visible question and answer must match the `FAQPage` JSON-LD in its head. Change both together or neither.
  - `find-us.html` groups profiles into Verified standing, Independent reviews, and Directories & local listings. A new profile goes into the matching group.
  - About's approach is Measure, Build, Improve, the same model as the rest of the site.
  - About's Credentials badges: the BBB seal is BBB's horizontal two-panel sprite (`ruhzbul`, 400x90), shown one 200x90 panel at a time through `.sx-badge-bbb` (hover slides to "Click for Profile") and linked to the BBB profile. Never show the whole sprite; both panels side by side was the bug fixed 2026-10-18.
- The content hubs use it too: `field-notes/index.html` and `diagnostics/index.html`.
  - Field Notes and Insights share one page, `/field-notes/` (Scott folded the Insights hub into it, 2026-10-15): the Field Notes cards first, then the Insights as numbered rows under `id="insights"`. `/insights` 301s to `/field-notes/#insights`, each Insight's "Back to Insights" link goes there, and the article URLs (`/insights/<slug>`) stay as they were. Don't recreate `insights.html` or the Field Notes topic pages.
  - Field Notes is not in the top menu (`<scott-nav>`; Scott took it out 2026-10-17 to stop presenting it as a blog). The pages stay live and indexed. They're reached from the footer's Resources group, the service pages' hero cards and Related work, the homepage hero card, and the case studies intro. Don't add it back to the menu unless Scott asks. The menu's bar heights step evenly (20 to 40px), so re-space them if an item is added or removed.
  - The Field Notes hero card is a "Three ways in" list (Field Notes, Insights, Diagnostics); Insights is an in-page link. It doesn't feature an article, so no article appears twice on the page.
  - The Field Notes cards and Insights rows are generated; their styles stay in the page's own `<style>`.
  - The Diagnostics hero card replays case #001 of `assets/js/diagnostics/crime-scene.js`. Each case card shows its file's case count and first case, so update them if the case files change.
- `clients.html`, `bbb.html`, `404.html`, and `thank-you.html` use it too.
  - On `clients.html`, the roster sections, chip `<li>`s, filter JSON, and search box stay as they are, because `clients-roster.js` and `<scott-filter-bar>` depend on that markup.
  - Partner chips are `li.is-partner` with a `<small>Partner since YYYY</small>` after the name. They take their section's accent color; don't give one its own brand color (Scott, 2026-10-15). When a chip is added or removed, update that section's `roster-count` to match. In Brands, Retailers & Global Platforms, the current partners go last, after the past clients (Scott, 2026-10-18; that section only, the others keep their order).
  - The `.roster-key` line under the filter bar explains the chips: gray is past clients and projects, color is current partners. It sits outside `#roster`, and its sample chips are `span`s, so search and filtering never touch it. If the meaning of a chip style changes, update the key too.
  - `404.html` is served at any missing path, so its asset links must stay root-absolute (`/assets/...`).
  - `thank-you.html` keeps the `data-thanks-message` and `data-thanks-next` hooks that `thank-you.js` rewrites for grant applicants.
- The nine Bloomington-Normal pages in `markets/` use it too.
  - Each service page sets `--sx`/`--sx-soft` inline on `<main>` to a darker shade of its `.market-icon` color (icons and colors come from `main.css`).
  - The service pages share one layout: hero with the market icon and a "Working locally" card ending in the BBB seal and McLean County Chamber badge links (centered side by side; the BBB link uses `.sx-bbb`, not the footer's `id="bbblink"`, so that id stays unique), the prose section, a dark statement line, the Website Grant callout (web development and website design only), the FAQ, a closing statement line, and the "Partner with us" CTA.
  - New market pages should copy an existing one rather than the old banner layout.
- `legal.html` and `security-trust.html` are grouped directories of cards on the same stylesheet. A new `/trust/` policy needs a card in one of their groups; `audit_site.py` fails if a trust page isn't linked from one of the two. The `trust/*` policy documents themselves stay on their plain layout.
- Keep `case-studies.html`, the client case-study pages, and `website-grant.html` in their current design (Scott, 2026-10-14). The client pages are `hawkeye-fan-shop.html`, `the-black-and-gold-shop.html`, `couchletics.html` (added 2026-10-15), and `snoring-beagle.html` (added 2026-10-21). Snoring Beagle's header background (`images/snoringbeagle-hero.jpg`, 2400x1350, the store's oat with the no-Z beagle, `snoringbeagle-beagle-noz.webp`, in a ringed circle) has animated Z's drawn over it by an inline `<svg class="hero-zzz">` whose viewBox is the image's own 2400x1350 with `preserveAspectRatio="xMidYMid slice"`, so the Z's track the beagle the way `background-size: cover` does. If the image or the circle's position changes, move the Z group's `translate()` to match. That page also sets its own eased header fade and wider section spacing in its `<style>`. Hawkeye Fan Shop, Couchletics, and Snoring Beagle show annotated screenshot tours: the tour CSS lives in each page's own `<style>`, the pins come from `case-study-hotspots-min.js`, and the screenshots are 1x and 2x WebP files named `images/<client>-<shot>-<width>w.webp`. Kitchens, The Lottery Matrix, and Abracalytics (both added 2026-10-18) are hand-authored "Coming soon" cards on `/case-studies`, after the generated cards, until their pages exist. The Lottery Matrix's own site has no description yet, so its caption stays neutral ("Lottery site in development") until Scott supplies one. Abracalytics' logo is a tall stacked mark, so its card caps the image at 360px wide to keep the card in line with the others. When a page is published, delete its card and give the page `cs-*` meta tags. Snoring Beagle's generated card uses `images/snoringbeagle-logo.png` (its `cs-logo`), a stacked lockup of `snoringbeagle-beagle-zzz.png` (the snoring beagle Scott picked) over `snoringbeagle-wordmark.png`; `snoringbeagle-beagle.png` is the same beagle without the Z's. Content updates are fine; don't move them to the sx-* look. The exceptions Scott okayed: the dotted backdrop behind the `/case-studies` header, and the closing call to action on `/case-studies` and every client page and deep dive, now the shared full-width navy band (see "Closing band" below; 2026-10-18).
- Closing band: every page with a closing call to action ends with the same full-width navy band, sitting flush on the footer with no gap (Scott, 2026-10-18). It exists three ways, which must look the same, so change them together:
  - `.sx-cta` in `solutions.css`, on the pages that load it (Solutions, Company, hubs, clients, BBB, Legal, Security & Trust, markets).
  - `.home-cta`, inline in `index.html`.
  - `.cta-band` in `assets/css/cta-band.css` (`-min` linked after `main-min.css`), on `/case-studies`, the client pages, their deep dives, and every Field Note and Insight. Markup: `<section class="cta-band" aria-labelledby="cta-title">` with an `<h2 id="cta-title">`, one `<p>`, and `<ul class="actions special">` holding `<a class="button big wide alt">`. It must be the last element in `<main>`: its negative side margins break it out of the 900px article column, and a `main:has(> .cta-band:last-child)` rule removes the bottom margin articles put on `<main>`. A new article or client page copies that block and the stylesheet link.
- Each page sets its accent on `<main class="sx-page ...">`: `is-measure` (blue), `is-build` (amber), `is-improve` (green), or `is-campaigns` (purple).
- Service page order: hero, Sound familiar (3 symptoms), What gets done (4 services plus capability tags), the 4-step process band, Related work (`id="work"`, the shared `.cs-card` and `.related-notes` markup), FAQ as `<details>`, navy CTA. The service name is the eyebrow inside the `<h1>`.
- `services.html` is the hub. Its hero card links the four practices; each practice card keeps that practice's sub-service copy and links to its page. Practice accents are set per card (`.sx-practice.is-measure` and so on).
- Each service page's hero card illustrates one real Field Note or Insight and links to it, with a caption saying so. Use only facts and figures that piece already publishes; never invent numbers for a card.
- The hero `<section>` carries `data-analytics-section="hero"`; without it `gtm.js` labels hero clicks with the headline, since only `.banner` heroes are detected automatically.
- The cards animate once `main.js` removes `body.is-preload`. Their starting and ending states are pure CSS, with transitions switched off under `prefers-reduced-motion`.

## Headers, CSP, and things that are not in this repo

- The Content-Security-Policy header is NOT in this repo. It lives in Cloudflare as a Transform Rule. Do not add a CSP to `_headers` or to `<meta>` tags.
- If a change adds any new third-party script, font, image, iframe, or fetch domain, stop and tell Scott which CSP directive needs which domain. He updates CSP by pasting the full current string and getting back a complete drop-in replacement, not a diff.
- `_headers` holds cache and cross-origin headers, plus `X-Robots-Tag: noindex` rules for `/AGENTS.md`, `/CLAUDE.md`, and `/README.md` so those repo files stay out of search results. Keep those noindex rules; do not add other header types (CSP, security headers) to this file.
- Analytics is GA4 through GTM only. Do not add any other analytics, session replay, heatmap, or tracking script.
- The contact form posts to Web3Forms.

## Status page

- `/status` (`status.html`, rendered by `assets/js/status.js`) shows every monitor on the UptimeRobot account, so a monitor added there appears with no code change. Don't hard-code monitor names.
- Data comes from the Pages Function `functions/api/status.js` (`GET /api/status`). It calls UptimeRobot server-side with the read-only key in the `UPTIMEROBOT_API_KEY` secret (Cloudflare Pages > Settings > Variables and Secrets) and returns only the fields the page needs. The key must never reach the browser or the repo. Locally it lives in `.dev.vars` (gitignored), which `wrangler pages dev` loads.
- The Cloudflare Pages project is `scottlabz` in the "Scott Labz" account (ID `92debb682bcd6940aee7dac4082d8efa`); the same login also sees unrelated accounts, so pass the ID. Set or rotate the key without the dashboard: `sed -n 's/^UPTIMEROBOT_API_KEY=//p' .dev.vars | tr -d '\n' | CLOUDFLARE_ACCOUNT_ID=92debb682bcd6940aee7dac4082d8efa npx wrangler@3 pages secret put UPTIMEROBOT_API_KEY --project-name scottlabz`. A secret applies from the next deploy.
- UptimeRobot's free plan allows 10 API calls a minute, so the function caches responses for 60 seconds and keeps the last good response for a day as a fallback. Keep that caching if you change the function.
- No CSP change is involved: the browser only fetches same-origin `/api/status`.
- Body copy on the page must not name the monitoring service (third-party tool rule).

## Pages excluded from the sitemap and orphan checks

`404.html`, `thank-you.html`, `nav-demo.html`, `filter-bar-demo.html`, and `landing.html` (ad landing page reached only by external traffic). Subdirectory `index.html` files are usually meta-refresh redirect stubs; every directory must have one. Check `scripts/audit_site.py` and `scripts/generate_sitemap.py` before adding to these lists, and keep the two lists in sync.

## Local preview

Run `npx wrangler@3 pages dev . --port 8788` from the repo root and open http://127.0.0.1:8788. It serves extensionless URLs and runs `functions/_middleware.js`, so the retired-page 301s work locally too. `python3 scripts/serve.py` (port 8000) is a lighter option that resolves clean URLs but runs no Functions: redirects don't fire and `/status` loads no data there because `/api/status` returns 404. Use wrangler for anything involving `functions/`. `.wrangler/` is local state and is gitignored.

## Checks to run before every commit

Run from the repo root. All must exit 0, with the one sitemap exception described below.

```bash
python3 scripts/generate_indexes.py
python3 scripts/audit_site.py
python3 scripts/check_redirect_stubs.py
```

`generate_indexes.py` validates every article's `<meta>` card fields and exits non-zero on any error. Running it rewrites the generated hub regions; keep that output in the commit, since CI produces the same result.

Because the sitemap only updates after push, `audit_site.py` will report pages added or deleted in this change as missing from (or stale in) `sitemap.xml`. That specific failure is expected; ignore it for pages this change added or removed and do not fix it by editing the sitemap. Any other sitemap failure is real.

`audit_site.py` covers sitemap completeness, canonical URLs, broken internal links, orphan pages, `<img>` alt coverage (and no `title` on any `<img>`), trust page links, JSON-LD consistency, meta titles and descriptions, and HTML tag balance. If it fails, fix the cause; do not edit the audit script to make it pass.

## Images

- Never delete files from `images/`, even when no page uses them anymore. Scott may reuse them later. When a page stops using an image, just remove the reference. To make a lighter copy (for example a small WebP for a logo strip), add a new file next to the original instead of replacing it.

## HTML formatting rules

- `<a href=` must always stay on the same line as the opening `<a`, never split across lines, no matter how many attributes follow on later lines.
- Every content `<img>` needs `alt`. Do not add a `title` attribute to `<img>` (removed sitewide 2026-10-13; `audit_site.py` flags any that come back).

## Copy rules (enforced sitewide)

These apply to all visible on-site text: body copy, headings, meta descriptions, alt text, and button labels.

- No em dashes and no en dashes anywhere. Hyphens only. Before committing, search changed files for U+2014 (em dash) and U+2013 (en dash) and replace them, for example `LC_ALL=C.UTF-8 grep -nP '\x{2014}|\x{2013}' <files>`.
- No superlatives.
- No named third-party tools or platforms in body copy.
- Do not use the words "engineering," "technology," or "team" in body copy.
- Voice: new copy uses "Scott Labz" sparingly in place of "we" or "I", and prefers neutral phrasing ("see the case study", "Who it's for"). Field Notes body copy does not use "Scott Labz". Visitor-voice text stays first person (FAQ questions like "Can I apply again next year?", form labels like "I've read..."). Legal and trust pages keep "we".
- Do not change existing "we", "I", or "Scott Labz" wording anywhere on the site unless Scott asks. The current wording was set deliberately.
- Tone: short, direct, action-oriented.
- The "280+ organizations" figure appears only on the founder page (`founder.html`) and on the client roster it links to (`clients.html`, where it's the count of the list). Don't use it on any other page, in meta or social descriptions, or in `llms.txt`.

## Content taxonomy

Pick the right section before writing anything. Do not create pages that are not backed by real work.

There are three content types:

- **Field Notes** (`field-notes/`): closed incident stories. Written once, stand alone. A confirmed result or later follow-up on a Field Note goes into that Field Note as a dated update, or into a new Field Note that links back to it.
- **Insights** (`insights/`): evergreen, principle-driven pieces. They're listed on the Field Notes page, not a hub of their own.
- **Diagnostics** (`diagnostics/`): interactive pillar tools.

Retired types; do not recreate them or add new content types without Scott:

- **Signals**: folded into Field Notes in October 2026. Old `/signals/` URLs are 301-redirected by the `REDIRECTS` map in `functions/_middleware.js`.
- **Findings**: planned as the confirmed follow-up to a Signal and never published. Field Notes already cover confirmed results (see above).
- **Lab**: the old Lab section.

## Retiring a page

Cloudflare Pages ignores a `_redirects` file here because `functions/_middleware.js` runs on every route. To remove a page, delete it, fix every link that `audit_site.py` reports as broken, and add its extensionless path to the `REDIRECTS` map in `functions/_middleware.js`, pointing at the closest kept page.

## Reporting back to Scott

- No em dashes in replies either.
- When reporting what you checked, use this format: what prompted the check, exactly what was checked (files, URLs, commands named specifically), what was found (quote exact values), and one line on implications. No narrative of how you got there.
- When you need a decision, make the message fully self-contained: current state, what Scott last said, your recommendation, and why. Quote the actual text instead of referring to something by name, line number, or "the earlier option." Never require Scott to open a file, scroll, or reconstruct earlier messages.
