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

pages = []

for file in sorted(ROOT.rglob("*.html")):

  # Skip if any parent part matches an excluded directory
  if any(part in EXCLUDE_DIRS for part in file.parts):
    continue

  if file.name in EXCLUDE_FILES:
    continue

  relative = file.relative_to(ROOT).as_posix()

  # Skip index.html files inside subdirectories (e.g., case-studies/index.html, trust/index.html)
  # unless it's the root index.html
  if file.name == "index.html" and relative != "index.html":
    continue

  if relative == "index.html":
    url = SITE + "/"
  else:
    url = SITE + "/" + relative

  if relative.startswith("case-studies/"):
    priority, freq = CASE_STUDY
  else:
    priority, freq = MAIN_PAGES.get(file.name, DEFAULT)

  pages.append(f"""  <url>
    <loc>{url}</loc>
    <lastmod>{today}</lastmod>
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