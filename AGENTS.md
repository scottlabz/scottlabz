# AGENTS.md

Instructions for AI coding agents working in this repo. Follow these exactly. When a rule here conflicts with a chat instruction from Scott, the chat instruction wins.

## Project overview

- Source for scottlabz.com, the production website of Scott Labz, LLC.
- Hand-authored static HTML, CSS, and JS. No framework, no package.json, no build step.
- Hosted on Cloudflare Pages (free plan). Every push to `main` deploys to production. There is no staging branch, so treat every commit as live.
- Cloudflare Pages serves extensionless URLs and 308-redirects `*.html` to them. Canonical tags, internal links, sitemap entries, and JSON manifest URLs all use the extensionless form (`/insights/some-note`, not `/insights/some-note.html`).

## What runs automatically on push to main

Do not do these by hand. CI does them and commits the result.

| Workflow | What it does |
|---|---|
| `.github/workflows/sitemap.yml` ("Generate Sitemap & Cache Bust") | Runs `scripts/generate_indexes.py`, `scripts/generate_sitemap.py`, `scripts/cache_bust.py`, auto-commits, then `scripts/indexnow_submit.py` |
| `.github/workflows/audit.yml` ("Site Audit") | Runs `scripts/audit_site.py` and `scripts/check_redirect_stubs.py` |
| `.github/workflows/purge-cache.yml` | Purges and warms the Cloudflare cache for content file types |
| `.github/workflows/codeql.yml` | Code scanning |

## Never hand-edit generated content

- `sitemap.xml` - regenerated automatically on every push to `main` by `scripts/generate_sitemap.py` and auto-committed. Never add, remove, or edit entries by hand, and never run `generate_sitemap.py` locally and commit the result. Adding or deleting a page is all it takes.
- `?v=` hash query strings on CSS, JS, and image references - set by `scripts/cache_bust.py`. Leave existing hashes alone; CI recomputes them.
- Anything between `START`/`END` marker comments on hub pages and the homepage (Field Notes, Insights, Signals, Case Studies, `HOME-LATEST`, `FN-TOPICS`, `FN-PAGER`, `FN-RELATED`, `CS-CLIENTS`, `CS-CARDS`), plus hub JSON-LD ItemLists.
- Section JSON manifests: `field-notes/field-notes.json`, `insights/insights.json`, `signals/signals.json`, `case-studies/case-studies.json`.
- Generated pages under `field-notes/topics/` and `field-notes/page/`.

To change a card, listing, or manifest entry, edit the `<meta>` tags in the article's own `<head>` (for example `fn-card-title`, `insight-summary`, `signal-status`, `cs-order`). The full field list for each section is in the docstring at the top of `scripts/generate_indexes.py`. Read it before adding or editing any article.

Category keys must already exist in the `<scott-filter-bar>` JSON block on that section's hub page. That block is hand-authored; add a new key there first if one is needed.

## CSS and JS assets

- Pages load minified files from `assets/js/` and `assets/css/` (for example `footer-min.js`, `navigation-min.js`, `main-min.css`).
- Every minified file has a readable source next to it (`footer.js`, `navigation.js`, `main.css`, `scott-filter-bar.js`, and so on).
- Edit the source file, then regenerate the matching `-min` file. Both must change in the same commit. Never edit only the `-min` file.
- Minified files are produced by the MinifyAll VS Code extension (it writes the `-min` suffix). It cannot be run from the terminal: its npm CLI fails to run on current Node and does not handle JS. So after editing any source `.js` or `.css` file, stop and tell Scott exactly which source files changed so he can run MinifyAll on them in VS Code. Do not write or hand-edit the `-min` file yourself, and do not use any other minifier (terser, esbuild, clean-css, and so on).
- Site-wide UI is built as custom elements: `<scott-nav>` (`assets/js/navigation.js`), `<scott-footer>` (`assets/js/footer.js`), `<scott-filter-bar>` (`assets/js/scott-filter-bar.js`, uses shadow DOM). New shared UI follows this same custom-element pattern rather than copy-pasted HTML.

## Headers, CSP, and things that are not in this repo

- The Content-Security-Policy header is NOT in this repo. It lives in Cloudflare as a Transform Rule. Do not add a CSP to `_headers` or to `<meta>` tags.
- If a change adds any new third-party script, font, image, iframe, or fetch domain, stop and tell Scott which CSP directive needs which domain. He updates CSP by pasting the full current string and getting back a complete drop-in replacement, not a diff.
- `_headers` holds cache and cross-origin headers, plus `X-Robots-Tag: noindex` rules for `/AGENTS.md`, `/CLAUDE.md`, and `/README.md` so those repo files stay out of search results. Keep those noindex rules; do not add other header types (CSP, security headers) to this file.
- Analytics is GA4 through GTM only. Do not add any other analytics, session replay, heatmap, or tracking script.
- The contact form posts to Web3Forms.

## Pages excluded from the sitemap and orphan checks

`404.html`, `thank-you.html`, `nav-demo.html`, `filter-bar-demo.html`, and `landing.html` (ad landing page reached only by external traffic). Subdirectory `index.html` files are usually meta-refresh redirect stubs; every directory must have one. Check `scripts/audit_site.py` and `scripts/generate_sitemap.py` before adding to these lists, and keep the two lists in sync.

## Checks to run before every commit

Run from the repo root. All must exit 0, with the one sitemap exception described below.

```bash
python3 scripts/generate_indexes.py
python3 scripts/audit_site.py
python3 scripts/check_redirect_stubs.py
```

`generate_indexes.py` validates every article's `<meta>` card fields and exits non-zero on any error. Running it rewrites the generated hub regions; keep that output in the commit, since CI produces the same result.

Because the sitemap only updates after push, `audit_site.py` will report pages added or deleted in this change as missing from (or stale in) `sitemap.xml`. That specific failure is expected; ignore it for pages this change added or removed and do not fix it by editing the sitemap. Any other sitemap failure is real.

`audit_site.py` covers sitemap completeness, canonical URLs, broken internal links, orphan pages, `<img>` alt and title coverage, trust page links, JSON-LD consistency, meta titles and descriptions, and HTML tag balance. If it fails, fix the cause; do not edit the audit script to make it pass.

## HTML formatting rules

- `<a href=` must always stay on the same line as the opening `<a`, never split across lines, no matter how many attributes follow on later lines.
- Every content `<img>` needs `alt` and `title`.

## Copy rules (enforced sitewide)

These apply to all visible on-site text: body copy, headings, meta descriptions, alt text, and button labels.

- No em dashes and no en dashes anywhere. Hyphens only. Before committing, search changed files for U+2014 (em dash) and U+2013 (en dash) and replace them, for example `LC_ALL=C.UTF-8 grep -nP '\x{2014}|\x{2013}' <files>`.
- No superlatives.
- No named third-party tools or platforms in body copy.
- Do not use the words "engineering," "technology," or "team" in body copy. Signals pages may be an exception; ask Scott before using them there.
- Voice: new copy uses "Scott Labz" sparingly in place of "we" or "I", and prefers neutral phrasing ("see the case study", "Who it's for"). Field Notes body copy does not use "Scott Labz". Visitor-voice text stays first person (FAQ questions like "Can I apply again next year?", form labels like "I've read..."). Legal and trust pages keep "we".
- Do not change existing "we", "I", or "Scott Labz" wording anywhere on the site unless Scott asks. The current wording was set deliberately.
- Tone: short, direct, action-oriented.

## Content taxonomy

Pick the right section before writing anything. Do not create pages that are not backed by real work.

- **Field Notes** (`field-notes/`): closed incident stories. Written once, stand alone.
- **Insights** (`insights/`): evergreen, principle-driven pieces.
- **Signals** (`signals/`): short, timely single observations. Status is `red`, `amber`, or `green`.
- **Findings**: must link back to a published Signal. A Finding with no Signal does not get published.
- **Diagnostics** (`diagnostics/`): interactive pillar tools. The old Lab section is retired; do not recreate it.

## Reporting back to Scott

- No em dashes in replies either.
- When reporting what you checked, use this format: what prompted the check, exactly what was checked (files, URLs, commands named specifically), what was found (quote exact values), and one line on implications. No narrative of how you got there.
- When you need a decision, make the message fully self-contained: current state, what Scott last said, your recommendation, and why. Quote the actual text instead of referring to something by name, line number, or "the earlier option." Never require Scott to open a file, scroll, or reconstruct earlier messages.
