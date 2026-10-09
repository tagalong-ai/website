const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../texts.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../texts.html'), 'utf8');

// Exact consent wording registered with the A2P campaign. Changing it on the page
// requires re-registering the campaign, so this test pins it.
const CONSENT = 'By checking this box, I agree to receive recurring automated marketing text messages from Tagalong AI (new releases, tips, and offers) at the mobile number provided. Consent is not a condition of purchase or of using Tagalong. Msg frequency varies, up to 4 msgs/month. Msg &amp; data rates may apply. Reply HELP for help, STOP to cancel. See our <a href="/privacy#text-messaging">Privacy Policy</a> and <a href="/terms#text-messages">Terms of Service</a>.';
const SUCCESS_EMAIL = "Thanks! You're signed up for Tagalong email updates.";
const SUCCESS_TEXTS = "Thanks! You're signed up for Tagalong email updates and texts from Tagalong AI. Up to 4 msgs/month. Reply STOP to cancel, HELP for help.";

function element(extra = {}) {
  return {
    handlers: {}, attrs: {}, value: '', checked: false, disabled: false, textContent: '', className: '', focused: false,
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
    setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return this.attrs[k]; }, focus() { this.focused = true; },
    ...extra
  };
}

function setup(respond = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, message: 'Server says thanks.' }) })) {
  const nodes = {
    'texts-email': element(), 'texts-first-name': element(), 'texts-phone': element(), 'texts-company-website': element(),
    'texts-consent': element(), 'texts-submit': element({ textContent: 'Sign up', disabled: true }),
    'texts-status': element()
  };
  const requests = [];
  nodes['texts-form'] = element({ reset() { for (const id of ['texts-email', 'texts-first-name', 'texts-phone']) nodes[id].value = ''; nodes['texts-consent'].checked = false; } });
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
  const toggle = checked => { nodes['texts-consent'].checked = checked; nodes['texts-consent'].handlers.change.forEach(fn => fn()); };
  return { nodes, requests, submit, toggle };
}

test('page ships the registered consent wording, optional phone and box, required email, honeypot and no inline script', () => {
  assert.ok(html.includes(CONSENT), 'consent wording changed');
  // Carrier review (errors 30923, 30896): the consent box and the mobile number must be
  // completely optional; only the email address is required.
  const box = html.match(/<input id="texts-consent"[^>]*>/)[0];
  assert.match(box, /type="checkbox"/);
  assert.doesNotMatch(box, /\b(required|checked|aria-required)\b/);
  const phone = html.match(/<input id="texts-phone"[^>]*>/)[0];
  assert.doesNotMatch(phone, /\b(required|aria-required)\b/);
  assert.match(html, /<label for="texts-phone">Mobile number <span class="texts-optional">\(optional, only needed for texts\)<\/span><\/label>/);
  const email = html.match(/<input id="texts-email"[^>]*>/)[0];
  assert.match(email, /type="email"/);
  assert.match(email, /name="email"/);
  assert.match(email, /autocomplete="email"/);
  assert.match(email, /\brequired\b/);
  assert.match(html, /<label for="texts-first-name">First name <span class="texts-optional">\(optional\)<\/span>/);
  // Field order: email, first name, mobile number, then the consent box.
  const order = ['id="texts-email"', 'id="texts-first-name"', 'id="texts-phone"', 'id="texts-consent"', 'id="texts-submit"'].map(s => html.indexOf(s));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'fields out of order');
  assert.match(html, /Texts are optional\. Leave the box unchecked to get email updates only\./);
  assert.doesNotMatch(html, /turns on only after|only after you check/i);
  assert.match(html, /<button id="texts-submit" class="button texts-submit" type="submit">Sign up<\/button>/);
  assert.match(html, /<form id="texts-form" class="texts-form" action="https:\/\/sms-promote-production\.up\.railway\.app\/public\/join" method="post" novalidate>/);
  assert.match(html, /class="texts-legal-links"><a href="\/terms#text-messages">Terms of Service<\/a>[\s\S]*?<a href="\/privacy#text-messaging">Privacy Policy<\/a>[\s\S]*?<a href="\/">No thanks, keep browsing Tagalong<\/a>/);
  assert.match(html, /<div class="texts-hp" aria-hidden="true">[\s\S]*?name="company_website"[^>]*tabindex="-1"/);
  assert.match(html, /<h1>Get Tagalong updates<\/h1>/);
  assert.match(html, /<title>Get Tagalong Updates - Tagalong<\/title>/);
  assert.match(html, /We never sell or share your mobile number or text consent with third parties for marketing purposes\./);
  for (const disclosure of [/up to 4 msgs\/month/, /Msg &amp; data rates may apply/, /Reply STOP/, /Reply HELP/, /Consent is not a condition of purchase/, /Carriers are not liable for delayed or undelivered messages\./, /US and Canadian mobile numbers/, /sent by Tagalong AI/]) {
    assert.match(html, disclosure);
  }
  assert.match(html, /<noscript>[\s\S]*the form still works/);
  assert.deepEqual([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1]), ['/homepage.js', '/texts.js']);
  assert.doesNotMatch(html, /<script\s*>|\son[a-z]+\s*=|https:\/\/(?:unpkg|cdn|fonts\.)/i);
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function/);
});

test('turns the button on once JS runs and never ties it to the consent box', () => {
  const x = setup();
  const btn = x.nodes['texts-submit'];
  assert.equal(btn.disabled, false);
  x.toggle(true);
  assert.equal(btn.disabled, false);
  x.toggle(false);
  assert.equal(btn.disabled, false);
});

test('requires a valid email before sending anything', async () => {
  const x = setup();
  assert.equal(await x.submit(), true);
  assert.equal(x.requests.length, 0);
  assert.equal(x.nodes['texts-email'].attrs['aria-invalid'], 'true');
  assert.equal(x.nodes['texts-email'].focused, true);
  assert.match(x.nodes['texts-status'].textContent, /email address/);
  for (const bad of ['ada', 'ada@example', 'ada@@example.com', 'a da@example.com', '@example.com', 'a@' + 'b'.repeat(250) + '.com']) {
    x.nodes['texts-email'].value = bad;
    await x.submit();
    assert.equal(x.requests.length, 0, bad);
    assert.equal(x.nodes['texts-status'].textContent, 'Please enter a valid email address.', bad);
  }
});

test('email-only sign-up sends no phone or consent, even when a number was typed', async () => {
  const x = setup(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  x.nodes['texts-email'].value = '  ada@example.com ';
  x.nodes['texts-first-name'].value = '  Ada ';
  x.nodes['texts-phone'].value = '(415) 555-0134';
  await x.submit();
  assert.equal(x.requests.length, 1);
  const { url, options } = x.requests[0];
  assert.equal(url, 'https://sms-promote-production.up.railway.app/public/join');
  assert.equal(options.method, 'POST');
  assert.equal(options.credentials, 'omit');
  const body = new URLSearchParams(options.body);
  assert.equal(body.get('email'), 'ada@example.com');
  assert.equal(body.get('first_name'), 'Ada');
  assert.equal(body.has('phone'), false, 'phone must not be sent without consent');
  assert.equal(body.has('consent'), false);
  assert.equal(body.get('company_website'), '');
  assert.equal(body.get('page_url'), 'https://tagalongai.com/texts');
  assert.match(x.nodes['texts-status'].className, /is-success/);
  assert.equal(x.nodes['texts-status'].textContent, SUCCESS_EMAIL, 'falls back to the email-only message');
  assert.equal(x.nodes['texts-status'].focused, true);
  assert.equal(x.nodes['texts-email'].value, '', 'form resets after success');
  assert.equal(x.nodes['texts-submit'].disabled, false);
  assert.equal(x.nodes['texts-submit'].textContent, 'Sign up');
});

test('checking the box without a usable number is blocked client-side', async () => {
  const x = setup();
  x.nodes['texts-email'].value = 'ada@example.com';
  x.toggle(true);
  await x.submit();
  assert.equal(x.requests.length, 0);
  assert.equal(x.nodes['texts-phone'].attrs['aria-invalid'], 'true');
  assert.equal(x.nodes['texts-status'].textContent, 'Enter your mobile number to get texts, or uncheck the text box.');
  x.nodes['texts-phone'].value = '+44 7700 900123';
  await x.submit();
  assert.equal(x.requests.length, 0);
  assert.equal(x.nodes['texts-status'].textContent, 'Please enter a US or Canadian mobile number.');
  // Unchecking the box lets the same visitor sign up for email only.
  x.toggle(false);
  assert.equal(x.nodes['texts-phone'].attrs['aria-invalid'], undefined);
  await x.submit();
  assert.equal(x.requests.length, 1);
  assert.equal(new URLSearchParams(x.requests[0].options.body).has('phone'), false);
});

test('email plus texts sends the phone and consent and shows the server message', async () => {
  const x = setup();
  x.nodes['texts-email'].value = 'ada@example.com';
  x.nodes['texts-phone'].value = '(415) 555-0134';
  x.toggle(true);
  await x.submit();
  assert.equal(x.requests.length, 1);
  const body = new URLSearchParams(x.requests[0].options.body);
  assert.equal(body.get('email'), 'ada@example.com');
  assert.equal(body.get('phone'), '(415) 555-0134');
  assert.equal(body.get('consent'), 'yes');
  assert.equal(x.nodes['texts-status'].textContent, 'Server says thanks.');
  assert.equal(x.nodes['texts-consent'].checked, false, 'form resets after success');
  assert.equal(x.nodes['texts-submit'].disabled, false, 'button stays on after the box is cleared');
});

test('falls back to the texts success message when the server sends none', async () => {
  const x = setup(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  x.nodes['texts-email'].value = 'ada@example.com';
  x.nodes['texts-phone'].value = '4155550134';
  x.toggle(true);
  await x.submit();
  assert.equal(x.nodes['texts-status'].textContent, SUCCESS_TEXTS);
});

test('shows server errors, rate limits and network failures as text without breaking the button', async () => {
  for (const [respond, expected] of [
    [async () => ({ ok: false, status: 400, json: async () => ({ error: 'Please enter a valid email address.' }) }), /valid email/],
    [async () => ({ ok: false, status: 429, json: async () => ({ error: 'Too many requests' }) }), /try again in an hour/],
    [async () => { throw new TypeError('Failed to fetch'); }, /couldn’t reach/],
    [async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError('bad json'); } }), /Something went wrong/]
  ]) {
    const x = setup(respond);
    x.nodes['texts-email'].value = 'ada@example.com';
    await x.submit();
    assert.match(x.nodes['texts-status'].textContent, expected);
    assert.match(x.nodes['texts-status'].className, /is-error/);
    assert.equal(x.nodes['texts-submit'].disabled, false);
    assert.equal(x.nodes['texts-submit'].attrs['aria-busy'], undefined);
    assert.equal(x.nodes['texts-submit'].textContent, 'Sign up');
  }
});
