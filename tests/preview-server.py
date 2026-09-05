"""Dependency-free local preview with Cloudflare Pages-style clean HTML URLs."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import os

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if any(part.startswith('.') for part in Path(path).parts):
            self.send_error(404)
            return
        candidate = ROOT / path.lstrip('/')
        if path != '/' and not candidate.suffix and candidate.with_suffix('.html').is_file():
            self.path = path + '.html'
        super().do_GET()

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 4173), Preview)
    print('Tagalong preview: http://127.0.0.1:4173', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nPreview stopped.')
    finally:
        server.server_close()
