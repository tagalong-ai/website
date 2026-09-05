#!/usr/bin/env python3
"""Check crawlable output, structured data, links, and source-file exclusion."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.canonicals, self.robots = set(), [], [], []
        self.h1 = 0
        self.structured, self.current_script = [], None
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'h1':
            self.h1 += 1
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name') == 'robots':
            self.robots.append(attrs.get('content', ''))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.current_script = ''
        if tag in ('a', 'link', 'img', 'script', 'source', 'video'):
            for attr in ('href', 'src', 'poster'):
                if attrs.get(attr):
                    self.links.append(attrs[attr])
    def handle_data(self, data):
        if self.current_script is not None:
            self.current_script += data
    def handle_endtag(self, tag):
        if tag == 'script' and self.current_script is not None:
            self.structured.append(json.loads(self.current_script))
            self.current_script = None

def resolve(out, path):
    target = out / unquote(path).lstrip('/')
    if target.is_dir():
        target = target / 'index.html'
    elif not target.suffix:
        target = target.with_suffix('.html')
    return target

def check(out):
    out = Path(out)
    errors = []
    docs = {p: Document(p.read_text()) for p in out.rglob('*.html') if not p.name.startswith('google')}
    for path, doc in docs.items():
        if len(doc.canonicals) != 1 or not doc.canonicals[0].startswith('https://tagalongai.com/'):
            errors.append(f'{path.relative_to(out)}: expected one production canonical')
        if not doc.structured:
            errors.append(f'{path.relative_to(out)}: missing structured data')
        if ('blog' in path.relative_to(out).parts or 'collections' in path.relative_to(out).parts) and doc.h1 != 1:
            errors.append(f'{path.relative_to(out)}: expected one h1')
        base = 'https://tagalongai.com/' + str(path.relative_to(out))
        for link in doc.links:
            url = urlsplit(urljoin(base, link))
            if url.netloc != 'tagalongai.com' or url.scheme not in ('http', 'https'):
                continue
            target = resolve(out, url.path)
            if not target.is_file():
                errors.append(f'{path.relative_to(out)}: missing target {link}')
            elif url.fragment and target in docs and unquote(url.fragment) not in docs[target].ids:
                errors.append(f'{path.relative_to(out)}: missing anchor {link}')
    sitemap = ET.parse(out / 'sitemap.xml')
    locations = [e.text for e in sitemap.findall('.//{*}loc')]
    if len(locations) != len(set(locations)):
        errors.append('Duplicate sitemap URL')
    for url in locations:
        target = resolve(out, urlsplit(url).path)
        if target not in docs or any('noindex' in value for value in docs[target].robots):
            errors.append(f'Sitemap target missing or not indexable: {url}')
        elif docs[target].canonicals != [url]:
            errors.append(f'Sitemap/canonical mismatch: {url}')
    for name in ('content', 'scripts', 'tests', '.git', 'requirements.txt', 'CONTENT.md'):
        if (out / name).exists():
            errors.append(f'Authoring file leaked into public output: {name}')
    ET.parse(out / 'feed.xml')
    if errors:
        raise ValueError('\n'.join(errors))
    print(f'Checked {len(docs)} pages: canonical URLs, metadata, JSON-LD, internal links, anchors, sitemap, feed, public output.')

if __name__ == '__main__':
    try:
        check(ROOT / ('.preview' if '--preview' in sys.argv else 'dist'))
    except (ValueError, ET.ParseError) as error:
        sys.exit(str(error))
