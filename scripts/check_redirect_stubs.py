#!/usr/bin/env python3
"""
Redirect-stub validator for the site's meta-refresh directory stubs
(e.g. assets/index.html, trust/index.html - see STUB_SIGNATURE in
audit_site.py). That script detects stubs but never checks where they
point; this one does two things audit_site.py doesn't:

  1. Follows each stub's redirect target and confirms it lands on a
     real, non-stub file within one hop - catching a target that's
     been deleted/renamed, or a stub that redirects to another stub
     (a chain), which GitHub Pages (no server-side redirects) would
     otherwise serve as two round trips instead of one.

  2. Confirms every directory in the repo has its own index.html
     (stub or real hub page). The site currently protects every
     directory this way, down to nested ones (assets/ AND assets/css/
     AND assets/js/ each have their own, independently) - this check
     flags any directory that breaks that pattern.

Runs entirely against files on disk - no network calls.
Exit code 0 = clean. Exit code 1 = one or more checks failed.
Usage: python3 scripts/check_redirect_stubs.py
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

REPO_ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "scottlabz.com"

EXCLUDE_DIR_NAMES = {".git", ".github", ".well-known", "node_modules", ".claude"}

META_REFRESH_TAG_PATTERN = re.compile(
    r'<meta\s+[^>]*http-equiv\s*=\s*["\']refresh["\'][^>]*>', re.IGNORECASE
)
CONTENT_ATTR_PATTERN = re.compile(r'content\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
URL_IN_CONTENT_PATTERN = re.compile(r'url\s*=\s*(.+)$', re.IGNORECASE)


def all_dirs() -> list[Path]:
    return sorted(
        p
        for p in REPO_ROOT.rglob("*")
        if p.is_dir() and not any(part in EXCLUDE_DIR_NAMES for part in p.parts)
    )


def all_html_files() -> list[Path]:
    return sorted(
        p
        for p in REPO_ROOT.rglob("*.html")
        if not any(part in EXCLUDE_DIR_NAMES for part in p.parts)
    )


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def find_stub_target(text: str) -> str | None:
    """Returns the raw url= value from a meta-refresh tag, or None if
    the file has no such tag (i.e. isn't a redirect stub)."""
    tag_m = META_REFRESH_TAG_PATTERN.search(text)
    if not tag_m:
        return None
    content_m = CONTENT_ATTR_PATTERN.search(tag_m.group(0))
    if not content_m:
        return None
    url_m = URL_IN_CONTENT_PATTERN.search(content_m.group(1))
    if not url_m:
        return None
    return url_m.group(1).strip()


def resolve_target(source_file: Path, target: str) -> Path | None:
    """Resolve a stub's url= value to a repo-relative on-disk path.
    Returns None for off-site targets - not ours to validate."""
    target = target.split("#", 1)[0].split("?", 1)[0]
    if not target:
        return None
    if target.startswith(("http://", "https://", "//")):
        parts = urlsplit(target if "://" in target else f"https:{target}")
        if parts.netloc != DOMAIN:
            return None
        target = parts.path or "/"

    if target.startswith("/"):
        rel_path = target.lstrip("/")
    else:
        candidate = (source_file.parent / target).resolve()
        try:
            rel_path = candidate.relative_to(REPO_ROOT).as_posix()
        except ValueError:
            return None

    if rel_path == "" or rel_path.endswith("/"):
        rel_path += "index.html"
    elif "." not in Path(rel_path).name:
        rel_path += "/index.html"
    return REPO_ROOT / rel_path


def follow_chain(start: Path) -> tuple[list[str], str]:
    """Follow a stub's redirect chain to its destination. Returns
    (hops, status): status is 'ok' (ends on a real non-stub file),
    'missing' (a hop's target doesn't exist on disk), 'loop' (the
    chain revisits a file already in it), or 'external' (a hop leaves
    scottlabz.com - not further checked)."""
    hops = [rel(start)]
    seen = {start}
    current = start
    while True:
        text = current.read_text(encoding="utf-8", errors="replace")
        target_raw = find_stub_target(text)
        if target_raw is None:
            return hops, "ok"

        if target_raw.startswith(("http://", "https://", "//")):
            parts = urlsplit(target_raw if "://" in target_raw else f"https:{target_raw}")
            if parts.netloc != DOMAIN:
                hops.append(target_raw)
                return hops, "external"

        target_path = resolve_target(current, target_raw)
        if target_path is None or not target_path.is_file():
            hops.append(target_raw)
            return hops, "missing"
        if target_path in seen:
            hops.append(rel(target_path))
            return hops, "loop"

        seen.add(target_path)
        hops.append(rel(target_path))
        current = target_path


def check_stub_targets(html_files: list[Path]):
    findings = []
    for f in html_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        if find_stub_target(text) is None:
            continue
        hops, status = follow_chain(f)
        if status == "missing":
            findings.append((rel(f), "target does not exist", hops))
        elif status == "loop":
            findings.append((rel(f), "redirect loop", hops))
        elif status != "external" and len(hops) > 2:
            findings.append((rel(f), "redirect chain (more than one hop)", hops))
    return findings


def check_directory_coverage(dirs: list[Path]):
    return [rel(d) for d in dirs if not (d / "index.html").is_file()]


def main() -> int:
    html_files = all_html_files()
    dirs = all_dirs()

    failed = False
    lines: list[str] = []

    def emit(text: str = "") -> None:
        print(text)
        lines.append(text)

    stub_findings = check_stub_targets(html_files)
    missing_index = check_directory_coverage(dirs)

    emit("=== Redirect-stub targets ===")
    if stub_findings:
        failed = True
        emit(f"{len(stub_findings)} stub(s) with a problem:")
        for path, problem, hops in stub_findings:
            emit(f"  - {path}: {problem} ({' -> '.join(hops)})")
    else:
        emit("OK - every redirect stub resolves to a real, non-stub file in one hop.")

    emit()
    emit("=== Directory index.html coverage ===")
    if missing_index:
        failed = True
        emit(f"{len(missing_index)} director(y/ies) with no index.html (stub or real hub):")
        for d in missing_index:
            emit(f"  - {d}/")
    else:
        emit("OK - every directory has an index.html.")

    emit()
    emit("=== FAILED ===" if failed else "=== ALL CHECKS PASSED ===")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        heading = "## :x: Redirect Stub Check - FAILED" if failed else "## :white_check_mark: Redirect Stub Check - passed"
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write(f"{heading}\n\n```\n" + "\n".join(lines) + "\n```\n")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
