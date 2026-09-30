#!/usr/bin/env python3
"""Local preview server that resolves clean URLs the way Cloudflare Pages does.

Site links are extensionless (/about, /insights/delete-with-proof), which
`python -m http.server` can't map to about.html. This tries the path as-is,
then path + ".html", then path/index.html, and serves 404.html otherwise.

Usage: python3 scripts/serve.py [port]   (default 8000, serves the repo root)
"""
import errno
import http.server
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        local = Path(self.translate_path(path))
        # /insights must serve insights.html even though an insights/
        # directory exists - Cloudflare prefers the .html file too.
        if (not path.endswith("/") and not local.is_file()
                and local.with_name(local.name + ".html").is_file()):
            query = self.path[len(path):]
            self.path = path + ".html" + query
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        # Serve the site's own 404 page (still with a 404 status).
        page = ROOT / "404.html"
        if code != 404 or not page.is_file():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)
    try:
        httpd = http.server.ThreadingHTTPServer(("", port), CleanURLHandler)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        sys.exit(
            f"Port {port} is already in use - a server is probably already "
            f"running at http://localhost:{port}/\n"
            f"Stop it first (lsof -ti :{port} | xargs kill) or pick another "
            f"port: python3 scripts/serve.py {port + 1}"
        )
    with httpd:
        print(f"Serving {ROOT} at http://localhost:{port}/  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
