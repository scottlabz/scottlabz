#!/usr/bin/env python3
"""Submit all sitemap URLs to IndexNow (api.indexnow.org) so participating
search engines (Bing, Yandex, Naver, Seznam, Yep) pick up changes quickly."""

import json
import re
import urllib.request
from pathlib import Path

HOST = "scottlabz.com"
KEY = "a83e6cef4870424d9c9e7b45b3ed47b8"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"

SITEMAP = Path(__file__).resolve().parent.parent / "sitemap.xml"


def load_urls():
    text = SITEMAP.read_text(encoding="utf-8")
    return re.findall(r"<loc>(.*?)</loc>", text)


def main():
    urls = load_urls()
    if not urls:
        raise SystemExit("No URLs found in sitemap.xml")

    payload = json.dumps(
        {
            "host": HOST,
            "key": KEY,
            "keyLocation": KEY_LOCATION,
            "urlList": urls,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        ENDPOINT,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Submitted {len(urls)} URLs -> {resp.status} {resp.reason}")
    except urllib.error.HTTPError as e:
        print(f"Submitted {len(urls)} URLs -> {e.code} {e.reason}")
        print(e.read().decode("utf-8", errors="replace"))


if __name__ == "__main__":
    main()
