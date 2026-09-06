#!/usr/bin/env python3
"""Serve a built site with clean URLs and real 404 responses."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Preview(SimpleHTTPRequestHandler):
    def list_directory(self, path):
        self.send_error(404)
        return None

    def send_head(self):
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        if any(part.startswith('.') for part in Path(path).parts):
            self.send_error(404)
            return None
        redirects = Path(self.directory) / '_redirects'
        if redirects.is_file():
            for line in redirects.read_text().splitlines():
                rule = line.split()
                if len(rule) == 3 and rule[0] == path and rule[1].startswith('/') and not rule[1].startswith('//') and rule[2] in ('301', '302', '307', '308'):
                    self.send_response(int(rule[2]))
                    self.send_header('Location', rule[1] + ('?' + parsed.query if parsed.query else ''))
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return None
        target = Path(self.translate_path(path))
        if path != '/' and not target.suffix and target.with_suffix('.html').is_file():
            self.path = parsed.path + '.html'
        target = Path(self.translate_path(self.path))
        if not target.exists():
            page = Path(self.directory) / '404.html'
            data = page.read_bytes()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            import io
            return io.BytesIO(data)
        return super().send_head()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--drafts', action='store_true')
    parser.add_argument('--port', type=int, default=4173)
    args = parser.parse_args()
    folder = ROOT / ('.preview' if args.drafts else 'dist')
    if not (folder / 'index.html').is_file():
        parser.error('Run python3 scripts/build.py' + (' --preview' if args.drafts else '') + ' first.')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), lambda *a, **kw: Preview(*a, directory=str(folder), **kw))
    print(f'Tagalong preview: http://127.0.0.1:{args.port}/blog/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
