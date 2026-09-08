import subprocess
from datetime import datetime
from pathlib import Path

SITE = "https://scottlabz.com"

ROOT = Path(__file__).resolve().parent.parent

# Directories to completely skip
EXCLUDE_DIRS = {
    "assets",
    "images",
    "scripts",
    "css",
    "sass",
    "webfonts",
    ".git",
}

EXCLUDE_FILES = {
    "404.html",
    "nav-demo.html",
    "filter-bar-demo.html",
}

# Subdirectory index.html files are, by default, redirect stubs (e.g.
# case-studies/index.html, trust/index.html) and get skipped below. These
# are real content hub pages, not stubs - keep them in the sitemap the
# same way insights.html (a sibling hub page) already is.
INCLUDE_SUBDIR_INDEX = {
    "field-notes/index.html",
    "diagnostics/index.html",
    "signals/index.html",
}

MAIN_PAGES = {
    "index.html": ("1.0", "monthly"),
    "services.html": ("0.9", "monthly"),
    "about.html": ("0.8", "monthly"),
    "contact.html": ("0.8", "monthly"),
    "analytics-data.html": ("0.8", "monthly"),
    "web-digital.html": ("0.8", "monthly"),
    "case-studies.html": ("0.8", "monthly"),
    "legal.html": ("0.5", "monthly"),
    "landing.html": ("0.4", "monthly"),
}

DEFAULT = ("0.3", "yearly")
CASE_STUDY = ("0.7", "yearly")

today = datetime.utcnow().strftime("%Y-%m-%d")


# This is the sitemap workflow's own auto-commit message (see
# .github/workflows/sitemap.yml). That commit only rewrites the
# ?v=<hash> cache-bust query string on <link>/<script> tags whenever a
# shared CSS/JS file's content changes - it touches nearly every HTML
# file at once (92 of 96, last time it ran) but isn't a real content
# change to any of them. Left uncorrected for, it reproduces the exact
# bug this function exists to fix: almost every page would get today's
# date on almost every push, just one workflow run later than before.
AUTO_COMMIT_MESSAGE = "Auto-update sitemap.xml and asset cache-bust versions"


def build_lastmod_map() -> dict[str, str]:
  """One pass over the full commit history: map every path to the date
  of the most recent commit that made a real change to it, skipping the
  cache-bust workflow's own auto-commits (see AUTO_COMMIT_MESSAGE).
  Falls back to an empty map (every page then gets today's date, the old
  behavior) if git isn't available or this isn't a git checkout.

  Requires full history - a shallow clone (the actions/checkout default,
  fetch-depth: 1) only knows about its single boundary commit, so every
  file that exists there would look like it was "last touched" on that
  commit regardless of when it actually last changed. sitemap.yml's
  checkout step needs fetch-depth: 0 for this to report real dates.
  """
  try:
    result = subprocess.run(
      ["git", "log", "--name-only", "--format=COMMIT:%cd|%s", "--date=short"],
      cwd=ROOT,
      capture_output=True,
      text=True,
      check=True,
    )
  except (subprocess.CalledProcessError, FileNotFoundError):
    return {}

  lastmod_map: dict[str, str] = {}
  current_date = None
  skip_commit = False
  for line in result.stdout.splitlines():
    if line.startswith("COMMIT:"):
      date_part, _, subject = line[len("COMMIT:"):].partition("|")
      current_date = date_part
      skip_commit = subject == AUTO_COMMIT_MESSAGE
    elif line.strip() and current_date and not skip_commit:
      # First time we see a path is its most recent real-change commit,
      # since git log lists commits newest-first - don't overwrite with
      # an older date if the path shows up again further down the log.
      lastmod_map.setdefault(line.strip(), current_date)
  return lastmod_map


lastmod_map = build_lastmod_map()

pages = []

for file in sorted(ROOT.rglob("*.html")):

  # Skip if any parent part matches an excluded directory
  if any(part in EXCLUDE_DIRS for part in file.parts):
    continue

  if file.name in EXCLUDE_FILES:
    continue

  relative = file.relative_to(ROOT).as_posix()

  # Skip index.html files inside subdirectories (e.g., case-studies/index.html, trust/index.html)
  # unless it's the root index.html or an explicitly-included real page
  if file.name == "index.html" and relative != "index.html" and relative not in INCLUDE_SUBDIR_INDEX:
    continue

  if relative == "index.html":
    url = SITE + "/"
  else:
    url = SITE + "/" + relative

  if relative.startswith("case-studies/"):
    priority, freq = CASE_STUDY
  else:
    priority, freq = MAIN_PAGES.get(relative, DEFAULT)

  # A file with no git history yet (brand new, not committed) has no
  # entry in lastmod_map - today is the only accurate date it could have.
  lastmod = lastmod_map.get(relative, today)

  pages.append(f"""  <url>
    <loc>{url}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

{chr(10).join(pages)}

</urlset>
"""

(ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")

print(f"Generated {len(pages)} URLs.")
