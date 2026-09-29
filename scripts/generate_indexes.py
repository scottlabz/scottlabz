#!/usr/bin/env python3
"""Generate the hub listings for Field Notes, Insights, and Signals from
per-article metadata, plus one JSON manifest per section.

Each article carries its own card data as <meta> tags in <head>. This
script reads them, validates them, and rewrites only the region between
that section's START/END markers on its hub page. Everything outside the
markers (hero, filter bar, legend, CSS) stays hand-authored.

Sections
--------
field-notes  hub: field-notes/index.html   articles: field-notes/*.html
    fn-card-title, fn-card-summary, fn-categories, fn-accent, fn-published
    Order: newest fn-published first, ties by slug A-Z.

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

Valid category keys for field-notes and insights come from the
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
    cards = "".join(cfg["render"](n, ctx) for n in notes)
    m = start_re.search(hub_html)
    before = hub_html[: m.start()]
    after = hub_html[m.end():].split(end_tag, 1)[1]
    new_hub = f"{before}{start_line}\n{cards}{indent}{end_tag}{after}"

    manifest_path = ROOT / cfg["manifest"]
    new_manifest = json.dumps({"count": len(notes), "notes": notes}, indent=2, ensure_ascii=False) + "\n"

    out = []
    if new_hub != hub_html:
        out.append((hub_path, new_hub))
    old_manifest = manifest_path.read_text(encoding="utf-8") if manifest_path.exists() else ""
    if new_manifest != old_manifest:
        out.append((manifest_path, new_manifest))
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
            files, count = generate(name, SECTIONS[name])
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
        path.write_text(content, encoding="utf-8")
    if pending:
        wrote = ", ".join(str(p.relative_to(ROOT)) for p, _ in pending)
        print(f"generate_indexes: wrote {wrote} ({summary})")
    else:
        print(f"generate_indexes: no changes ({summary})")


if __name__ == "__main__":
    main()
