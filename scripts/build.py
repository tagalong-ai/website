#!/usr/bin/env python3
"""Build Markdown content and the existing static site into a public-only directory."""
from __future__ import annotations
import argparse
from datetime import date, datetime, timezone
from html import escape
import json
from pathlib import Path
import re
import shutil
import struct
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from markdown_it import MarkdownIt
import yaml

ROOT = Path(__file__).resolve().parents[1]
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
STATIC = ('index.html', 'guide.html', 'privacy.html', 'terms.html', 'changelog.html', 'admin.html', 'success.html')
STYLES = ('styles.css', 'homepage.css', 'homepage.js', 'product-demo.css', 'content.css')
ALLOWED = {'title', 'description', 'date', 'updated', 'author', 'draft', 'collections', 'answer', 'faqs', 'resources', 'image', 'imageAlt', 'seoTitle', 'seoDescription', 'showCover'}

class ContentError(ValueError):
    pass

class UniqueLoader(yaml.SafeLoader):
    pass

def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ContentError(f'Duplicate front matter key: {key}')
        result[key] = loader.construct_object(value_node, deep=deep)
    return result
UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)

def text(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ContentError(f'{name} must be nonempty text')
    return value.strip()

def day(value, name):
    try:
        if isinstance(value, datetime):
            raise ValueError('Use a date, without a time')
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        raise ContentError(f'{name} must be YYYY-MM-DD') from None

def safe_url(value):
    value = text(value, 'URL')
    parsed = urlsplit(value)
    if '\\' in value or any(ord(c) < 32 for c in value) or value.startswith('//'):
        raise ContentError(f'Invalid URL: {value}')
    if not ((value.startswith('/') and not parsed.netloc) or (parsed.scheme == 'https' and parsed.netloc)):
        raise ContentError('Resource and image URLs must be root-relative or HTTPS')
    return value

def read_entry(path, kind, site):
    if not SLUG.fullmatch(path.stem):
        raise ContentError(f'{path.name}: use a lowercase, hyphenated filename')
    raw = path.read_text(encoding='utf-8')
    match = re.fullmatch(r'---\r?\n(.*?)\r?\n---\r?\n(.*)', raw, re.S)
    if not match:
        raise ContentError(f'{path.name}: missing YAML front matter')
    data = yaml.load(match[1], Loader=UniqueLoader)
    if not isinstance(data, dict) or set(data) - ALLOWED:
        raise ContentError(f'{path.name}: unknown or invalid front matter fields')
    for key in ('title', 'description'):
        data[key] = text(data.get(key), f'{path.name}: {key}')
    if not isinstance(data.get('draft'), bool):
        raise ContentError(f'{path.name}: explicitly set draft: true or false')
    data.update(slug=path.stem, kind=kind, body=text(match[2], f'{path.name}: body'))
    if kind == 'posts':
        data['date'] = day(data.get('date'), f'{path.name}: date')
        if data.get('author') not in site['authors']:
            raise ContentError(f'{path.name}: unknown author')
    data['updated'] = day(data.get('updated', data.get('date')), f'{path.name}: updated')
    if kind == 'posts' and data['updated'] < data['date']:
        raise ContentError(f'{path.name}: updated is before publication')
    for key in ('answer', 'seoTitle', 'seoDescription'):
        if key in data:
            data[key] = text(data[key], key)
    for key in ('collections', 'faqs', 'resources'):
        data.setdefault(key, [])
        if not isinstance(data[key], list):
            raise ContentError(f'{path.name}: {key} must be a list')
    if any(not isinstance(c, str) or not SLUG.fullmatch(c) for c in data['collections']):
        raise ContentError(f'{path.name}: invalid collection slug')
    if len(set(data['collections'])) != len(data['collections']):
        raise ContentError(f'{path.name}: duplicate collection')
    for faq in data['faqs']:
        if not isinstance(faq, dict) or set(faq) != {'question', 'answer'}:
            raise ContentError(f'{path.name}: FAQ requires question and answer')
        for key in faq:
            faq[key] = text(faq[key], key)
    for resource in data['resources']:
        if not isinstance(resource, dict) or set(resource) != {'title', 'url', 'description'}:
            raise ContentError(f'{path.name}: resource requires title, url, description')
        for key in ('title', 'description'):
            resource[key] = text(resource[key], key)
        resource['url'] = safe_url(resource['url'])
    if 'showCover' in data and not isinstance(data['showCover'], bool):
        raise ContentError(f'{path.name}: showCover must be true or false')
    if 'image' in data:
        data['image'] = safe_url(data['image'])
        data['imageAlt'] = text(data.get('imageAlt'), 'imageAlt')
    data['url'] = '/' + ('blog' if kind == 'posts' else 'collections') + '/' + path.stem + '/'
    return data

def image_dimensions(url):
    """Read intrinsic dimensions for public local PNG/JPEG assets without decoding them."""
    if not url.startswith('/assets/'):
        return {}
    path = (ROOT / url.lstrip('/')).resolve()
    if not path.is_relative_to((ROOT / 'assets').resolve()) or not path.is_file():
        return {}
    try:
        with path.open('rb') as f:
            head = f.read(24)
            if head.startswith(b'\x89PNG\r\n\x1a\n'):
                width, height = struct.unpack('>II', head[16:24])
                return {'width': width, 'height': height}
            if not head.startswith(b'\xff\xd8'):
                return {}
            f.seek(2)
            while True:
                marker = f.read(1)
                if not marker:
                    return {}
                if marker != b'\xff':
                    return {}
                while marker == b'\xff':
                    marker = f.read(1)
                if marker in (b'\xda', b'\xd9', b''):
                    return {}
                length = struct.unpack('>H', f.read(2))[0]
                if marker[0] in (0xc0, 0xc1, 0xc2):
                    _, height, width = struct.unpack('>BHH', f.read(5))
                    return {'width': width, 'height': height}
                if length < 2:
                    return {}
                f.seek(length - 2, 1)
    except (OSError, struct.error):
        return {}

def markdown(body):
    md = MarkdownIt('commonmark', {'html': False}).enable(['table', 'strikethrough'])
    tokens = md.parse(body)
    headings, seen = [], {}
    for i, token in enumerate(tokens):
        if token.type == 'heading_open':
            if token.tag == 'h1':
                raise ContentError('The title supplies h1. Start Markdown sections with ##.')
            label = ''.join(t.content for t in tokens[i + 1].children or [] if t.type in ('text', 'code_inline'))
            slug = re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-') or 'section'
            seen[slug] = seen.get(slug, 0) + 1
            anchor = f'section-{slug}' + (f'-{seen[slug]}' if seen[slug] > 1 else '')
            token.attrSet('id', anchor)
            if token.tag == 'h2':
                headings.append((anchor, label))
        if token.type == 'inline':
            for child in token.children or []:
                if child.type == 'image':
                    child.attrSet('loading', 'lazy')
                    child.attrSet('decoding', 'async')
                    for key, value in image_dimensions(child.attrGet('src') or '').items():
                        child.attrSet(key, str(value))
    rendered = md.renderer.render(tokens, md.options, {})
    rendered = rendered.replace('<table>', '<div class="content-table" role="region" aria-label="Article table" tabindex="0"><table>').replace('</table>', '</table></div>')
    return rendered, headings

def jsonld(graph):
    return '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c') + '</script>'

def organization(site):
    return {'@type': 'Organization', '@id': site['url'] + '/#organization', 'name': site['name'], 'url': site['url'] + '/', 'logo': site['url'] + site['logo'], 'email': site['support']}

def metadata(site, title, description, url, graph, image=None, article=False, noindex=False):
    absolute = site['url'] + url
    parts = [f'<title>{escape(title)}</title>', f'<meta name="description" content="{escape(description, quote=True)}">', f'<link rel="canonical" href="{escape(absolute, quote=True)}">', f'<meta name="robots" content="{"noindex, nofollow" if noindex else "index, follow, max-image-preview:large"}">', f'<meta property="og:site_name" content="{escape(site["name"])}">', f'<meta property="og:type" content="{"article" if article else "website"}">']
    for name, value in [('title', title), ('description', description), ('url', absolute)]:
        parts.append(f'<meta property="og:{name}" content="{escape(value, quote=True)}">')
    parts += [f'<meta name="twitter:title" content="{escape(title, quote=True)}">', f'<meta name="twitter:description" content="{escape(description, quote=True)}">']
    if image:
        absolute_image = site['url'] + image if image.startswith('/') else image
        parts += [f'<meta property="og:image" content="{escape(absolute_image, quote=True)}">', f'<meta name="twitter:image" content="{escape(absolute_image, quote=True)}">']
    parts.append(f'<meta name="twitter:card" content="{"summary_large_image" if image else "summary"}">')
    parts.append('<link rel="alternate" type="application/rss+xml" title="Tagalong Blog" href="/feed.xml">')
    parts.append(jsonld(graph))
    return '\n'.join(parts)

def header(site):
    return f'''<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><nav class="page-width nav-row" aria-label="Main navigation"><a class="wordmark" href="/" aria-label="Tagalong home"><img src="/assets/logo-light.png" alt="Tagalong" width="154" height="69"></a><button class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="site-links" hidden>Menu <span aria-hidden="true">☰</span></button><div class="site-links" id="site-links"><a href="/#tour">Product</a><a href="/blog/">Blog</a><a href="/collections/">Collections</a><a href="/guide">Guide</a><a href="/#pricing">Pricing</a><a class="button button-small" href="{site['download']}">Download for Mac ↗</a></div></nav></header>'''

def footer(site):
    return f'''<footer class="page-width site-footer"><div><a class="wordmark" href="/" aria-label="Tagalong home"><img src="/assets/logo-light.png" alt="Tagalong" width="154" height="69" loading="lazy"></a><p>Every meeting, remembered.</p></div><nav aria-label="Footer navigation"><a href="/blog/">Blog</a><a href="/collections/">Collections</a><a href="/guide">Guide</a><a href="/#pricing">Pricing</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:{site['support']}">Support</a></nav><span>© {date.today().year} Tagalong</span></footer>'''

def page(site, title, description, url, body, graph=None, image=None, article=False, noindex=False):
    graph = [organization(site)] + (graph or [])
    head = metadata(site, title, description, url, graph, image, article, noindex)
    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">{head}<link rel="icon" href="/assets/favicon.png"><link rel="preload" href="/assets/fonts/dm-sans.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/homepage.css"><link rel="stylesheet" href="/content.css"><script src="/homepage.js" defer></script></head><body class="homepage content-site">{header(site)}<main id="main" class="page-width content-main">{body}</main>{footer(site)}</body></html>'''

def breadcrumbs(site, entries):
    html = '<nav class="content-breadcrumbs" aria-label="Breadcrumb"><ol>' + ''.join(f'<li><a href="{escape(url)}">{escape(label)}</a></li>' if url else f'<li aria-current="page">{escape(label)}</li>' for label, url in entries) + '</ol></nav>'
    schema = {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': label, **({'item': site['url'] + url} if url else {})} for i, (label, url) in enumerate(entries)]}
    return html, schema

def card(entry, heading=2):
    kind = 'Article' if entry['kind'] == 'posts' else 'Collection'
    date_label = f'<time datetime="{entry["date"]}">{entry["date"].strftime("%B %-d, %Y")}</time>' if 'date' in entry else ''
    return f'<article class="content-card"><div class="content-meta">{kind} {date_label}</div><h{heading}><a href="{entry["url"]}">{escape(entry["title"])}</a></h{heading}><p>{escape(entry["description"])}</p><a class="content-read" href="{entry["url"]}">Read {kind.lower()} <span aria-hidden="true">↗</span><span class="sr-only">: {escape(entry["title"])}</span></a></article>'

def entry_page(site, entry, posts, collections, preview):
    is_post = entry['kind'] == 'posts'
    parent, parent_url = ('Blog', '/blog/') if is_post else ('Collections', '/collections/')
    crumb, crumb_schema = breadcrumbs(site, [('Home', '/'), (parent, parent_url), (entry['title'], None)])
    rendered, headings = markdown(entry['body'])
    answer = f'<div class="content-answer" id="article-summary"><p class="eyebrow">AT A GLANCE</p><p>{escape(entry["answer"])}</p></div>' if entry.get('answer') else ''
    status = '<p class="content-draft">Draft preview · Not published</p>' if entry['draft'] else ''
    byline = f'<span>By <a href="{escape(site["authors"][entry["author"]]["url"])}">{escape(site["authors"][entry["author"]]["name"])}</a></span><span>Published <time datetime="{entry["date"]}">{entry["date"].strftime("%B %-d, %Y")}</time></span>' if is_post else f'<span>By <a href="/">{escape(site["name"])}</a></span>'
    if not is_post or entry['updated'] != entry['date']:
        byline += f'<span>Updated <time datetime="{entry["updated"]}">{entry["updated"].strftime("%B %-d, %Y")}</time></span>'
    if entry['faqs']:
        headings.append(('questions', 'Questions & answers'))
    toc = '<aside class="content-toc"><nav aria-label="On this page"><p>On this page</p><ol>' + ''.join(f'<li><a href="#{anchor}">{escape(label)}</a></li>' for anchor, label in headings) + '</ol></nav></aside>' if headings else ''
    faq_html = '<section class="content-faq"><h2 id="questions">Questions &amp; answers</h2>' + ''.join(f'<details><summary>{escape(f["question"])}</summary><p>{escape(f["answer"])}</p></details>' for f in entry['faqs']) + '</section>' if entry['faqs'] else ''
    resources = '<section class="content-resources"><h2>Explore this topic</h2><ul>' + ''.join(f'<li><a href="{escape(r["url"])}">{escape(r["title"])}</a><p>{escape(r["description"])}</p></li>' for r in entry['resources']) + '</ul></section>' if entry['resources'] else ''
    related = [p for p in posts if (p['slug'] != entry['slug'] and set(p['collections']) & set(entry['collections']))] if is_post else [p for p in posts if entry['slug'] in p['collections']]
    related_html = '<section class="content-related"><h2>' + ('Keep reading' if is_post else 'Articles in this collection') + '</h2><div class="content-grid">' + ''.join(card(p, heading=3) for p in related) + '</div></section>' if related else ''
    collection_links = '<p class="content-collection-links">In ' + ' · '.join(f'<a href="{collections[c]["url"]}">{escape(collections[c]["title"])}</a>' for c in entry['collections'] if c in collections) + '</p>' if entry['collections'] else ''
    dimensions = ' '.join(f'{key}="{value}"' for key, value in image_dimensions(entry.get('image', '')).items())
    cover = f'<figure class="content-cover"><img src="{escape(entry["image"])}" alt="{escape(entry["imageAlt"])}" {dimensions}></figure>' if entry.get('image') and entry.get('showCover', True) else ''
    body = f'{crumb}<header class="content-heading">{status}<p class="eyebrow">{parent}</p><h1>{escape(entry["title"])}</h1><p class="content-deck">{escape(entry["description"])}</p><div class="content-byline">{byline}</div>{collection_links}</header>{cover}<div class="content-prose content-intro">{answer}</div><div class="content-layout"><article class="content-prose">{rendered}{faq_html}{resources}</article>{toc}</div>{related_html}<div class="content-bottom"><a href="{parent_url}">← All {parent.lower()}</a><a class="button button-outline" href="/#pricing">Try Tagalong for Mac ↗</a></div>'
    schema = {'@type': 'BlogPosting' if is_post else 'CollectionPage', '@id': site['url'] + entry['url'] + '#content', 'url': site['url'] + entry['url'], 'name': entry['title'], 'description': entry['description'], 'dateModified': str(entry['updated']), 'inLanguage': 'en', 'isPartOf': {'@id': site['url'] + parent_url}, 'publisher': {'@id': site['url'] + '/#organization'}}
    if is_post:
        author = site['authors'][entry['author']]
        schema.update(headline=entry['title'], datePublished=str(entry['date']), mainEntityOfPage=site['url'] + entry['url'], author={'@type': author['type'], 'name': author['name'], 'url': author['url']})
    elif related:
        schema['mainEntity'] = {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': site['url'] + p['url'], 'name': p['title']} for i, p in enumerate(related)]}
    if entry.get('image'):
        schema['image'] = site['url'] + entry['image'] if entry['image'].startswith('/') else entry['image']
    return page(site, entry.get('seoTitle', entry['title'] + ' | Tagalong'), entry.get('seoDescription', entry['description']), entry['url'], body, [crumb_schema, schema], entry.get('image', site['defaultImage']), is_post, preview)

def write(out, url, value):
    path = out / (url.strip('/') + '/index.html' if url.endswith('/') and url != '/' else 'index.html' if url == '/' else url.lstrip('/'))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8')

def build(root=ROOT, out=None, preview=False, today=None):
    root, today = Path(root), today or datetime.now(timezone.utc).date()
    out = Path(out or root / ('.preview' if preview else 'dist')).resolve()
    if out not in ((root / 'dist').resolve(), (root / '.preview').resolve()):
        raise ContentError('Output must be the website dist or .preview directory')
    site = json.loads((root / 'content/site.json').read_text())
    if site['url'] != 'https://tagalongai.com':
        raise ContentError('Production canonical origin must be https://tagalongai.com')
    if not isinstance(site['postsPerPage'], int) or not 1 <= site['postsPerPage'] <= 50:
        raise ContentError('postsPerPage must be between 1 and 50')
    all_entries = {kind: [read_entry(p, kind, site) for p in sorted((root / 'content' / kind).glob('*.md'))] for kind in ('posts', 'collections')}
    collection_slugs = {c['slug'] for c in all_entries['collections']}
    for post in all_entries['posts']:
        if set(post['collections']) - collection_slugs:
            raise ContentError(f'{post["slug"]}: unknown collection')
    entries = {kind: [e for e in items if preview or (not e['draft'] and e.get('date', e['updated']) <= today)] for kind, items in all_entries.items()}
    posts = sorted(entries['posts'], key=lambda e: (e['date'], e['slug']), reverse=True)
    collections = {c['slug']: c for c in entries['collections']}
    for post in posts:
        if set(post['collections']) - set(collections):
            raise ContentError(f'{post["slug"]}: published article references an unpublished collection')
    # Finish validation and rendering before replacing an earlier good build.
    generated = {e['url']: entry_page(site, e, posts, collections, preview) for e in posts + list(collections.values())}
    page_count = max(1, (len(posts) + site['postsPerPage'] - 1) // site['postsPerPage'])
    for number in range(1, page_count + 1):
        url = '/blog/' if number == 1 else f'/blog/page/{number}/'
        subset = posts[(number - 1) * site['postsPerPage']:number * site['postsPerPage']]
        body = '<header class="content-heading content-index-heading"><p class="eyebrow">THE TAGALONG BLOG</p><h1>Make more of your meetings.</h1><p class="content-deck">Practical notes on capturing conversations, keeping the useful details, and following through.</p><div class="content-index-links"><a href="/collections/">Browse collections ↗</a><a href="/feed.xml">Subscribe via RSS ↗</a></div></header>'
        body += '<div class="content-grid">' + ''.join(card(e) for e in subset) + '</div>' if subset else '<p>Articles are on their way. Explore the <a href="/guide">Tagalong guide</a> in the meantime.</p>'
        if page_count > 1:
            body += '<nav class="content-pagination" aria-label="Blog pages">' + ''.join(f'<a href="{"/blog/" if n == 1 else f"/blog/page/{n}/"}"' + (' aria-current="page"' if n == number else '') + f'>{n}</a>' for n in range(1, page_count + 1)) + '</nav>'
        schema = {'@type': 'Blog', '@id': site['url'] + url, 'name': 'Tagalong Blog', 'url': site['url'] + url, 'blogPost': [{'@id': site['url'] + e['url'] + '#content'} for e in subset]}
        generated[url] = page(site, 'Meeting Notes & Workflows Blog | Tagalong' + (f' — Page {number}' if number > 1 else ''), 'Practical guides to meeting notes, transcription, AI assistance, and keeping a useful meeting record on your Mac.' + (f' Browse older articles on page {number}.' if number > 1 else ''), url, body, [schema], noindex=preview or not subset)
    body = '<header class="content-heading content-index-heading"><p class="eyebrow">COLLECTIONS</p><h1>A useful place to start.</h1><p class="content-deck">Guides and ideas, brought together by topic. Find the workflow that fits the way you meet.</p></header><div class="content-grid">' + ''.join(card(c) for c in collections.values()) + '</div>'
    generated['/collections/'] = page(site, 'Meeting Workflow Collections | Tagalong', 'Browse collections of guides to meeting notes, transcription, local storage, and practical workflows for Mac.', '/collections/', body, [{'@type': 'CollectionPage', 'url': site['url'] + '/collections/', 'name': 'Tagalong Collections', 'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': site['url'] + c['url'], 'name': c['title']} for i, c in enumerate(collections.values())]}}], noindex=preview or not collections)
    generated['/404.html'] = page(site, 'Page not found | Tagalong', 'Find your way back to Tagalong.', '/404.html', '<header class="content-heading"><p class="eyebrow">404</p><h1>This page isn’t here.</h1><p class="content-deck">Try the <a href="/blog/">blog</a>, <a href="/collections/">collections</a>, or <a href="/">homepage</a>.</p></header>', noindex=True)
    urls = []
    for filename in STATIC:
        source = (root / filename).read_text()
        url = '/' if filename == 'index.html' else '/' + filename[:-5]
        title_match = re.search(r'<title>(.*?)</title>', source, re.S)
        desc_match = re.search(r'<meta name="description" content="([^"]*)"\s*/?>', source)
        title = 'Tagalong — AI Meeting Notes & Transcription for Mac' if filename == 'index.html' else title_match[1]
        from html import unescape
        description = unescape(desc_match[1]) if desc_match else site['description']
        noindex = preview or filename in ('admin.html', 'success.html')
        graph = [organization(site), {'@type': 'WebSite' if filename == 'index.html' else 'WebPage', '@id': site['url'] + '/#website' if filename == 'index.html' else site['url'] + url, 'url': site['url'] + url, 'name': 'Tagalong' if filename == 'index.html' else unescape(title), 'description': description}]
        if filename == 'index.html':
            graph.append({'@type': 'SoftwareApplication', '@id': site['url'] + '/#app', 'name': 'Tagalong', 'url': site['url'] + '/', 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'macOS 15 or later', 'downloadUrl': site['download'], 'description': site['description'], 'publisher': {'@id': site['url'] + '/#organization'}})
        source = re.sub(r'<title>.*?</title>\s*|<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>\s*|<link\s+rel="canonical"[^>]*>\s*', '', source, flags=re.S)
        source = source.replace('</head>', metadata(site, unescape(title), description, url, graph, site['defaultImage'] if filename == 'index.html' else None, noindex=noindex) + '\n</head>', 1)
        if filename == 'index.html':
            source = source.replace('<a href="/guide">Guide</a><a class="button button-small"', '<a href="/guide">Guide</a><a href="/blog/">Blog</a><a class="button button-small"', 1)
        source = re.sub(r'(<footer\b[\s\S]*?)(</(?:ul|nav)>)', lambda m: m[1] + ('<li><a href="/blog/">Blog</a></li><li><a href="/collections/">Collections</a></li>' if m[2] == '</ul>' else '<a href="/blog/">Blog</a><a href="/collections/">Collections</a>') + m[2], source, count=1)
        generated['/' + filename] = source
        if not noindex:
            urls.append((url, None))
    for url in generated:
        if url.endswith('/') and not preview:
            if url.startswith('/blog/') and not posts or url == '/collections/' and not collections:
                continue
            entry = next((e for e in posts + list(collections.values()) if e['url'] == url), None)
            urls.append((url, str(entry['updated']) if entry else None))
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    for filename in STYLES:
        shutil.copy2(root / filename, out / filename)
    shutil.copytree(root / 'assets', out / 'assets', ignore=shutil.ignore_patterns('.DS_Store'))
    for url, value in generated.items():
        write(out, url, value)
    sitemap = ET.Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for url, updated in sorted(urls):
        item = ET.SubElement(sitemap, 'url')
        ET.SubElement(item, 'loc').text = site['url'] + url
        if updated:
            ET.SubElement(item, 'lastmod').text = updated
    ET.ElementTree(sitemap).write(out / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    rss = ET.Element('rss', version='2.0')
    channel = ET.SubElement(rss, 'channel')
    for key, value in [('title', 'Tagalong Blog'), ('link', site['url'] + '/blog/'), ('description', site['description']), ('language', 'en')]:
        ET.SubElement(channel, key).text = value
    from email.utils import format_datetime
    for post in ([] if preview else posts):
        item = ET.SubElement(channel, 'item')
        for key, value in [('title', post['title']), ('link', site['url'] + post['url']), ('description', post['description']), ('guid', site['url'] + post['url']), ('pubDate', format_datetime(datetime.combine(post['date'], datetime.min.time(), timezone.utc)))]:
            ET.SubElement(item, key).text = value
    ET.ElementTree(rss).write(out / 'feed.xml', encoding='utf-8', xml_declaration=True)
    (out / 'robots.txt').write_text('User-agent: *\nDisallow: /\n' if preview else f'User-agent: *\nAllow: /\n\nSitemap: {site["url"]}/sitemap.xml\n')
    (out / '_headers').write_text('''/admin\n  X-Robots-Tag: noindex, nofollow\n/admin.html\n  X-Robots-Tag: noindex, nofollow\n/success\n  X-Robots-Tag: noindex, nofollow\n/success.html\n  X-Robots-Tag: noindex, nofollow\n/404.html\n  X-Robots-Tag: noindex, nofollow\nhttps://:project.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\nhttps://:deployment.:project.pages.dev/*\n  X-Robots-Tag: noindex, nofollow\n''')
    (out / '_redirects').write_text('https://www.tagalongai.com/* https://tagalongai.com/:splat 301\n')
    # Verification files contain public ownership tokens, never account credentials.
    verification = root / 'content/verification'
    if verification.exists():
        for path in verification.iterdir():
            if path.is_file() and re.fullmatch(r'(google[a-f0-9]+\.html|BingSiteAuth\.xml|[a-f0-9]{32}\.txt)', path.name):
                shutil.copy2(path, out / path.name)
    print(f'Built {len(generated)} HTML pages, {len(urls)} sitemap URLs, {len(posts)} articles → {out}')
    return out

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', action='store_true', help='Include drafts; mark every page noindex. Never deploy this output.')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    try:
        build(out=args.out, preview=args.preview)
    except (ContentError, yaml.YAMLError) as error:
        sys.exit(f'Content error: {error}')
