#!/usr/bin/env python3
"""
Site audit for the hand-authored HTML site: sitemap completeness,
canonical URL correctness, internal link integrity, orphaned pages,
and <img> alt/title coverage.

Runs entirely against files on disk - no network calls, no build step.
Meant to run in CI on every push to main (see .github/workflows/audit.yml)
and locally via: python3 scripts/audit_site.py

Exit code 0 = clean. Exit code 1 = one or more checks failed.
"""

from __future__ import annotations

import html.parser
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

REPO_ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "scottlabz.com"

EXCLUDE_DIR_NAMES = {".git", "node_modules"}
# Not expected in sitemap.xml and not expected to receive inbound links.
EXCLUDE_FROM_SITEMAP_AND_ORPHAN_CHECKS = {"404.html"}

# Directory-listing redirect stubs (auto meta-refresh to "/") live at
# paths like assets/css/index.html, trust/index.html, etc. They aren't
# content pages - never expected in sitemap.xml, never expected to carry
# a canonical tag, never expected to receive inbound links.
STUB_SIGNATURE = 'http-equiv="refresh"'

IMG_TAG_PATTERN = re.compile(r"<img\b[^>]*?>", re.IGNORECASE | re.DOTALL)
ATTR_ALT_PATTERN = re.compile(r"\balt\s*=", re.IGNORECASE)
ATTR_TITLE_PATTERN = re.compile(r"\btitle\s*=", re.IGNORECASE)
ATTR_SRC_PATTERN = re.compile(r'\bsrc\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)

CANONICAL_PATTERN = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.IGNORECASE)
SITEMAP_LOC_PATTERN = re.compile(r"<loc>([^<]+)</loc>")

# Any href="..." or src="..." in HTML - used for the broken-link check
# (covers <a>, <link>, <img>, <script> alike).
HTML_REF_PATTERN = re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)

# <a href="...">...</a> specifically - used for orphan-page detection,
# so a broken canonical or stylesheet link can't accidentally count as
# a page being "linked to".
HTML_ANCHOR_HREF_PATTERN = re.compile(
    r'<a\b[^>]*?\bhref\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE | re.DOTALL
)

# href: "..." (navigation.js object literals) or href="..." (footer.js
# template-literal HTML) - both patterns appear across the two files
# that inject the site's nav and footer at runtime.
JS_HREF_PATTERN = re.compile(r'href\s*[:=]\s*["\']([^"\']+)["\']')

SKIP_HREF_PREFIXES = ("mailto:", "tel:", "javascript:", "data:", "#")

# --- structured-data consistency ---
LDJSON_PATTERN = re.compile(
    r'<script\s+type="application/ld\+json">(.*?)</script>', re.IGNORECASE | re.DOTALL
)
OG_URL_PATTERN = re.compile(r'<meta\s+property="og:url"\s+content="([^"]*)"', re.IGNORECASE | re.DOTALL)

# --- meta title/description ---
TITLE_PATTERN = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
META_DESC_PATTERN = re.compile(
    r'<meta\s+name="description"\s+content="([^"]*)"', re.IGNORECASE | re.DOTALL
)

# --- trust pages ---
TRUST_HUB_FILES = ("legal.html", "security-trust.html")

# --- HTML tag balance ---
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


def all_files(pattern: str) -> list[Path]:
    return sorted(
        p
        for p in REPO_ROOT.rglob(pattern)
        if not any(part in EXCLUDE_DIR_NAMES for part in p.parts)
    )


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def is_redirect_stub(path: Path) -> bool:
    if path.suffix != ".html":
        return False
    try:
        return STUB_SIGNATURE in path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False


def file_to_canonical_url(path: Path) -> str:
    """Expected canonical URL for an on-disk HTML file. index.html files
    canonicalize to their directory with a trailing slash."""
    r = rel(path)
    if r == "index.html":
        return f"https://{DOMAIN}/"
    if r.endswith("/index.html"):
        return f"https://{DOMAIN}/{r[: -len('index.html')]}"
    return f"https://{DOMAIN}/{r}"


def url_to_relpath(url: str) -> str | None:
    """Map a sitemap <loc> or canonical URL back to the on-disk relative
    path it should correspond to. Returns None for off-site URLs."""
    parts = urlsplit(url)
    if parts.netloc and parts.netloc != DOMAIN:
        return None
    path = parts.path
    if path in ("", "/"):
        return "index.html"
    if path.endswith("/"):
        return path.lstrip("/") + "index.html"
    return path.lstrip("/")


def resolve_ref(source_file: Path, ref: str) -> str | None:
    """Resolve an href/src value found in source_file to a repo-relative
    posix path. Returns None for external links, non-scottlabz absolute
    URLs, or anchors/protocols we don't track as files."""
    ref = ref.split("#", 1)[0].split("?", 1)[0]
    if not ref or ref.startswith(SKIP_HREF_PREFIXES):
        return None
    if "${" in ref:
        return None  # JS template-literal interpolation, not a static value
    if ref.startswith(("http://", "https://", "//")):
        parts = urlsplit(ref if "://" in ref else f"https:{ref}")
        if parts.netloc != DOMAIN:
            return None
        ref = parts.path or "/"

    if ref.startswith("/"):
        candidate_rel = ref.lstrip("/")
    else:
        candidate = (source_file.parent / ref).resolve()
        try:
            candidate_rel = candidate.relative_to(REPO_ROOT).as_posix()
        except ValueError:
            return None  # escapes the repo root - not our concern here

    if candidate_rel == "" or candidate_rel.endswith("/"):
        candidate_rel += "index.html"
    elif "." not in Path(candidate_rel).name:
        candidate_rel += "/index.html"
    return candidate_rel


def load_sitemap_urls() -> list[str]:
    text = (REPO_ROOT / "sitemap.xml").read_text(encoding="utf-8")
    return SITEMAP_LOC_PATTERN.findall(text)


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_sitemap_completeness(html_files: list[Path], sitemap_urls: list[str]):
    sitemap_relpaths = {url_to_relpath(u) for u in sitemap_urls}
    sitemap_relpaths.discard(None)

    disk_relpaths = {
        rel(f)
        for f in html_files
        if f.name not in EXCLUDE_FROM_SITEMAP_AND_ORPHAN_CHECKS and not is_redirect_stub(f)
    }

    missing_from_sitemap = sorted(disk_relpaths - sitemap_relpaths)
    stale_in_sitemap = sorted(
        u for u in sitemap_urls if url_to_relpath(u) not in disk_relpaths
    )
    return missing_from_sitemap, stale_in_sitemap


def check_canonicals(html_files: list[Path]):
    problems = []
    for f in html_files:
        if is_redirect_stub(f):
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        expected = file_to_canonical_url(f)
        m = CANONICAL_PATTERN.search(text)
        if not m:
            problems.append((rel(f), "(missing)", expected))
        elif m.group(1) != expected:
            problems.append((rel(f), m.group(1), expected))
    return problems


def check_broken_internal_links(html_files: list[Path], js_files: list[Path]):
    broken = []  # (source, raw_href, resolved_path_that_doesnt_exist)
    for f in html_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in HTML_REF_PATTERN.finditer(text):
            href = m.group(1)
            resolved = resolve_ref(f, href)
            if resolved is None:
                continue
            if not (REPO_ROOT / resolved).is_file():
                broken.append((rel(f), href, resolved))
    for f in js_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in JS_HREF_PATTERN.finditer(text):
            href = m.group(1)
            resolved = resolve_ref(f, href)
            if resolved is None:
                continue
            if not (REPO_ROOT / resolved).is_file():
                broken.append((rel(f), href, resolved))
    return broken


def check_orphan_pages(html_files: list[Path], js_files: list[Path], sitemap_urls: list[str]):
    linked_pages: set[str] = set()

    for f in html_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in HTML_ANCHOR_HREF_PATTERN.finditer(text):
            resolved = resolve_ref(f, m.group(1))
            if resolved and resolved.endswith(".html"):
                linked_pages.add(resolved)

    for f in js_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in JS_HREF_PATTERN.finditer(text):
            resolved = resolve_ref(f, m.group(1))
            if resolved and resolved.endswith(".html"):
                linked_pages.add(resolved)

    sitemap_relpaths = {url_to_relpath(u) for u in sitemap_urls}
    sitemap_relpaths.discard(None)

    orphans = sorted(
        p
        # landing.html is a standalone ad-landing page reached only via
        # external traffic - never expected to have an inbound link.
        for p in sitemap_relpaths - linked_pages - {"index.html", "landing.html"}
        if p not in EXCLUDE_FROM_SITEMAP_AND_ORPHAN_CHECKS
        and not is_redirect_stub(REPO_ROOT / p)
    )
    return orphans


def check_image_alt_title(html_files: list[Path], js_files: list[Path]):
    missing_alt = []
    missing_title = []
    for f in list(html_files) + list(js_files):
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in IMG_TAG_PATTERN.finditer(text):
            tag = m.group(0)
            src_m = ATTR_SRC_PATTERN.search(tag)
            src = src_m.group(1) if src_m else ""
            if src == "":
                continue  # JS-populated placeholder (e.g. lightbox shell), not a content image
            if not ATTR_ALT_PATTERN.search(tag):
                missing_alt.append((rel(f), src))
            if not ATTR_TITLE_PATTERN.search(tag):
                missing_title.append((rel(f), src))
    return missing_alt, missing_title


def check_trust_pages(html_files: list[Path]):
    """Every real page under /trust/ should have a front-door link from one
    of the two trust hub pages, so a visitor (or a search crawler) never has
    to stumble onto it incidentally."""
    trust_pages = {
        rel(f) for f in html_files if rel(f).startswith("trust/") and f.name != "index.html"
    }

    linked_from_hub: set[str] = set()
    for hub_name in TRUST_HUB_FILES:
        hub_path = REPO_ROOT / hub_name
        if not hub_path.is_file():
            continue
        text = hub_path.read_text(encoding="utf-8", errors="replace")
        for m in HTML_ANCHOR_HREF_PATTERN.finditer(text):
            resolved = resolve_ref(hub_path, m.group(1))
            if resolved and resolved.startswith("trust/"):
                linked_from_hub.add(resolved)

    return sorted(trust_pages - linked_from_hub)


def _extract_jsonld_urls(text: str) -> set[str]:
    """Collect the 'url' field of each entity that sits directly under
    @graph (the page's own identity: ProfessionalService, Person,
    CollectionPage, etc). Deliberately does not recurse into nested
    fields like mainEntity/hasPart/itemListElement, since hub pages
    legitimately list their child pages' URLs there - that's a listing,
    not a claim about what page this JSON-LD block itself describes."""
    urls: set[str] = set()
    for m in LDJSON_PATTERN.finditer(text):
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            nodes = data.get("@graph", [data])
        elif isinstance(data, list):
            nodes = data
        else:
            continue
        for node in nodes:
            if isinstance(node, dict) and isinstance(node.get("url"), str):
                urls.add(node["url"])
    return urls


def check_structured_data_consistency(html_files: list[Path]):
    """Canonical, og:url, and every JSON-LD 'url' field should all agree.
    Skips pages with no canonical tag at all - those are already reported
    by check_canonicals, and there's nothing to compare against here."""
    problems = []
    for f in html_files:
        if is_redirect_stub(f):
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        canonical_m = CANONICAL_PATTERN.search(text)
        if not canonical_m:
            continue
        canonical = canonical_m.group(1)

        mismatches = []
        og_m = OG_URL_PATTERN.search(text)
        if og_m and og_m.group(1) != canonical:
            mismatches.append(f"og:url is {og_m.group(1)!r}")

        bad_jsonld = sorted(u for u in _extract_jsonld_urls(text) if u != canonical)
        if bad_jsonld:
            mismatches.append(f"JSON-LD url is {bad_jsonld!r}")

        if mismatches:
            problems.append((rel(f), canonical, mismatches))
    return problems


def check_html_tag_balance(html_files: list[Path]):
    problems = []
    for f in html_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        stack: list[tuple[str, int]] = []
        errors: list[str] = []

        class _Checker(html.parser.HTMLParser):
            def handle_starttag(self_, tag, attrs):
                if tag not in VOID_ELEMENTS:
                    stack.append((tag, self_.getpos()[0]))

            def handle_startendtag(self_, tag, attrs):
                pass  # explicitly self-closed (e.g. <path ... />) - nothing to balance

            def handle_endtag(self_, tag):
                if tag in VOID_ELEMENTS:
                    return
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i][0] == tag:
                        skipped = stack[i + 1:]
                        if skipped:
                            names = ", ".join(f"<{t}> (opened line {ln})" for t, ln in skipped)
                            errors.append(
                                f"line {self_.getpos()[0]}: </{tag}> closes past unclosed {names}"
                            )
                        del stack[i:]
                        return
                errors.append(f"line {self_.getpos()[0]}: </{tag}> has no matching open tag")

        parser = _Checker(convert_charrefs=True)
        try:
            parser.feed(text)
        except Exception as e:  # pragma: no cover - defensive only
            problems.append((rel(f), [f"parser error: {e}"]))
            continue

        for tag, ln in stack:
            errors.append(f"line {ln}: <{tag}> never closed")
        if errors:
            problems.append((rel(f), errors))
    return problems


def check_meta_title_description(html_files: list[Path]):
    titles: dict[str, list[str]] = {}
    descriptions: dict[str, list[str]] = {}
    missing_title = []
    missing_description = []

    for f in html_files:
        if is_redirect_stub(f):
            continue
        text = f.read_text(encoding="utf-8", errors="replace")

        tm = TITLE_PATTERN.search(text)
        title = re.sub(r"\s+", " ", tm.group(1)).strip() if tm else ""
        if not title:
            missing_title.append(rel(f))
        else:
            titles.setdefault(title, []).append(rel(f))

        dm = META_DESC_PATTERN.search(text)
        desc = re.sub(r"\s+", " ", dm.group(1)).strip() if dm else ""
        if not desc:
            missing_description.append(rel(f))
        else:
            descriptions.setdefault(desc, []).append(rel(f))

    duplicate_titles = {t: fs for t, fs in titles.items() if len(fs) > 1}
    duplicate_descriptions = {d: fs for d, fs in descriptions.items() if len(fs) > 1}
    return missing_title, missing_description, duplicate_titles, duplicate_descriptions


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    html_files = all_files("*.html")
    js_files = all_files("*.js")
    sitemap_urls = load_sitemap_urls()

    failed = False
    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    missing_from_sitemap, stale_in_sitemap = check_sitemap_completeness(html_files, sitemap_urls)
    canonical_problems = check_canonicals(html_files)
    broken_links = check_broken_internal_links(html_files, js_files)
    orphan_pages = check_orphan_pages(html_files, js_files, sitemap_urls)
    missing_alt, missing_title = check_image_alt_title(html_files, js_files)
    orphan_trust_pages = check_trust_pages(html_files)
    structured_data_problems = check_structured_data_consistency(html_files)
    tag_balance_problems = check_html_tag_balance(html_files)
    (
        missing_page_title,
        missing_page_description,
        duplicate_titles,
        duplicate_descriptions,
    ) = check_meta_title_description(html_files)

    emit("=== Sitemap completeness ===")
    if missing_from_sitemap:
        failed = True
        emit(f"{len(missing_from_sitemap)} file(s) missing from sitemap.xml:")
        for p in missing_from_sitemap:
            emit(f"  - {p}")
    else:
        emit("OK - every on-disk HTML file has a sitemap entry.")
    if stale_in_sitemap:
        failed = True
        emit(f"{len(stale_in_sitemap)} sitemap URL(s) with no matching file:")
        for u in stale_in_sitemap:
            emit(f"  - {u}")

    emit()
    emit("=== Canonical tags ===")
    if canonical_problems:
        failed = True
        emit(f"{len(canonical_problems)} file(s) with missing/incorrect canonical:")
        for path, actual, expected in canonical_problems:
            emit(f"  - {path}: found {actual!r}, expected {expected!r}")
    else:
        emit("OK - every file's canonical tag matches its path.")

    emit()
    emit("=== Broken internal links ===")
    if broken_links:
        failed = True
        emit(f"{len(broken_links)} broken internal reference(s):")
        for source, href, resolved in broken_links:
            emit(f"  - {source} -> {href!r} (resolved: {resolved}, file not found)")
    else:
        emit("OK - every internal href/src resolves to a real file.")

    emit()
    emit("=== Orphaned pages (in sitemap, zero inbound links) ===")
    if orphan_pages:
        failed = True
        emit(f"{len(orphan_pages)} orphaned page(s):")
        for p in orphan_pages:
            emit(f"  - {p}")
    else:
        emit("OK - every sitemap page has at least one inbound link.")

    emit()
    emit("=== Image alt/title coverage ===")
    if missing_alt or missing_title:
        failed = True
        if missing_alt:
            emit(f"{len(missing_alt)} <img> tag(s) missing alt:")
            for path, src in missing_alt:
                emit(f"  - {path}: {src}")
        if missing_title:
            emit(f"{len(missing_title)} <img> tag(s) missing title:")
            for path, src in missing_title:
                emit(f"  - {path}: {src}")
    else:
        emit("OK - every <img> tag across .html and .js files has alt and title.")

    emit()
    emit("=== Trust page coverage (linked from legal.html / security-trust.html) ===")
    if orphan_trust_pages:
        failed = True
        emit(f"{len(orphan_trust_pages)} /trust/ page(s) with no front-door link from either hub:")
        for p in orphan_trust_pages:
            emit(f"  - {p}")
    else:
        emit("OK - every /trust/ page is linked from legal.html or security-trust.html.")

    emit()
    emit("=== Structured data consistency (canonical vs og:url vs JSON-LD) ===")
    if structured_data_problems:
        failed = True
        emit(f"{len(structured_data_problems)} page(s) with disagreeing URLs:")
        for path, canonical, mismatches in structured_data_problems:
            emit(f"  - {path}: canonical is {canonical!r}, but " + "; ".join(mismatches))
    else:
        emit("OK - canonical, og:url, and JSON-LD url all agree on every page.")

    emit()
    emit("=== HTML tag balance ===")
    if tag_balance_problems:
        failed = True
        emit(f"{len(tag_balance_problems)} file(s) with unbalanced tags:")
        for path, errors in tag_balance_problems:
            emit(f"  - {path}:")
            for err in errors:
                emit(f"      {err}")
    else:
        emit("OK - every file's tags open and close in balance.")

    emit()
    emit("=== Meta title / description ===")
    meta_clean = True
    if missing_page_title:
        failed = True
        meta_clean = False
        emit(f"{len(missing_page_title)} page(s) missing a <title>:")
        for p in missing_page_title:
            emit(f"  - {p}")
    if missing_page_description:
        failed = True
        meta_clean = False
        emit(f"{len(missing_page_description)} page(s) missing a meta description:")
        for p in missing_page_description:
            emit(f"  - {p}")
    if duplicate_titles:
        failed = True
        meta_clean = False
        emit(f"{len(duplicate_titles)} duplicate title(s) shared across pages:")
        for title, files in duplicate_titles.items():
            emit(f"  - {title!r}: {', '.join(files)}")
    if duplicate_descriptions:
        failed = True
        meta_clean = False
        emit(f"{len(duplicate_descriptions)} duplicate meta description(s) shared across pages:")
        for desc, files in duplicate_descriptions.items():
            emit(f"  - {desc[:60]!r}...: {', '.join(files)}")
    if meta_clean:
        emit("OK - every page has a unique title and meta description.")

    emit()
    emit("=== FAILED ===" if failed else "=== ALL CHECKS PASSED ===")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        heading = "## :x: Site Audit - FAILED" if failed else "## :white_check_mark: Site Audit - passed"
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write(f"{heading}\n\n```\n" + "\n".join(lines) + "\n```\n")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
