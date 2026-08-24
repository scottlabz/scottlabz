# Installing `<scott-nav>` site-wide

Three files come with this: `navigation.js` (source), `navigation-min.js`
(pre-minified, same as `footer-min.js` convention - regenerate with
`npx terser assets/js/navigation.js --compress --mangle -o assets/js/navigation-min.js`
if you edit the source), and this README.

Before making changes: read `navigation.js` in full and open a couple of
existing pages (`index.html`, `services.html`, `contact.html`) to see how
`<scott-footer>` and its script tag are wired in - match that pattern,
don't guess at it.

## 1. Add the files
Copy `navigation.js` and `navigation-min.js` into `assets/js/`.

## 2. Add `id="main-content"` to `<main>` - with two exceptions
The skip link inside the component targets `#main-content` by default.
Right now almost no page has that id. Add it to every page's `<main>`
tag, **except**:

- **`contact.html`** - its `<main>` already has `id="contact"`. I checked
  the repo and nothing references `#contact` anywhere else, so it's safe
  to just rename it to `id="main-content"` for consistency.
- **`insights/engineering-approach.html`** - its `<main>` has `id="first"`,
  which **is** actively used: several pages (`index.html`, `insights.html`,
  `analytics-data.html`, `markets/bloomington-normal-il.html`,
  `field-notes/index.html`, and the page itself) have
  `<a href="#first" class="button ... smooth-scroll">` CTAs pointing at it.
  Do **not** rename or remove this id. Instead, on this one page only,
  use the component's override:
  ```html
  <scott-nav skip-target="#first"></scott-nav>
  ```

Before touching any other page's existing `<main id="...">` (if you find
one I didn't check), grep the repo for that id first the same way, rather
than assuming it's safe to change.

## 3. Add the script tag and the element
Every other JS component on the site (`footer-min.js`) loads via a
`defer` script tag placed at the bottom of `<body>`, right before the
element it powers. For `<scott-nav>`, place the script tag in `<head>`
instead - it renders above the fold immediately on page load, so it
should start downloading as early as possible to avoid a flash of empty
space at the top. This is a deliberate difference from the footer's
pattern, not an inconsistency to "fix" later.

In `<head>`, alongside `header-min.js` / `favicon-min.js`:
```html
<script src="/assets/js/navigation-min.js" defer></script>
```

Right after `<body class="is-preload">` opens, before `<div id="wrapper">`:
```html
<scott-nav></scott-nav>
```

## 4. Cache-busting - don't hand-write the `?v=` hash
This repo already has `scripts/cache_bust.py`, which rewrites local
`.css`/`.js` references to `?v=<content-hash>` automatically. Add the
script/tag with no `?v=` suffix, then run:
```bash
python3 scripts/cache_bust.py
```
It will populate the hash on every page that references
`navigation-min.js`. Don't compute or guess a hash by hand.

## 5. Which pages
Use `sitemap.xml` at the repo root as the page list, the same way it's
used elsewhere in this project to cross-check what's actually published.
Apply steps 2-3 to every page in it, plus `404.html` and the
`landing.html` variant (not in the sitemap by design, but still live
pages people can land on).

## 6. Copy-rule check
Nothing in `navigation.js`'s rendered output uses "engineering,"
"technology," "team," superlatives, or names third-party tools/platforms
in body copy - it's just page labels (Home/Services/Work/etc.), so it's
already compliant. Flag it to me if a future edit introduces any of those.

## 7. Commit
`purge-cache.yml` fires automatically on push to `main` for `.html`/`.js`
changes - no manual purge step needed.
