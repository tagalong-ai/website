#!/usr/bin/env python3
"""Notify IndexNow about explicit changed public URLs, after deployment."""
import argparse
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://tagalongai.com'

def payload(urls):
    keys = list((ROOT / 'content/verification').glob('*.txt'))
    keys = [p for p in keys if len(p.stem) == 32 and all(c in '0123456789abcdef' for c in p.stem)]
    if len(keys) != 1 or keys[0].read_text().strip() != keys[0].stem:
        raise ValueError('Expected one matching public IndexNow key file')
    urls = list(dict.fromkeys(urls))
    if not 1 <= len(urls) <= 10000:
        raise ValueError('Supply between 1 and 10,000 changed URLs')
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or parsed.netloc != 'tagalongai.com' or parsed.fragment or parsed.query:
            raise ValueError(f'Use a canonical https://tagalongai.com URL without query or fragment: {url}')
        if parsed.path.startswith(('/admin', '/success', '/tests', '/content', '/scripts', '/.')):
            raise ValueError('Only submit public content URLs')
    return {'host': 'tagalongai.com', 'key': keys[0].stem, 'keyLocation': ORIGIN + '/' + keys[0].name, 'urlList': urls}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('urls', nargs='+', help='Only URLs actually added, updated or deleted')
    parser.add_argument('--submit', action='store_true', help='Verify the deployed key and send this batch. Otherwise dry run.')
    args = parser.parse_args()
    try:
        data = payload(args.urls)
        if not args.submit:
            print('Dry run; no request sent. URLs:\n' + '\n'.join(data['urlList']))
        else:
            with urlopen(data['keyLocation'], timeout=20) as response:
                if response.read(1024).decode().strip() != data['key']:
                    raise ValueError('The key is not live yet. Deploy the website first.')
            request = Request('https://api.indexnow.org/indexnow', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json; charset=utf-8'}, method='POST')
            with urlopen(request, timeout=30) as response:
                if response.status not in (200, 202):
                    raise ValueError(f'Unexpected response: {response.status}')
                print(f'IndexNow accepted {len(data["urlList"])} URLs (HTTP {response.status}). This does not guarantee indexing.')
    except (ValueError, HTTPError, URLError) as error:
        sys.exit(str(error))
