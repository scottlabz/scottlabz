#!/usr/bin/env python3
"""Generate the hub listings for Field Notes, Insights, Signals, and Case
Studies from per-page metadata, plus one JSON manifest per section.

Each article carries its own card data as <meta> tags in <head>. This
script reads them, validates them, and rewrites only the region between
that section's START/END markers on its hub page. Everything outside the
markers (hero, filter bar, legend, CSS) stays hand-authored.

Sections
--------
field-notes  hub: field-notes/index.html   articles: field-notes/*.html
    fn-card-title, fn-card-summary, fn-categories, fn-accent, fn-published
    Order: newest fn-published first, ties by slug A-Z.

    Also generated for field-notes (see fn_post):
      - field-notes/topics/<key>.html, one page per category with notes,
        derived from the hub (same hero, styles and scripts)
      - field-notes/page/<n>.html once there are more than PAGE_SIZE
        notes; the hub then shows the newest PAGE_SIZE
      - FN-TOPICS (topic links) and FN-PAGER (page links) on the hub
      - the hub's JSON-LD ItemList
      - a "Keep reading" block (FN-RELATED markers) in every article,
        inserted before its closing call-to-action section: the notes
        sharing the most categories, newest first, topped up with the
        newest notes, plus a link to the article's first topic page
    The Insights and Signals hubs' JSON-LD ItemLists are kept in card
    order the same way (hub_list_post).
    Topic descriptions come from a "description" key in the hub's
    <scott-filter-bar> JSON. Generated pages in topics/ and page/ that no
    longer apply are deleted.

insights     hub: insights.html            articles: insights/*.html
    insight-number, insight-title, insight-summary, insight-categories,
    insight-published
    Order: insight-number ascending. Kicker text is the filter-bar label
    of the first category.

signals      hub: signals/index.html       articles: signals/*.html
    signal-number, signal-title, signal-summary, signal-status,
    signal-published
    Order: signal-number descending (newest first). Status is one of
    red, amber, green. The "Sep 2026" label comes from signal-published.

case-studies  hub: case-studies.html       pages: case-studies/*.html
    Every page: cs-type (client or deep-dive), cs-order, cs-title,
    cs-summary.
    client:    cs-caption, cs-logo, cs-logo-width, cs-logo-height,
               cs-logo-alt, optional cs-button-class (branded button,
               e.g. hawkeye) and cs-button-text (default "View <title>
               Case Study").
    deep-dive: cs-categories, cs-image-alt. Thumbnails must exist at
               images/cs-thumb-<slug>-480w.webp and -960w.webp.
    Writes two marker regions (CS-CLIENTS, CS-CARDS) plus the
    CollectionPage ItemList in the hub's JSON-LD: clients first, then
    deep dives, each by cs-order. Image ?v= hashes match cache_bust.py
    so the two scripts never undo each other. Clients that don't have a
    page yet (Kitchens) stay hand-authored after CS-CLIENTS:END.

Valid category keys for field-notes, insights and case-studies come from the
<scott-filter-bar> JSON block on each hub page, which stays
hand-authored. Numbers must be unique within a section.

Links and manifest URLs use the extensionless form Cloudflare Pages
serves (/insights/some-note, not /insights/some-note.html), which is
also what every canonical tag uses.

Exits non-zero and writes nothing if any section has an error.

Usage:
    python scripts/generate_indexes.py                # write all sections
    python scripts/generate_indexes.py --check        # exit 1 if anything is out of date
    python scripts/generate_indexes.py --section signals
"""
import hashlib
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://scottlabz.com"

META_RE = re.compile(r'<meta\s+name="([a-z]+-[a-z-]+)"\s+content="([^"]*)"\s*/?>', re.I)
HEX_RE = re.compile(r"^#[0-9a-f]{6}$")
FILTER_JSON_RE = re.compile(
    r"<scott-filter-bar[^>]*>\s*<script type=\"application/json\">(.*?)</script>", re.S
)
# Skipped when collecting articles: hubs and meta-refresh redirect stubs.
SKIP_FILES = {"index.html"}

SIGNAL_STATUS = {
    "red": "Something broke",
    "amber": "Worth watching",
    "green": "Improved",
}


def text(s: str) -> str:
    return html.escape(s, quote=False)


def attr(s: str) -> str:
    return html.escape(s, quote=False).replace('"', "&quot;")


def norm(s: str) -> str:
    return " ".join(s.split())


class SectionError(Exception):
    pass


# ---------------------------------------------------------------------------
# Section definitions
# ---------------------------------------------------------------------------

def filter_labels(hub_html: str, hub_name: str) -> dict[str, str]:
    m = FILTER_JSON_RE.search(hub_html)
    if not m:
        raise SectionError(f"no <scott-filter-bar> JSON category block found in {hub_name}")
    return {c["key"]: c["label"] for c in json.loads(m.group(1))}


def parse_date(value: str, where: str, errors: list[str]) -> str:
    value = value.strip()
    try:
        date.fromisoformat(value)
    except ValueError:
        errors.append(f"{where}: published date must be YYYY-MM-DD, got {value!r}")
    return value


def parse_number(value: str, where: str, errors: list[str]) -> int:
    value = value.strip()
    if not value.isdigit() or int(value) < 1:
        errors.append(f"{where}: number must be a positive whole number, got {value!r}")
        return 0
    return int(value)


def parse_categories(value: str, labels: dict[str, str], where: str, errors: list[str]) -> list[str]:
    cats = value.split()
    unknown = [c for c in cats if c not in labels]
    if unknown:
        errors.append(f"{where}: unknown category {', '.join(unknown)} (valid: {', '.join(sorted(labels))})")
    return cats


def unique_numbers(notes: list[dict], section: str, errors: list[str]) -> None:
    seen: dict[int, str] = {}
    for n in notes:
        if n["number"] in seen:
            errors.append(f"{section}: number {n['number']} used by both {seen[n['number']]} and {n['file']}")
        seen[n["number"]] = n["file"]


# --- Field Notes -----------------------------------------------------------

def fn_build(meta: dict, path: Path, ctx: dict, errors: list[str]) -> dict:
    where = f"field-notes/{path.name}"
    accent = meta["fn-accent"].strip().lower()
    if not HEX_RE.match(accent):
        errors.append(f"{where}: fn-accent must be #rrggbb, got {accent!r}")
    return {
        "slug": path.stem,
        "file": path.name,
        "url": f"{SITE}/field-notes/{path.stem}",
        "title": norm(meta["fn-card-title"]),
        "summary": norm(meta["fn-card-summary"]),
        "categories": parse_categories(meta["fn-categories"], ctx["labels"], where, errors),
        "accent": accent,
        "published": parse_date(meta["fn-published"], where, errors),
    }


def fn_order(notes: list[dict], errors: list[str]) -> list[dict]:
    notes.sort(key=lambda n: n["slug"])
    notes.sort(key=lambda n: n["published"], reverse=True)
    return notes


def fn_render(n: dict, ctx: dict) -> str:
    return (
        f'        <a href="{attr(n["slug"])}" class="fn-card-link" data-categories="{attr(" ".join(n["categories"]))}">\n'
        f'          <section class="section-block" style="--accent: {n["accent"]}">\n'
        f'            <i class="fas fa-arrow-right fn-card-icon"></i>\n'
        f'            <h2>{text(n["title"])}</h2>\n'
        f'            <p>{text(n["summary"])}</p>\n'
        f'          </section>\n'
        f'        </a>\n'
    )


# Field Notes extras: topic pages, paging, related reading -----------------

PAGE_SIZE = 30
RELATED_COUNT = 3
FN_TOPICS_DIR = "field-notes/topics"
FN_PAGES_DIR = "field-notes/page"
# The array body may not run past its own <script> block
ITEMS_RE = re.compile(r'("itemListElement": \[\n)((?:(?!</script>).)*?)(\n( *)\])', re.S)
LD_RE = re.compile(r'(<script type="application/ld\+json">\n)(.*?)(\n *</script>)', re.S)
FN_CTA_RE = re.compile(r"\n        <section>\n(?:(?!<section).)*?</section>\n      </main>", re.S)


def filter_config(hub_html: str) -> list[dict]:
    m = FILTER_JSON_RE.search(hub_html)
    return json.loads(m.group(1)) if m else []


def set_region(page: str, marker: str, body: str, where: str) -> str:
    """Replace everything between <!-- MARKER:START... --> and <!-- MARKER:END -->."""
    start_re = re.compile(rf"( *)<!-- {marker}:START[^>]*-->")
    end_tag = f"<!-- {marker}:END -->"
    if len(start_re.findall(page)) != 1 or page.count(end_tag) != 1:
        raise SectionError(f"{where} must contain exactly one {marker}:START and one {marker}:END marker")
    m = start_re.search(page)
    indent = m.group(1)
    before = page[: m.start()]
    after = page[m.end():].split(end_tag, 1)[1]
    return f"{before}{indent}<!-- {marker}:START - generated by scripts/generate_indexes.py, do not edit by hand -->\n{body}{indent}{end_tag}{after}"


def item_list(notes: list[dict], pad: str, kind: str = "Article") -> str:
    """JSON-LD list entries in the hubs' existing formatting: Article
    entries carry a name, plain ListItem entries only the url."""
    def entry(i: int, n: dict) -> str:
        name = f'{pad}  "name": {json.dumps(n["title"], ensure_ascii=False)},\n' if kind == "Article" else ""
        return f'{pad}{{\n{pad}  "@type": "{kind}",\n{pad}  "position": {i},\n{name}{pad}  "url": "{n["url"]}"\n{pad}}}'
    return ",\n".join(entry(i, n) for i, n in enumerate(notes, 1))


def set_item_list(page: str, notes: list[dict], where: str, kind: str = "Article") -> str:
    found = ITEMS_RE.findall(page)
    if len(found) != 1:
        raise SectionError(f'{where} must contain exactly one JSON-LD "itemListElement" array')
    m = ITEMS_RE.search(page)
    return page[: m.start(2)] + item_list(notes, m.group(4) + "  ", kind) + page[m.end(2):]


def hub_list_post(kind: str):
    """post hook that keeps a hub's JSON-LD ItemList in the same order as
    its generated cards (Insights, Signals)."""
    def post(notes: list[dict], hub: str, ctx: dict, cfg: dict) -> tuple[str, list]:
        return set_item_list(hub, notes, cfg["hub"], kind), []
    return post


def fn_topics_nav(topics: list[dict], current: str | None) -> str:
    i = "        "
    links = []
    if current:
        links.append(f'{i}  <a href="/field-notes/">All Field Notes</a>\n')
    for t in topics:
        cur = ' aria-current="page"' if t["key"] == current else ""
        links.append(f'{i}  <a href="/field-notes/topics/{t["key"]}"{cur}>{text(t["label"])}</a>\n')
    label = "Topics:" if current else "Browse by topic:"
    return f'{i}<nav class="fn-topics" aria-label="Field Notes topics">\n{i}  <span>{label}</span>\n{"".join(links)}{i}</nav>\n'


def fn_pager(page_no: int, total: int) -> str:
    if total <= 1:
        return ""
    i = "        "

    def href(n: int) -> str:
        return "/field-notes/" if n == 1 else f"/field-notes/page/{n}"

    parts = []
    if page_no > 1:
        parts.append(f'{i}  <a href="{href(page_no - 1)}" rel="prev">&larr; Newer notes</a>\n')
    for n in range(1, total + 1):
        if n == page_no:
            parts.append(f'{i}  <span aria-current="page">{n}</span>\n')
        else:
            parts.append(f'{i}  <a href="{href(n)}">{n}</a>\n')
    if page_no < total:
        parts.append(f'{i}  <a href="{href(page_no + 1)}" rel="next">Older notes &rarr;</a>\n')
    return f'{i}<nav class="fn-pager" aria-label="Field Notes pages">\n{"".join(parts)}{i}</nav>\n'


def fn_derive(hub: str, *, url: str, title: str, social_title: str, description: str,
              h1: str, intro: str, cards: str, topics_nav: str, pager: str,
              notes: list[dict], keep_filter: bool) -> str:
    """Build a standalone page from the generated hub: same hero, styles and
    scripts, its own head tags, cards and JSON-LD. Relative ../ paths become
    root-absolute so the page works from any folder depth."""
    page = hub
    page = re.sub(r"<title>.*?</title>", f"<title>{text(title)}</title>", page, count=1, flags=re.S)
    page = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")', lambda m: m.group(1) + attr(description) + m.group(2), page, count=1)
    page = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), page, count=1)
    for prop, value in (("og:title", social_title), ("og:description", description), ("og:url", url)):
        page = re.sub(rf'(<meta\s+property="{prop}"\s+content=")[^"]*(")', lambda m, v=value: m.group(1) + attr(v) + m.group(2), page, count=1)
    for name, value in (("twitter:title", social_title), ("twitter:description", description)):
        page = re.sub(rf'(<meta\s+name="{name}"\s+content=")[^"]*(")', lambda m, v=value: m.group(1) + attr(v) + m.group(2), page, count=1)
    ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": url,
        "name": social_title.replace(" | Scott Labz", ""),
        "description": description,
        "url": url,
        "isPartOf": {"@id": f"{SITE}/field-notes/"},
        "about": {"@id": f"{SITE}/#organization"},
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "Article", "position": i, "name": n["title"], "url": n["url"]}
                for i, n in enumerate(notes, 1)
            ],
        },
    }
    ld_text = "\n".join("      " + line for line in json.dumps(ld, indent=2, ensure_ascii=False).splitlines())
    page, n = LD_RE.subn(lambda m: m.group(1) + ld_text + m.group(3), page, count=1)
    if n != 1:
        raise SectionError(f"{url}: could not find the hub's JSON-LD block to replace")
    page = re.sub(r'<h1 class="major">.*?</h1>', f'<h1 class="major">{text(h1)}</h1>', page, count=1, flags=re.S)
    page = re.sub(r'(</h1>\s*<p class="major">).*?(</p>)', lambda m: m.group(1) + "\n            " + text(intro) + "\n          " + m.group(2), page, count=1, flags=re.S)
    if not keep_filter:
        # Anchor on the element's own attributes: the hub's CSS comments
        # also mention "<scott-filter-bar>".
        page, n = re.subn(r"\n *<scott-filter-bar target=.*?</scott-filter-bar>\n", "\n", page, count=1, flags=re.S)
        if n != 1:
            raise SectionError(f"{url}: could not find the hub's <scott-filter-bar> element to remove")
        page = re.sub(r'\n *<script src="[^"]*scott-filter-bar[^"]*" defer></script>', "", page, count=1)
    page = set_region(page, "FN-TOPICS", topics_nav, url)
    page = set_region(page, "FN-CARDS", cards, url)
    page = set_region(page, "FN-PAGER", pager, url)
    page = re.sub(r'(["\s,])\.\./', r"\1/", page)
    banner = "<!-- Generated by scripts/generate_indexes.py from field-notes/index.html - do not edit by hand -->\n"
    return page.replace("<!doctype html>\n", "<!doctype html>\n" + banner, 1)


def redirect_stub(target: str) -> str:
    """Same meta-refresh stub every other folder on the site has as its
    index.html (see scripts/check_redirect_stubs.py)."""
    return (
        "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n"
        f'    <meta http-equiv="refresh" content="0; url={target}" />\n'
        "    <title>Redirecting...</title>\n  </head>\n  <body>\n    <main>\n      <p>\n"
        "      If you are not redirected automatically, follow this\n"
        f'      <a href="{target}">link</a>.\n'
        "      </p>\n    </main>\n  </body>\n</html>\n"
    )


def fn_related_block(note: dict, related: list[dict], topic: dict | None) -> str:
    i = "        "
    items = "".join(
        f'{i}      <li><a href="/field-notes/{attr(r["slug"])}" style="--accent: {r["accent"]}">'
        f'<span class="rn-title">{text(r["title"])}</span><span class="rn-sum">{text(r["summary"])}</span></a></li>\n'
        for r in related
    )
    more = (
        f'{i}  <p class="related-work-all"><a href="/field-notes/topics/{topic["key"]}">More {text(topic["label"])} notes &rarr;</a></p>\n'
        if topic else ""
    )
    return (
        f'{i}<section class="section-block fn-related" aria-labelledby="fn-related-title">\n'
        f'{i}  <h2 id="fn-related-title">Keep reading</h2>\n'
        f'{i}  <div class="related-notes">\n'
        f'{i}    <ul>\n{items}{i}    </ul>\n'
        f'{i}  </div>\n'
        f'{more}'
        f'{i}</section>\n'
    )


def fn_pick_related(note: dict, notes: list[dict]) -> list[dict]:
    """Most shared categories first, newest first within a tie; then the
    newest remaining notes if fewer than RELATED_COUNT share a category."""
    others = [n for n in notes if n["slug"] != note["slug"]]
    mine = set(note["categories"])
    sharing = [n for n in others if mine & set(n["categories"])]
    sharing.sort(key=lambda n: n["published"], reverse=True)
    sharing.sort(key=lambda n: len(mine & set(n["categories"])), reverse=True)
    picks = sharing[:RELATED_COUNT]
    for n in others:  # already newest first
        if len(picks) >= RELATED_COUNT:
            break
        if n not in picks:
            picks.append(n)
    return picks


def fn_post(notes: list[dict], hub: str, ctx: dict, cfg: dict) -> tuple[str, list[tuple[Path, str | None]]]:
    config = filter_config(hub)
    topics = [t for t in config if any(t["key"] in n["categories"] for n in notes)]
    page_size = cfg["page_size"]
    pages = [notes[i: i + page_size] for i in range(0, len(notes), page_size)] or [[]]
    out: list[tuple[Path, str | None]] = []

    # Hub: topic links, pager, JSON-LD list (cards were limited to page 1 already)
    hub = set_region(hub, "FN-TOPICS", fn_topics_nav(topics, None), cfg["hub"])
    hub = set_region(hub, "FN-PAGER", fn_pager(1, len(pages)), cfg["hub"])
    hub = set_item_list(hub, pages[0], cfg["hub"])

    wanted: set[Path] = set()
    render = cfg["render"]

    def abs_cards(group: list[dict]) -> str:
        return "".join(render(n, ctx).replace(f'<a href="{attr(n["slug"])}"', f'<a href="/field-notes/{attr(n["slug"])}"', 1) for n in group)

    for t in topics:
        group = [n for n in notes if t["key"] in n["categories"]]
        url = f"{SITE}/field-notes/topics/{t['key']}"
        desc = norm(t.get("description", "")) or f"Field Notes about {t['label']}."
        page = fn_derive(
            hub, url=url,
            title=f"{t['label']} - Field Notes | Scott Labz",
            social_title=f"{t['label']} Field Notes | Scott Labz",
            description=desc, h1=f"Field Notes: {t['label']}", intro=desc,
            cards=abs_cards(group), topics_nav=fn_topics_nav(topics, t["key"]), pager="",
            notes=group, keep_filter=False,
        )
        path = ROOT / FN_TOPICS_DIR / f"{t['key']}.html"
        wanted.add(path)
        out.append((path, page))

    for no, group in enumerate(pages[1:], 2):
        url = f"{SITE}/field-notes/page/{no}"
        page = fn_derive(
            hub, url=url,
            title=f"Field Notes - Page {no} | Scott Labz",
            social_title=f"Field Notes, Page {no} | Scott Labz",
            description=f"Older Field Notes, page {no} of {len(pages)}: real breakdowns of measurement problems and technical decisions, written as they happened.",
            h1="Field Notes", intro=f"Older notes, page {no} of {len(pages)}.",
            cards=abs_cards(group), topics_nav=fn_topics_nav(topics, None), pager=fn_pager(no, len(pages)),
            notes=group, keep_filter=True,
        )
        path = ROOT / FN_PAGES_DIR / f"{no}.html"
        wanted.add(path)
        out.append((path, page))

    # Each generated folder gets the site's usual redirect stub as its
    # index.html, pointing back to the hub; stale pages (a topic with no
    # notes left, a page number no longer needed) are deleted, stub too
    # once its folder has nothing else in it.
    for folder in (FN_TOPICS_DIR, FN_PAGES_DIR):
        stub = ROOT / folder / "index.html"
        if any(p.parent == ROOT / folder for p in wanted):
            wanted.add(stub)
            out.append((stub, redirect_stub("/field-notes/")))
        for stale in sorted((ROOT / folder).glob("*.html")) if (ROOT / folder).is_dir() else []:
            if stale not in wanted:
                out.append((stale, None))

    # Related reading in each article
    by_key = {t["key"]: t for t in config}
    for n in notes:
        path = ROOT / cfg["dir"] / n["file"]
        page = path.read_text(encoding="utf-8")
        topic = by_key.get(n["categories"][0]) if n["categories"] else None
        block = fn_related_block(n, fn_pick_related(n, notes), topic)
        if "<!-- FN-RELATED:START" not in page:
            m = FN_CTA_RE.search(page)
            if not m:
                raise SectionError(f"field-notes/{n['file']}: no closing call-to-action <section> before </main> to place the Keep reading block above")
            page = page[: m.start()] + "\n        <!-- FN-RELATED:START -->\n        <!-- FN-RELATED:END -->\n" + page[m.start() + 1:]
        page = set_region(page, "FN-RELATED", block, f"field-notes/{n['file']}")
        out.append((path, page))

    return hub, out


# --- Insights --------------------------------------------------------------

def ins_build(meta: dict, path: Path, ctx: dict, errors: list[str]) -> dict:
    where = f"insights/{path.name}"
    return {
        "slug": path.stem,
        "file": path.name,
        "url": f"{SITE}/insights/{path.stem}",
        "number": parse_number(meta["insight-number"], where, errors),
        "title": norm(meta["insight-title"]),
        "summary": norm(meta["insight-summary"]),
        "categories": parse_categories(meta["insight-categories"], ctx["labels"], where, errors),
        "published": parse_date(meta["insight-published"], where, errors),
    }


def ins_order(notes: list[dict], errors: list[str]) -> list[dict]:
    unique_numbers(notes, "insights", errors)
    return sorted(notes, key=lambda n: n["number"])


def ins_render(n: dict, ctx: dict) -> str:
    kicker = ctx["labels"].get(n["categories"][0], "") if n["categories"] else ""
    return (
        f'          <a href="/insights/{attr(n["slug"])}" class="idea-row" data-categories="{attr(" ".join(n["categories"]))}">\n'
        f'            <span class="idea-number">{n["number"]:02d}</span>\n'
        f'            <span class="idea-body">\n'
        f'              <span class="idea-kicker">{text(kicker)}</span>\n'
        f'              <span class="idea-title">{text(n["title"])}</span>\n'
        f'              <p class="idea-excerpt">{text(n["summary"])}</p>\n'
        f'            </span>\n'
        f'            <i class="fas fa-arrow-right idea-arrow"></i>\n'
        f'          </a>\n'
    )


# --- Signals ---------------------------------------------------------------

def sig_build(meta: dict, path: Path, ctx: dict, errors: list[str]) -> dict:
    where = f"signals/{path.name}"
    status = meta["signal-status"].strip().lower()
    if status not in SIGNAL_STATUS:
        errors.append(f"{where}: signal-status must be one of {', '.join(SIGNAL_STATUS)}, got {status!r}")
    return {
        "slug": path.stem,
        "file": path.name,
        "url": f"{SITE}/signals/{path.stem}",
        "number": parse_number(meta["signal-number"], where, errors),
        "title": norm(meta["signal-title"]),
        "summary": norm(meta["signal-summary"]),
        "status": status,
        "published": parse_date(meta["signal-published"], where, errors),
    }


def sig_order(notes: list[dict], errors: list[str]) -> list[dict]:
    unique_numbers(notes, "signals", errors)
    return sorted(notes, key=lambda n: n["number"], reverse=True)


def sig_render(n: dict, ctx: dict) -> str:
    try:
        month = date.fromisoformat(n["published"]).strftime("%b %Y")
    except ValueError:
        month = ""
    label = SIGNAL_STATUS.get(n["status"], "")
    return (
        f'              <a href="/signals/{attr(n["slug"])}" class="signal-card sig-{n["status"]}">\n'
        f'                <span class="signal-lamp" aria-hidden="true"></span>\n'
        f'                <div>\n'
        f'                  <span class="signal-meta">Signal {n["number"]:02d} &middot; {month} &middot; <b>{text(label)}</b></span>\n'
        f'                  <h3>{text(n["title"])}</h3>\n'
        f'                  <p>{text(n["summary"])}</p>\n'
        f'                  <span class="signal-read">Read signal<i class="fas fa-arrow-right" aria-hidden="true"></i></span>\n'
        f'                </div>\n'
        f'              </a>\n'
    )


# --- Case Studies ----------------------------------------------------------

CS_TYPES = ("client", "deep-dive")
CS_CLIENT_REQUIRED = ("cs-caption", "cs-logo", "cs-logo-width", "cs-logo-height", "cs-logo-alt")
CS_DEEP_REQUIRED = ("cs-categories", "cs-image-alt")
CS_ITEMS_RE = re.compile(r'("itemListElement": \[\n)((?:(?!</script>).)*?)(\n( *)\])', re.S)


def asset_version(rel: str) -> str:
    """Same 10-character content hash cache_bust.py appends as ?v=."""
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


def filter_colors(hub_html: str) -> dict[str, str]:
    m = FILTER_JSON_RE.search(hub_html)
    return {c["key"]: c.get("color", "") for c in json.loads(m.group(1))} if m else {}


def cs_build(meta: dict, path: Path, ctx: dict, errors: list[str]) -> dict | None:
    where = f"case-studies/{path.name}"
    kind = meta["cs-type"].strip()
    if kind not in CS_TYPES:
        errors.append(f"{where}: cs-type must be one of {', '.join(CS_TYPES)}, got {kind!r}")
        return None
    note = {
        "slug": path.stem,
        "file": path.name,
        "url": f"{SITE}/case-studies/{path.stem}",
        "type": kind,
        "order": parse_number(meta["cs-order"], where, errors),
        "title": norm(meta["cs-title"]),
        "summary": norm(meta["cs-summary"]),
    }
    need = CS_CLIENT_REQUIRED if kind == "client" else CS_DEEP_REQUIRED
    missing = [k for k in need if not meta.get(k, "").strip()]
    if missing:
        errors.append(f"{where}: missing {', '.join(missing)} (required for cs-type {kind})")
        return None
    if kind == "client":
        logo = meta["cs-logo"].strip().lstrip("/")
        if not (ROOT / logo).is_file():
            errors.append(f"{where}: cs-logo file {logo} not found")
        for k in ("cs-logo-width", "cs-logo-height"):
            if not meta[k].strip().isdigit():
                errors.append(f"{where}: {k} must be a whole number of pixels")
        note.update({
            "caption": norm(meta["cs-caption"]),
            "logo": logo,
            "logo_width": meta["cs-logo-width"].strip(),
            "logo_height": meta["cs-logo-height"].strip(),
            "logo_alt": norm(meta["cs-logo-alt"]),
            "button_class": meta.get("cs-button-class", "").strip(),
            "button_text": norm(meta.get("cs-button-text", "")) or f"View {note['title']} Case Study",
        })
    else:
        note["categories"] = parse_categories(meta["cs-categories"], ctx["labels"], where, errors)
        note["image_alt"] = norm(meta["cs-image-alt"])
        for size in ("480w", "960w"):
            thumb = f"images/cs-thumb-{path.stem}-{size}.webp"
            if not (ROOT / thumb).is_file():
                errors.append(f"{where}: thumbnail {thumb} not found")
    return note


def cs_render_client(n: dict) -> str:
    logo = f'{n["logo"]}?v={asset_version(n["logo"])}'
    button = " ".join(c for c in ("button big wide smooth-scroll", n["button_class"]) if c)
    return (
        f'                <div class="cs-client">\n'
        f'                  <img\n'
        f'                    src="{attr(logo)}"\n'
        f'                    width="{n["logo_width"]}"\n'
        f'                    height="{n["logo_height"]}"\n'
        f'                    alt="{attr(n["logo_alt"])}"\n'
        f'                    title="{attr(n["title"])}"\n'
        f'                    loading="lazy" />\n'
        f'                  <p class="cs-client-caption">{text(n["caption"])}</p>\n'
        f'                  <ul class="actions stacked">\n'
        f'                    <li>\n'
        f'                      <a href="case-studies/{attr(n["slug"])}"\n'
        f'                        class="{attr(button)}">\n'
        f'                        {text(n["button_text"])}\n'
        f'                      </a>\n'
        f'                    </li>\n'
        f'                  </ul>\n'
        f'                </div>\n'
    )


def cs_render_card(n: dict, ctx: dict) -> str:
    first = n["categories"][0]
    small = f'images/cs-thumb-{n["slug"]}-480w.webp'
    large = f'images/cs-thumb-{n["slug"]}-960w.webp'
    small_v = f"{small}?v={asset_version(small)}"
    large_v = f"{large}?v={asset_version(large)}"
    return (
        f'                <a href="case-studies/{attr(n["slug"])}" class="cs-card" data-categories="{attr(" ".join(n["categories"]))}" style="--cat: {ctx["colors"].get(first, "")}">\n'
        f'                  <img\n'
        f'                    src="{small_v}"\n'
        f'                    srcset="{small_v} 480w, {large_v} 960w"\n'
        f'                    sizes="(max-width: 600px) 100vw, (orientation: portrait) 50vw, 25vw"\n'
        f'                    width="480"\n'
        f'                    height="270"\n'
        f'                    alt="{attr(n["image_alt"])}"\n'
        f'                    title="{attr(n["image_alt"])}"\n'
        f'                    loading="lazy"\n'
        f'                    decoding="async" />\n'
        f'                  <span class="cs-card-body">\n'
        f'                    <span class="cs-card-tag">{text(ctx["labels"].get(first, ""))}</span>\n'
        f'                    <h3 class="cs-card-title">{text(n["title"])}</h3>\n'
        f'                    <span class="cs-card-text">{text(n["summary"])}</span>\n'
        f'                    <span class="cs-card-more">Read the case study<i class="fas fa-arrow-right" aria-hidden="true"></i></span>\n'
        f'                  </span>\n'
        f'                </a>\n'
    )


def replace_region(hub_html: str, marker: str, body: str, where: str) -> str:
    start, end = f"<!-- {marker}:START -->", f"<!-- {marker}:END -->"
    if hub_html.count(start) != 1 or hub_html.count(end) != 1:
        raise SectionError(f"{where} must contain exactly one {start} and one {end}")
    before, rest = hub_html.split(start, 1)
    _, after = rest.split(end, 1)
    return f"{before}{start}\n{body}                {end}{after}"


def generate_case_studies(name: str, cfg: dict) -> tuple[list[tuple[Path, str]], int]:
    hub_path = ROOT / cfg["hub"]
    hub_html = hub_path.read_text(encoding="utf-8")
    ctx = {"labels": filter_labels(hub_html, cfg["hub"]), "colors": filter_colors(hub_html)}

    errors: list[str] = []
    notes: list[dict] = []
    for path in sorted((ROOT / cfg["dir"]).glob("*.html")):
        if path.name in SKIP_FILES:
            continue
        head = path.read_text(encoding="utf-8").split("</head>", 1)[0]
        meta = {k.lower(): html.unescape(v) for k, v in META_RE.findall(head)}
        missing = [k for k in cfg["required"] if not meta.get(k, "").strip()]
        if missing:
            errors.append(f"{cfg['dir']}/{path.name}: missing {', '.join(missing)}")
            continue
        note = cs_build(meta, path, ctx, errors)
        if note:
            notes.append(note)

    clients = sorted((n for n in notes if n["type"] == "client"), key=lambda n: (n["order"], n["slug"]))
    deep = sorted((n for n in notes if n["type"] == "deep-dive"), key=lambda n: (n["order"], n["slug"]))
    for group, label in ((clients, "client"), (deep, "deep-dive")):
        seen: dict[int, str] = {}
        for n in group:
            if n["order"] in seen:
                errors.append(f"case-studies: cs-order {n['order']} used by both {seen[n['order']]} and {n['file']} ({label})")
            seen[n["order"]] = n["file"]
    if errors:
        raise SectionError("\n  - ".join([f"{name}: {len(errors)} problem(s)"] + errors))

    new_hub = replace_region(hub_html, "CS-CLIENTS", "\n".join(cs_render_client(n) for n in clients), cfg["hub"])
    new_hub = replace_region(new_hub, "CS-CARDS", "".join(cs_render_card(n, ctx) for n in deep), cfg["hub"])

    m = CS_ITEMS_RE.search(new_hub)
    if not m or len(CS_ITEMS_RE.findall(new_hub)) != 1:
        raise SectionError(f'{cfg["hub"]} must contain exactly one JSON-LD "itemListElement" array')
    pad = m.group(4) + "  "
    items = ",\n".join(
        f'{pad}{{\n{pad}  "@type": "ListItem",\n{pad}  "position": {i},\n{pad}  "url": "{n["url"]}"\n{pad}}}'
        for i, n in enumerate(clients + deep, 1)
    )
    new_hub = new_hub[: m.start(2)] + items + new_hub[m.end(2):]

    ordered = clients + deep
    manifest_path = ROOT / cfg["manifest"]
    new_manifest = json.dumps({"count": len(ordered), "notes": ordered}, indent=2, ensure_ascii=False) + "\n"
    out = []
    if new_hub != hub_html:
        out.append((hub_path, new_hub))
    old_manifest = manifest_path.read_text(encoding="utf-8") if manifest_path.exists() else ""
    if new_manifest != old_manifest:
        out.append((manifest_path, new_manifest))
    return out, len(ordered)


SECTIONS = {
    "field-notes": {
        "hub": "field-notes/index.html",
        "dir": "field-notes",
        "manifest": "field-notes/field-notes.json",
        "marker": "FN-CARDS",
        "indent": "        ",
        "required": ("fn-card-title", "fn-card-summary", "fn-categories", "fn-accent", "fn-published"),
        "uses_filter": True,
        "build": fn_build,
        "order": fn_order,
        "render": fn_render,
        "page_size": PAGE_SIZE,
        "post": fn_post,
    },
    "insights": {
        "hub": "insights.html",
        "dir": "insights",
        "manifest": "insights/insights.json",
        "marker": "INSIGHT-ROWS",
        "indent": "          ",
        "required": ("insight-number", "insight-title", "insight-summary", "insight-categories", "insight-published"),
        "uses_filter": True,
        "build": ins_build,
        "order": ins_order,
        "render": ins_render,
        "post": hub_list_post("Article"),
    },
    "signals": {
        "hub": "signals/index.html",
        "dir": "signals",
        "manifest": "signals/signals.json",
        "marker": "SIGNAL-CARDS",
        "indent": "              ",
        "required": ("signal-number", "signal-title", "signal-summary", "signal-status", "signal-published"),
        "uses_filter": False,
        "build": sig_build,
        "order": sig_order,
        "render": sig_render,
        "post": hub_list_post("ListItem"),
    },
    "case-studies": {
        "hub": "case-studies.html",
        "dir": "case-studies",
        "manifest": "case-studies/case-studies.json",
        "required": ("cs-type", "cs-order", "cs-title", "cs-summary"),
        "generate": generate_case_studies,
    },
}


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

def generate(name: str, cfg: dict) -> tuple[list[tuple[Path, str]], int]:
    """Return (files to write, note count). Raises SectionError on problems."""
    hub_path = ROOT / cfg["hub"]
    hub_html = hub_path.read_text(encoding="utf-8")

    marker = cfg["marker"]
    start_re = re.compile(rf"<!-- {marker}:START[^>]*-->")
    end_tag = f"<!-- {marker}:END -->"
    if len(start_re.findall(hub_html)) != 1 or hub_html.count(end_tag) != 1:
        raise SectionError(f"{cfg['hub']} must contain exactly one {marker}:START and one {marker}:END marker")

    ctx = {"labels": filter_labels(hub_html, cfg["hub"]) if cfg["uses_filter"] else {}}

    errors: list[str] = []
    notes: list[dict] = []
    for path in sorted((ROOT / cfg["dir"]).glob("*.html")):
        if path.name in SKIP_FILES:
            continue
        head = path.read_text(encoding="utf-8").split("</head>", 1)[0]
        meta = {k.lower(): html.unescape(v) for k, v in META_RE.findall(head)}
        missing = [k for k in cfg["required"] if not meta.get(k, "").strip()]
        if missing:
            errors.append(f"{cfg['dir']}/{path.name}: missing {', '.join(missing)}")
            continue
        notes.append(cfg["build"](meta, path, ctx, errors))
    notes = cfg["order"](notes, errors)
    if errors:
        raise SectionError("\n  - ".join([f"{name}: {len(errors)} problem(s)"] + errors))

    indent = cfg["indent"]
    start_line = f"<!-- {marker}:START - generated by scripts/generate_indexes.py, do not edit by hand -->"
    shown = notes[: cfg["page_size"]] if cfg.get("page_size") else notes
    cards = "".join(cfg["render"](n, ctx) for n in shown)
    m = start_re.search(hub_html)
    before = hub_html[: m.start()]
    after = hub_html[m.end():].split(end_tag, 1)[1]
    new_hub = f"{before}{start_line}\n{cards}{indent}{end_tag}{after}"
    extra: list[tuple[Path, str | None]] = []
    if cfg.get("post"):
        new_hub, extra = cfg["post"](notes, new_hub, ctx, cfg)

    manifest_path = ROOT / cfg["manifest"]
    new_manifest = json.dumps({"count": len(notes), "notes": notes}, indent=2, ensure_ascii=False) + "\n"

    out = []
    if new_hub != hub_html:
        out.append((hub_path, new_hub))
    old_manifest = manifest_path.read_text(encoding="utf-8") if manifest_path.exists() else ""
    if new_manifest != old_manifest:
        out.append((manifest_path, new_manifest))
    for path, content in extra:
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if content != current:
            out.append((path, content))
    return out, len(notes)


def main() -> None:
    args = sys.argv[1:]
    check = "--check" in args
    names = list(SECTIONS)
    if "--section" in args:
        i = args.index("--section")
        if i + 1 >= len(args) or args[i + 1] not in SECTIONS:
            print(f"--section must be one of: {', '.join(SECTIONS)}", file=sys.stderr)
            sys.exit(2)
        names = [args[i + 1]]

    pending, problems, counts = [], [], {}
    for name in names:
        try:
            cfg = SECTIONS[name]
            files, count = cfg.get("generate", generate)(name, cfg)
            pending.extend(files)
            counts[name] = count
        except SectionError as e:
            problems.append(str(e))

    if problems:
        print("generate_indexes: nothing written, fix these first:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)

    summary = ", ".join(f"{k} {v}" for k, v in counts.items())
    if check:
        if pending:
            stale = ", ".join(str(p.relative_to(ROOT)) for p, _ in pending)
            print(f"generate_indexes: out of date ({stale}) - run python scripts/generate_indexes.py", file=sys.stderr)
            sys.exit(1)
        print(f"generate_indexes: up to date ({summary})")
        return

    for path, content in pending:
        if content is None:
            path.unlink()
            if not any(path.parent.iterdir()):
                path.parent.rmdir()
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    if pending:
        wrote = ", ".join(str(p.relative_to(ROOT)) for p, c in pending if c is not None)
        removed = ", ".join(str(p.relative_to(ROOT)) for p, c in pending if c is None)
        parts = [f"wrote {wrote}" if wrote else "", f"removed {removed}" if removed else ""]
        print(f"generate_indexes: {'; '.join(x for x in parts if x)} ({summary})")
    else:
        print(f"generate_indexes: no changes ({summary})")


if __name__ == "__main__":
    main()
