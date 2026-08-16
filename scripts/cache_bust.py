#!/usr/bin/env python3
"""
Content-hash cache busting for local CSS/JS assets referenced in HTML files.

Rewrites href="...file.css" / src="...file.js" (local files only, not
http(s):// URLs) to href="...file.css?v=<hash>", where <hash> is derived
from the current content of the target file. Re-running this script is
always safe: unchanged files keep the same hash, so it only touches an
HTML file when the version string it should carry has actually changed.

No manual "remember to bump the version" step - the version *is* the
file's content hash.
"""

import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HASH_LENGTH = 10

ASSET_TAG_PATTERN = re.compile(
    r'(<(?:link|script)\b[^>]*?\b(?:href|src)=")([^"]+\.(?:css|js))(\??v=[0-9a-f]+)?(")',
    re.IGNORECASE,
)

EXCLUDE_DIR_NAMES = {".git", "node_modules"}


def resolve_asset_path(html_file: Path, ref: str) -> Path | None:
    """Resolve an href/src value to a real file on disk, or None if it's
    external / not a local asset we can hash."""
    if ref.startswith(("http://", "https://", "//", "data:")):
        return None
    if ref.startswith("/"):
        candidate = REPO_ROOT / ref.lstrip("/")
    else:
        candidate = (html_file.parent / ref).resolve()
    return candidate if candidate.is_file() else None


def content_hash(path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return digest[:HASH_LENGTH]


def process_file(html_file: Path) -> bool:
    original = html_file.read_text(encoding="utf-8")

    def replace(match: re.Match) -> str:
        prefix, ref, _old_version, suffix = match.groups()
        asset_path = resolve_asset_path(html_file, ref)
        if asset_path is None:
            return match.group(0)
        h = content_hash(asset_path)
        return f"{prefix}{ref}?v={h}{suffix}"

    updated = ASSET_TAG_PATTERN.sub(replace, original)
    if updated != original:
        html_file.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> int:
    changed = []
    for html_file in sorted(REPO_ROOT.rglob("*.html")):
        if any(part in EXCLUDE_DIR_NAMES for part in html_file.parts):
            continue
        if process_file(html_file):
            changed.append(html_file.relative_to(REPO_ROOT))

    if changed:
        print(f"Cache-busted {len(changed)} file(s):")
        for f in changed:
            print(f"  {f}")
    else:
        print("No changes - all cache-bust versions already up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
