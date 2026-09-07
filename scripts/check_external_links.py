#!/usr/bin/env python3
"""
Checks that every external (non-scottlabz.com) link on the site still
resolves. Unlike audit_site.py, this makes real network calls, so it
runs on its own weekly-cron workflow (see .github/workflows/external-
links.yml) instead of on every push - live checks are inherently
flakier than static file checks, and shouldn't gate a content deploy.

Findings are split into two tiers:
  - BROKEN: DNS failure, connection refused, timeout after retry, or a
    definitive 404/410/5xx. This fails the run.
  - WARNING: 403/429/999-class responses. Several directory sites and
    LinkedIn specifically return these to any non-browser request even
    when the page is completely fine, so these are reported but don't
    fail the run - they're worth a human glance, not a red X.

Exit code 0 = no BROKEN links (warnings may still be present).
Exit code 1 = one or more BROKEN links.
"""

from __future__ import annotations

import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

REPO_ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "scottlabz.com"
EXCLUDE_DIR_NAMES = {".git", "node_modules"}

HTML_REF_PATTERN = re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
JS_HREF_PATTERN = re.compile(r'href\s*[:=]\s*["\']([^"\']+)["\']')

TIMEOUT_SECONDS = 10
RETRY_COUNT = 1
RETRY_DELAY_SECONDS = 3

# Real browsers, not bot-blocking. Several directory/social sites 403 or
# 999 the default urllib UA even when the page itself is fine.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Status codes known to come from bot-blocking rather than a genuinely
# dead link - reported as a warning, not a failure.
WARNING_STATUS_CODES = {403, 429, 999}


def all_files(pattern: str) -> list[Path]:
    return sorted(
        p for p in REPO_ROOT.rglob(pattern) if not any(part in EXCLUDE_DIR_NAMES for part in p.parts)
    )


def collect_external_links() -> dict[str, list[str]]:
    """Returns {url: [source files that reference it]}."""
    links: dict[str, list[str]] = {}

    def add(url: str, source: str) -> None:
        url = url.split("#", 1)[0]
        if "${" in url:
            return  # JS template-literal placeholder, not a real static URL
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https"):
            return
        if parts.netloc == DOMAIN or parts.netloc.endswith(f".{DOMAIN}"):
            return
        links.setdefault(url, [])
        if source not in links[url]:
            links[url].append(source)

    for f in all_files("*.html"):
        text = f.read_text(encoding="utf-8", errors="replace")
        source = f.relative_to(REPO_ROOT).as_posix()
        for m in HTML_REF_PATTERN.finditer(text):
            add(m.group(1), source)

    for f in all_files("*.js"):
        text = f.read_text(encoding="utf-8", errors="replace")
        source = f.relative_to(REPO_ROOT).as_posix()
        for m in JS_HREF_PATTERN.finditer(text):
            add(m.group(1), source)

    return links


def check_url(url: str) -> tuple[int | None, str]:
    """Returns (status_code, method_used). status_code is None if the
    request failed outright (DNS/connection/timeout) after retries."""
    last_error = ""
    for method in ("HEAD", "GET"):
        for attempt in range(RETRY_COUNT + 1):
            req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                    return resp.status, method
            except urllib.error.HTTPError as e:
                return e.code, method  # server responded, just not with 2xx/3xx
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                last_error = str(e)
                if attempt < RETRY_COUNT:
                    time.sleep(RETRY_DELAY_SECONDS)
        # HEAD failed outright (not just non-2xx) - some servers reject HEAD entirely; try GET
    print(f"    (all attempts failed: {last_error})")
    return None, "GET"


def main() -> int:
    links = collect_external_links()
    broken: list[tuple[str, list[str], str]] = []
    warned: list[tuple[str, list[str], int]] = []
    ok_count = 0

    print(f"Checking {len(links)} external link(s)...\n")
    for url in sorted(links):
        sources = links[url]
        status, method = check_url(url)
        if status is None:
            broken.append((url, sources, "no response (DNS/connection/timeout)"))
            print(f"  BROKEN  {url}  (no response)")
        elif status in WARNING_STATUS_CODES:
            warned.append((url, sources, status))
            print(f"  WARN    {url}  ({status} via {method}, likely bot-blocked)")
        elif 200 <= status < 400:
            ok_count += 1
            print(f"  OK      {url}  ({status})")
        else:
            broken.append((url, sources, f"HTTP {status}"))
            print(f"  BROKEN  {url}  ({status} via {method})")

    print()
    print(f"=== {ok_count} OK, {len(warned)} warning(s), {len(broken)} broken ===")

    if warned:
        print("\nWarnings (not failing the build - verify manually if curious):")
        for url, sources, status in warned:
            print(f"  - {url} ({status}) - referenced from: {', '.join(sources)}")

    if broken:
        print("\nBroken links:")
        for url, sources, reason in broken:
            print(f"  - {url} ({reason}) - referenced from: {', '.join(sources)}")

    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
