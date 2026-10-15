#!/usr/bin/env python3
"""Generate the hub listings for Field Notes, Insights, and Case Studies
from per-page metadata, plus one JSON manifest per section.

Each article carries its own card data as <meta> tags in <head>. This
script reads them, validates them, and rewrites only the region between
that section's START/END markers on its hub page. Everything outside the
markers (hero, section heads, CSS) stays hand-authored.

Sections
--------
field-notes  hub: field-notes/index.html   articles: field-notes/*.html
    fn-card-title, fn-card-summary, fn-categories, fn-accent, fn-published
    Order: newest fn-published first, ties by slug A-Z. Every note is
    listed on the hub (no topic pages, paging, filter or search since
    Oct 2026).

    Also generated for field-notes (see fn_post):
      - the hub's JSON-LD ItemList: every Field Note, then every Insight,
        in the order the page shows them
      - a "Keep reading" block (FN-RELATED markers) in every article,
        inserted before its closing call-to-action section: the notes
        sharing the most categories, newest first, topped up with the
        newest notes, plus a link back to the hub

insights     hub: field-notes/index.html   articles: insights/*.html
    insight-number, insight-title, insight-summary, insight-categories,
    insight-published
    Order: insight-number ascending. The rows fill the INSIGHT-ROWS
    region on the Field Notes hub (the Insights hub was folded into it in
    Oct 2026; /insights 301s there). Kicker text is the INSIGHT_CATEGORIES
    label of the first category.

case-studies  hub: case-studies.html
              client pages:    case-studies/<client>.html
              deep-dive pages: case-studies/<client>/<slug>.html
    Every page: cs-type (client or deep-dive), cs-order, cs-title,
    cs-summary.
    client:    cs-caption, cs-logo, cs-logo-width, cs-logo-height,
               cs-logo-alt, optional cs-button-class (branded button,
               e.g. hawkeye) and cs-button-text (default "View <title>
               Case Study").
    deep-dive: cs-categories, cs-image-alt. Thumbnails must exist at
               images/cs-thumb-<slug>-480w.webp and -960w.webp. A deep
               dive lives in the folder named after its client page
               (case-studies/hawkeye-fan-shop/digital-analytics-implementation.html
               belongs to case-studies/hawkeye-fan-shop.html), so its URL
               is /case-studies/<client>/<slug>.
    The hub is a client showcase: the CS-CLIENTS marker region holds
    one card per client page (by cs-order), and the hub's JSON-LD
    CollectionPage ItemList lists those client pages. Each client's
    deep-dive cards (cs-order within that client) fill the CS-CARDS
    region on that client's page, with root-absolute links and <h4> card
    titles.
    Deep-dive category keys, labels and colors come from CS_CATEGORIES
    below (the deep dives have no filter bar). Image ?v= hashes match
    cache_bust.py so the two scripts never undo each other. Clients that don't have a
    page yet (Kitchens) stay hand-authored after CS-CLIENTS:END.

Valid category keys come from FN_CATEGORIES, INSIGHT_CATEGORIES and
CS_CATEGORIES in this script; add a key there before using it in an
article. Numbers must be unique within a section.

Links and manifest URLs use the extensionless form Cloudflare Pages
serves (/insights/some-note, not /insights/some-note.html), which is
also what every canonical tag uses.

Exits non-zero and writes nothing if any section has an error.

Usage:
    python scripts/generate_indexes.py                # write all sections
    python scripts/generate_indexes.py --check        # exit 1 if anything is out of date
    python scripts/generate_indexes.py --section insights
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
# Skipped when collecting articles: hubs and meta-refresh redirect stubs.
SKIP_FILES = {"index.html"}

# Article categories: key -> label. They used to come from each hub's
# <scott-filter-bar>, which Scott removed (Oct 2026). Field Notes
# categories only drive the "Keep reading" picks; Insights labels are the
# row kickers (colored per key in the hub's CSS).
FN_CATEGORIES = {
    "measurement": "Measurement & Data",
    "infra": "Infrastructure & Ops",
}
INSIGHT_CATEGORIES = {
    "measurement": "Measurement",
    "search-data": "Search & Data",
    "systems": "Systems",
}

# Field Notes and Insights both write regions of field-notes/index.html,
# so each section reads files as the sections before it left them.
PENDING: dict[Path, str | None] = {}


def read_text(path: Path) -> str:
    return PENDING[path] if path in PENDING else path.read_text(encoding="utf-8")

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


# Field Notes extras: hub JSON-LD and related reading -----------------------

RELATED_COUNT = 3
# The array body may not run past its own <script> block
ITEMS_RE = re.compile(r'("itemListElement": \[\n)((?:(?!</script>).)*?)(\n( *)\])', re.S)
FN_CTA_RE = re.compile(r"\n        <section>\n(?:(?!<section).)*?</section>\n      </main>", re.S)


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


def fn_related_block(note: dict, related: list[dict]) -> str:
    i = "        "
    items = "".join(
        f'{i}      <li><a href="/field-notes/{attr(r["slug"])}" style="--accent: {r["accent"]}">'
        f'<span class="rn-title">{text(r["title"])}</span><span class="rn-sum">{text(r["summary"])}</span></a></li>\n'
        for r in related
    )
    return (
        f'{i}<section class="section-block fn-related" aria-labelledby="fn-related-title">\n'
        f'{i}  <h2 id="fn-related-title">Keep reading</h2>\n'
        f'{i}  <div class="related-notes">\n'
        f'{i}    <ul>\n{items}{i}    </ul>\n'
        f'{i}  </div>\n'
        f'{i}  <p class="related-work-all"><a href="/field-notes/">All Field Notes &rarr;</a></p>\n'
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
    # The hub lists every Field Note, then every Insight below them.
    insights = collect_notes("insights", SECTIONS["insights"])
    hub = set_item_list(hub, notes + insights, cfg["hub"])

    out: list[tuple[Path, str | None]] = []
    for n in notes:
        path = ROOT / cfg["dir"] / n["file"]
        page = read_text(path)
        block = fn_related_block(n, fn_pick_related(n, notes))
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


# --- Case Studies ----------------------------------------------------------

CS_TYPES = ("client", "deep-dive")
CS_CLIENT_REQUIRED = ("cs-caption", "cs-logo", "cs-logo-width", "cs-logo-height", "cs-logo-alt")
CS_DEEP_REQUIRED = ("cs-categories", "cs-image-alt")
CS_ITEMS_RE = re.compile(r'("itemListElement": \[\n)((?:(?!</script>).)*?)(\n( *)\])', re.S)


def asset_version(rel: str) -> str:
    """Same 10-character content hash cache_bust.py appends as ?v=."""
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:10]


def cs_build(meta: dict, path: Path, ctx: dict, errors: list[str]) -> dict | None:
    rel = path.relative_to(ROOT / "case-studies").with_suffix("").as_posix()
    where = f"case-studies/{rel}.html"
    kind = meta["cs-type"].strip()
    if kind not in CS_TYPES:
        errors.append(f"{where}: cs-type must be one of {', '.join(CS_TYPES)}, got {kind!r}")
        return None
    client = rel.split("/")[0] if "/" in rel else None
    if kind == "client" and client:
        errors.append(f"{where}: a client page belongs directly in case-studies/, not a subfolder")
        return None
    if kind == "deep-dive" and not client:
        errors.append(f"{where}: a deep dive belongs in its client's folder, e.g. case-studies/<client>/{path.name}")
        return None
    note = {
        "slug": path.stem,
        "path": rel,
        "client": client,
        "file": f"{rel}.html",
        "url": f"{SITE}/case-studies/{rel}",
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
    """One client showcase card on the hub. cs-button-class (e.g.
    hawkeye) sets both the branded button and the card's is-<class>
    accent; cs-button-text becomes the button's accessible name."""
    logo = f'{n["logo"]}?v={asset_version(n["logo"])}'
    brand = n["button_class"]
    card = " ".join(c for c in ("cs-showcase-card", f"is-{brand}" if brand else "") if c)
    button = " ".join(c for c in ("button wide", brand) if c)
    return (
        f'              <article class="{attr(card)}">\n'
        f'                <div class="cs-showcase-logo">\n'
        f'                  <img\n'
        f'                    src="{attr(logo)}"\n'
        f'                    width="{n["logo_width"]}"\n'
        f'                    height="{n["logo_height"]}"\n'
        f'                    alt="{attr(n["logo_alt"])}"\n'
        f'                    loading="lazy" />\n'
        f'                </div>\n'
        f'                <div class="cs-showcase-body">\n'
        f'                  <h2 class="cs-showcase-name">{text(n["title"])}</h2>\n'
        f'                  <p class="cs-showcase-caption">{text(n["caption"])}</p>\n'
        f'                  <p class="cs-showcase-summary">{text(n["summary"])}</p>\n'
        f'                  <a href="case-studies/{attr(n["slug"])}" class="{attr(button)}" aria-label="{attr(n["button_text"])}">View Case Study</a>\n'
        f'                </div>\n'
        f'              </article>\n'
    )


# Deep-dive categories: key -> (card tag label, card accent color). These
# lived in a <scott-filter-bar> on the Hawkeye Fan Shop page until Scott
# removed that filter (Oct 2026); add a key here before using it in a
# page's cs-categories.
CS_CATEGORIES = {
    "analytics": ("Analytics & Data", "#2563eb"),
    "web": ("Web & Digital", "#0f766e"),
    "optimization": ("Optimization", "#b45309"),
    "advertising": ("Advertising & Media", "#7c2d92"),
}


def cs_render_card(n: dict, ctx: dict, root: str = "", title_tag: str = "h3") -> str:
    first = n["categories"][0]
    small = f'images/cs-thumb-{n["slug"]}-480w.webp'
    large = f'images/cs-thumb-{n["slug"]}-960w.webp'
    small_v = f"{root}{small}?v={asset_version(small)}"
    large_v = f"{root}{large}?v={asset_version(large)}"
    return (
        f'                <a href="{root}case-studies/{attr(n["path"])}" class="cs-card" data-categories="{attr(" ".join(n["categories"]))}" style="--cat: {ctx["colors"].get(first, "")}">\n'
        f'                  <img\n'
        f'                    src="{small_v}"\n'
        f'                    srcset="{small_v} 480w, {large_v} 960w"\n'
        f'                    sizes="(max-width: 600px) 100vw, (orientation: portrait) 50vw, 25vw"\n'
        f'                    width="480"\n'
        f'                    height="270"\n'
        f'                    alt="{attr(n["image_alt"])}"\n'
        f'                    loading="lazy"\n'
        f'                    decoding="async" />\n'
        f'                  <span class="cs-card-body">\n'
        f'                    <span class="cs-card-tag">{text(ctx["labels"].get(first, ""))}</span>\n'
        f'                    <{title_tag} class="cs-card-title">{text(n["title"])}</{title_tag}>\n'
        f'                    <span class="cs-card-text">{text(n["summary"])}</span>\n'
        f'                    <span class="cs-card-more">Read the case study<i class="fas fa-arrow-right" aria-hidden="true"></i></span>\n'
        f'                  </span>\n'
        f'                </a>\n'
    )


def replace_region(hub_html: str, marker: str, body: str, where: str, indent: str = "                ") -> str:
    start, end = f"<!-- {marker}:START -->", f"<!-- {marker}:END -->"
    if hub_html.count(start) != 1 or hub_html.count(end) != 1:
        raise SectionError(f"{where} must contain exactly one {start} and one {end}")
    before, rest = hub_html.split(start, 1)
    _, after = rest.split(end, 1)
    return f"{before}{start}\n{body}{indent}{end}{after}"


def generate_case_studies(name: str, cfg: dict) -> tuple[list[tuple[Path, str]], int]:
    hub_path = ROOT / cfg["hub"]
    hub_html = hub_path.read_text(encoding="utf-8")
    ctx = {"labels": {k: v[0] for k, v in CS_CATEGORIES.items()},
           "colors": {k: v[1] for k, v in CS_CATEGORIES.items()}}

    errors: list[str] = []
    notes: list[dict] = []
    # Client pages at the top level, deep dives one folder down.
    pages = sorted((ROOT / cfg["dir"]).glob("*.html")) + sorted((ROOT / cfg["dir"]).glob("*/*.html"))
    for path in pages:
        if path.name in SKIP_FILES:
            continue
        rel = path.relative_to(ROOT).as_posix()
        head = path.read_text(encoding="utf-8").split("</head>", 1)[0]
        meta = {k.lower(): html.unescape(v) for k, v in META_RE.findall(head)}
        missing = [k for k in cfg["required"] if not meta.get(k, "").strip()]
        if missing:
            errors.append(f"{rel}: missing {', '.join(missing)}")
            continue
        note = cs_build(meta, path, ctx, errors)
        if note:
            notes.append(note)

    clients = sorted((n for n in notes if n["type"] == "client"), key=lambda n: (n["order"], n["slug"]))
    deep = sorted((n for n in notes if n["type"] == "deep-dive"), key=lambda n: (n["client"], n["order"], n["slug"]))
    client_slugs = {n["slug"] for n in clients}
    for n in deep:
        if n["client"] not in client_slugs:
            errors.append(f"case-studies/{n['file']}: folder {n['client']}/ has no client page case-studies/{n['client']}.html")
    groups = [(clients, "client")] + [
        ([n for n in deep if n["client"] == c], f"deep dives for {c}") for c in sorted({n["client"] for n in deep})
    ]
    for group, label in groups:
        seen: dict[int, str] = {}
        for n in group:
            if n["order"] in seen:
                errors.append(f"case-studies: cs-order {n['order']} used by both {seen[n['order']]} and {n['file']} ({label})")
            seen[n["order"]] = n["file"]
    if errors:
        raise SectionError("\n  - ".join([f"{name}: {len(errors)} problem(s)"] + errors))

    new_hub = replace_region(hub_html, "CS-CLIENTS", "".join(cs_render_client(n) for n in clients), cfg["hub"], indent="              ")

    m = CS_ITEMS_RE.search(new_hub)
    if not m or len(CS_ITEMS_RE.findall(new_hub)) != 1:
        raise SectionError(f'{cfg["hub"]} must contain exactly one JSON-LD "itemListElement" array')
    pad = m.group(4) + "  "
    items = ",\n".join(
        f'{pad}{{\n{pad}  "@type": "ListItem",\n{pad}  "position": {i},\n{pad}  "url": "{n["url"]}"\n{pad}}}'
        for i, n in enumerate(clients, 1)
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
    # Each client page shows the deep dives in its own folder.
    for client in sorted({n["client"] for n in deep}):
        rel_page = f"case-studies/{client}.html"
        page_path = ROOT / rel_page
        page = page_path.read_text(encoding="utf-8")
        cards = "".join(cs_render_card(n, ctx, root="/", title_tag="h4") for n in deep if n["client"] == client)
        new_page = replace_region(page, "CS-CARDS", cards, rel_page)
        if new_page != page:
            out.append((page_path, new_page))
    return out, len(ordered)


SECTIONS = {
    "field-notes": {
        "hub": "field-notes/index.html",
        "dir": "field-notes",
        "manifest": "field-notes/field-notes.json",
        "marker": "FN-CARDS",
        "indent": "        ",
        "required": ("fn-card-title", "fn-card-summary", "fn-categories", "fn-accent", "fn-published"),
        "labels": FN_CATEGORIES,
        "build": fn_build,
        "order": fn_order,
        "render": fn_render,
        "post": fn_post,
    },
    "insights": {
        "hub": "field-notes/index.html",
        "dir": "insights",
        "manifest": "insights/insights.json",
        "marker": "INSIGHT-ROWS",
        "indent": "          ",
        "required": ("insight-number", "insight-title", "insight-summary", "insight-categories", "insight-published"),
        "labels": INSIGHT_CATEGORIES,
        "build": ins_build,
        "order": ins_order,
        "render": ins_render,
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

def collect_notes(name: str, cfg: dict) -> list[dict]:
    """Read, validate and order a section's articles. Raises SectionError."""
    ctx = {"labels": cfg["labels"]}
    errors: list[str] = []
    notes: list[dict] = []
    for path in sorted((ROOT / cfg["dir"]).glob("*.html")):
        if path.name in SKIP_FILES:
            continue
        head = read_text(path).split("</head>", 1)[0]
        meta = {k.lower(): html.unescape(v) for k, v in META_RE.findall(head)}
        missing = [k for k in cfg["required"] if not meta.get(k, "").strip()]
        if missing:
            errors.append(f"{cfg['dir']}/{path.name}: missing {', '.join(missing)}")
            continue
        notes.append(cfg["build"](meta, path, ctx, errors))
    notes = cfg["order"](notes, errors)
    if errors:
        raise SectionError("\n  - ".join([f"{name}: {len(errors)} problem(s)"] + errors))
    return notes


def generate(name: str, cfg: dict) -> tuple[list[tuple[Path, str]], int]:
    """Return (files to write, note count). Raises SectionError on problems."""
    hub_path = ROOT / cfg["hub"]
    hub_html = read_text(hub_path)

    marker = cfg["marker"]
    start_re = re.compile(rf"<!-- {marker}:START[^>]*-->")
    end_tag = f"<!-- {marker}:END -->"
    if len(start_re.findall(hub_html)) != 1 or hub_html.count(end_tag) != 1:
        raise SectionError(f"{cfg['hub']} must contain exactly one {marker}:START and one {marker}:END marker")

    ctx = {"labels": cfg["labels"]}
    notes = collect_notes(name, cfg)

    indent = cfg["indent"]
    start_line = f"<!-- {marker}:START - generated by scripts/generate_indexes.py, do not edit by hand -->"
    cards = "".join(cfg["render"](n, ctx) for n in notes)
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
        current = read_text(path) if path.exists() or path in PENDING else None
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

    problems, counts = [], {}
    for name in names:
        try:
            cfg = SECTIONS[name]
            files, count = cfg.get("generate", generate)(name, cfg)
            PENDING.update(files)
            counts[name] = count
        except SectionError as e:
            problems.append(str(e))
    # A file two sections touched appears once, with both sets of changes.
    pending = [(p, c) for p, c in PENDING.items()
               if c != (p.read_text(encoding="utf-8") if p.exists() else None)]

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
