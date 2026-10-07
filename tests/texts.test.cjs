const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../texts.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../texts.html'), 'utf8');

// Exact consent wording registered with the A2P campaign. Changing it on the page
// requires re-registering the campaign, so this test pins it.
const CONSENT = "Yes, I'd like to receive recurring text messages from Tagalong with product updates, tips, and offers at the number provided. Consent is not a condition of purchase. Msg frequency varies, up to 4 msgs/month. Msg &amp; data rates may apply. Reply HELP for help, STOP to cancel.";

function element(extra = {}) {
  return {
    handlers: {}, attrs: {}, value: '', checked: false, disabled: false, textContent: '', className: '', focused: false,
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
    setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return this.attrs[k]; }, focus() { this.focused = true; },
    ...extra
  };
}

function setup(respond = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, message: "You're subscribed! Watch for a confirmation text." }) })) {
  const nodes = {
    'texts-first-name': element(), 'texts-phone': element(), 'texts-company-website': element(),
    'texts-consent': element(), 'texts-submit': element({ textContent: 'Sign up for texts', disabled: true }),
    'texts-status': element()
  };
  const requests = [];
  nodes['texts-form'] = element({ reset() { nodes['texts-first-name'].value = ''; nodes['texts-phone'].value = ''; nodes['texts-consent'].checked = false; } });
  const context = {
    document: { getElementById: id => nodes[id] || null },
    window: { location: { href: 'https://tagalongai.com/texts' } },
    URLSearchParams, AbortController, setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, options) => { requests.push({ url, options }); return respond(url, options); }
  };
  vm.runInNewContext(source, context);
  const submit = async () => {
    let prevented = false;
    await Promise.all(nodes['texts-form'].handlers.submit.map(fn => fn({ preventDefault() { prevented = true; } })));
    return prevented;
  };
  return { nodes, requests, submit };
}

test('page ships the registered consent wording, an unchecked box, honeypot and no inline script', () => {
  assert.ok(html.includes(CONSENT), 'consent wording changed');
  assert.match(html, /<input id="texts-consent" name="consent" type="checkbox"[^>]*required/);
  assert.doesNotMatch(html.match(/<input id="texts-consent"[^>]*>/)[0], /\bchecked\b/);
  assert.match(html, /<a href="\/privacy">Privacy Policy<\/a> &amp; <a href="\/terms">Terms<\/a>/);
  assert.match(html, /<input id="texts-phone" name="phone" type="tel" autocomplete="tel"[^>]*required/);
  assert.match(html, /<div class="texts-hp" aria-hidden="true">[\s\S]*?name="company_website"[^>]*tabindex="-1"/);
  assert.match(html, />Sign up for texts</);
  assert.match(html, /We never share your mobile number or text consent with third parties\./);
  assert.match(html, /<noscript>[\s\S]*JavaScript is required/);
  assert.deepEqual([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1]), ['/homepage.js', '/texts.js']);
  assert.doesNotMatch(html, /<script\s*>|\son[a-z]+\s*=|https:\/\/(?:unpkg|cdn|fonts\.)/i);
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function/);
});

test('enables the button only once the script runs', () => {
  const x = setup();
  assert.equal(x.nodes['texts-submit'].disabled, false);
});

test('requires a phone number and consent before sending anything', async () => {
  const x = setup();
  assert.equal(await x.submit(), true);
  assert.equal(x.requests.length, 0);
  assert.equal(x.nodes['texts-phone'].attrs['aria-invalid'], 'true');
  assert.match(x.nodes['texts-status'].textContent, /mobile number/);
  x.nodes['texts-phone'].value = '+44 7700 900123';
  await x.submit();
  assert.equal(x.requests.length, 0);
  assert.match(x.nodes['texts-status'].textContent, /US or Canadian/);
  x.nodes['texts-phone'].value = '(415) 555-0134';
  await x.submit();
  assert.equal(x.requests.length, 0);
  assert.equal(x.nodes['texts-consent'].attrs['aria-invalid'], 'true');
  assert.match(x.nodes['texts-status'].textContent, /check the box/);
});

test('posts consent, honeypot and page URL to the public join endpoint and shows success', async () => {
  const x = setup();
  x.nodes['texts-first-name'].value = '  Ada ';
  x.nodes['texts-phone'].value = '(415) 555-0134';
  x.nodes['texts-consent'].checked = true;
  await x.submit();
  assert.equal(x.requests.length, 1);
  const { url, options } = x.requests[0];
  assert.equal(url, 'https://sms-promote-production.up.railway.app/public/join');
  assert.equal(options.method, 'POST');
  assert.equal(options.credentials, 'omit');
  const body = new URLSearchParams(options.body);
  assert.equal(body.get('first_name'), 'Ada');
  assert.equal(body.get('phone'), '(415) 555-0134');
  assert.equal(body.get('consent'), 'yes');
  assert.equal(body.get('company_website'), '');
  assert.equal(body.get('page_url'), 'https://tagalongai.com/texts');
  assert.match(x.nodes['texts-status'].className, /is-success/);
  assert.equal(x.nodes['texts-status'].textContent, "You're subscribed! Watch for a confirmation text.");
  assert.equal(x.nodes['texts-consent'].checked, false, 'form resets after success');
  assert.equal(x.nodes['texts-submit'].disabled, false);
  assert.equal(x.nodes['texts-submit'].textContent, 'Sign up for texts');
});

test('shows server errors, rate limits and network failures as text without breaking the button', async () => {
  for (const [respond, expected] of [
    [async () => ({ ok: false, status: 400, json: async () => ({ error: 'Please enter a US or Canadian mobile number.' }) }), /US or Canadian/],
    [async () => ({ ok: false, status: 429, json: async () => ({ error: 'Too many requests' }) }), /try again in an hour/],
    [async () => { throw new TypeError('Failed to fetch'); }, /couldn’t reach/],
    [async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError('bad json'); } }), /Something went wrong/]
  ]) {
    const x = setup(respond);
    x.nodes['texts-phone'].value = '4155550134';
    x.nodes['texts-consent'].checked = true;
    await x.submit();
    assert.match(x.nodes['texts-status'].textContent, expected);
    assert.match(x.nodes['texts-status'].className, /is-error/);
    assert.equal(x.nodes['texts-submit'].disabled, false);
    assert.equal(x.nodes['texts-submit'].attrs['aria-busy'], undefined);
  }
});
