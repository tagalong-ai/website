const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');

// The DOM fixture deliberately rejects every HTML/code sink. Production code must
// build nodes and retain metadata as literal text/properties in each renderer.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = [];
    this.handlers = {}; this.style = {}; this.value = ''; this.className = ''; this._text = '';
    this.classList = {
      contains: value => this.className.split(/\s+/).includes(value),
      add: value => { if (!this.classList.contains(value)) this.className += ' ' + value; },
      remove: value => { this.className = this.className.split(/\s+/).filter(v => v !== value).join(' '); },
      toggle: value => this.classList.contains(value) ? this.classList.remove(value) : this.classList.add(value)
    };
  }
  set innerHTML(_) { throw new Error('HTML parsing is forbidden for admin rendering'); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  fire(type, event = {}) {
    return Promise.all((this.handlers[type] || []).map(fn => fn({ target: this, stopPropagation() {}, ...event })));
  }
}
function walk(node) { return [node, ...node.children.flatMap(walk)]; }
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function setup(overrides = {}) {
  const nodes = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], new Element()]));
  for (const id of ['subscriberStatusFilter', 'subscriberTierFilter']) nodes[id].value = 'all';
  nodes.licenseTier.value = 'pro';
  const window = new Element();
  const requests = [], copied = [], removed = [], created = [];
  const fixtures = {
    '/v1/admin/stats': { totalDevices: 1, uniqueSubscribers: 1, activeDevices: 1, activeLicenses: 1, mrr: 9.99, mrrSource: 'stripe' },
    '/v1/admin/subscribers': { devices: [{ deviceId: 'device-1234567890', email: 'customer@example.test', subscriptionActive: 'true', tier: 'pro', stripeCustomerId: 'cus_example', registeredAt: '2026-10-01T00:00:00Z' }] },
    '/v1/admin/licenses': { licenses: [{ licenseKey: 'TEST-LICENSE', tier: 'pro', createdAt: '2026-10-01T00:00:00Z', note: 'Welcome', maxDevices: 1 }] },
    '/v1/admin/usage/detailed': { usage: [{ deviceId: 'device-1234567890', email: 'customer@example.test', endpoints: { whisper: 2, chat: 3, 'assemblyai-poll': 4, gemini: 1 }, totalCalls: 10, estimatedCost: 1.2, revenue: 9.99, profit: 8.79 }], totals: { estimatedCost: 1.2, revenue: 9.99, profit: 8.79, marginPercent: 88 } },
    '/v1/admin/stats/stripe': { stripeActiveSubscriptions: 1, stripeMRR: 9.99 },
    '/v1/admin/generate-license': { licenseKey: 'NEW-LICENSE' },
    ...overrides
  };
  const document = {
    getElementById: id => nodes[id] || Object.values(nodes).flatMap(walk).find(n => n.id === id),
    createElement: tag => { const node = new Element(tag); created.push(node); return node; },
    createTextNode: text => { const node = new Element('#text'); node.nodeType = 3; node.textContent = text; return node; }
  };
  const context = { document, window, AbortController, sessionStorage: { removeItem: key => removed.push(key), getItem() { throw new Error('Secret read from storage'); }, setItem() { throw new Error('Secret persisted'); } },
    navigator: { clipboard: { writeText: async text => copied.push(text) } }, setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      const fixture = fixtures[new URL(url).pathname];
      if (typeof fixture === 'function') return fixture(url, options);
      return { ok: true, json: async () => fixture || {} };
    }
  };
  vm.runInNewContext(source, context);
  const login = async () => { nodes.secretInput.value = 'test-only-admin-secret'; await nodes.loginBtn.fire('click'); await flush(); };
  return { nodes, window, requests, copied, removed, created, context, fixtures, login };
}

test('admin has only self-hosted executable code, no inline handlers or code-parsing sinks', () => {
  assert.deepEqual([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1]), ['/admin.js']);
  assert.doesNotMatch(html, /<script\s*>|\son[a-z]+\s*=|https:\/\/(?:unpkg|fonts\.)/i);
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function|setItem\(/);
  assert.match(html, /\/assets\/fonts\/dm-sans\.ttf/);
});

test('successful login, stats, subscribers, licenses, detailed usage and Stripe verification remain usable', async () => {
  const x = setup();
  assert.deepEqual(x.removed, ['tagalong_admin_secret']);
  assert.equal(x.requests.length, 0, 'never auto-login from old storage');
  x.nodes.secretInput.value = 'test-only-admin-secret';
  const login = x.nodes.loginBtn.fire('click');
  assert.equal(x.nodes.secretInput.value, '', 'clear password DOM immediately');
  await login; await flush();
  assert.equal(x.nodes.dashboardView.style.display, 'block');
  assert.equal(x.nodes.statDevices.textContent, '1');
  assert.equal(x.nodes.statMRR.textContent, '$9.99');
  assert.match(x.nodes.subscribersBody.textContent, /customer@example.test/);
  assert.match(x.nodes.licensesBody.textContent, /TEST-LICENSE/);
  assert.match(x.nodes.usageBody.textContent, /\$1.20.*\$9.99.*\$8.79/);
  await x.nodes.stripeVerifyBtn.fire('click'); await flush();
  assert.match(x.nodes.statMRRSub.textContent, /Stripe: 1 subs/);
  for (const request of x.requests) {
    assert.equal(request.options.headers.Authorization, 'Bearer test-only-admin-secret');
    assert.equal(request.options.cache, 'no-store');
    assert.equal(request.options.credentials, 'omit');
    assert.equal(request.options.redirect, 'error');
    assert.equal(new URL(request.url).origin, 'https://api.tagalongai.com');
  }
  assert.equal(x.context.adminSecret, undefined, 'credential is closure-private');
});

test('metadata metacharacters remain literal in all detail, table, clipboard and tooltip paths', async () => {
  const literal = 'quote\' double" slash\\ angle<metadata> & entity&#39;\nline';
  const device = { deviceId: literal, email: literal, subscriptionActive: 'true', tier: literal, stripeCustomerId: literal, extraKey: literal };
  const license = { licenseKey: literal, tier: literal, note: literal, activatedDeviceId: literal, maxDevices: literal, unknownField: literal };
  const usage = { deviceId: literal, endpoints: {}, costSource: 'enhanced', cost: 1, realCostBreakdown: { lastModelChat: literal } };
  const x = setup({ '/v1/admin/subscribers': { devices: [device] }, '/v1/admin/licenses': { licenses: [license] }, '/v1/admin/usage/detailed': { usage: [usage], totals: {} } });
  await x.login();
  for (const id of ['subscribersBody', 'licensesBody']) assert.ok(x.nodes[id].textContent.includes(literal));
  const tooltip = walk(x.nodes.usageBody).find(n => n.title && n.title.includes('Model: '));
  assert.ok(tooltip.title.endsWith(literal));
  const copyNodes = [...walk(x.nodes.subscribersBody), ...walk(x.nodes.licensesBody), ...walk(x.nodes.usageBody)].filter(n => n.classList.contains('copyable'));
  for (const node of copyNodes) await node.fire('click');
  assert.ok(x.copied.length >= 7);
  assert.ok(x.copied.every(value => value === literal));
  assert.ok(x.created.every(n => !['SCRIPT', 'IFRAME', 'IMG', 'METADATA'].includes(n.tagName)));
});

test('row expansion, search/status filters, copy and license creation keep their original contracts', async () => {
  const x = setup(); await x.login();
  const row = x.nodes.subscribersBody.children[0], detail = x.nodes.subscribersBody.children[1];
  await row.fire('click'); assert.ok(detail.classList.contains('visible'));
  await row.fire('click'); assert.ok(!detail.classList.contains('visible'));
  x.nodes.subscriberStatusFilter.value = 'inactive'; await x.nodes.subscriberStatusFilter.fire('change');
  assert.equal(x.nodes.subscribersCount.textContent, '0');
  x.nodes.subscriberStatusFilter.value = 'all'; await x.nodes.subscriberStatusFilter.fire('change');
  assert.equal(x.nodes.subscribersCount.textContent, '1');
  x.nodes.globalSearch.value = 'missing'; await x.nodes.globalSearch.fire('input');
  assert.equal(x.nodes.subscribersCount.textContent, '0');
  x.nodes.globalSearch.value = ''; await x.nodes.globalSearch.fire('input');
  await x.nodes.generateBtn.fire('click'); assert.ok(x.nodes.licenseForm.classList.contains('visible'));
  x.nodes.licenseTier.value = 'free'; x.nodes.licenseNote.value = 'A gift';
  await x.nodes.createLicenseBtn.fire('click'); await flush();
  const request = x.requests.find(r => new URL(r.url).pathname === '/v1/admin/generate-license');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { tier: 'free', note: 'A gift' });
  assert.equal(x.nodes.licenseNote.value, '');
  assert.ok(!x.nodes.licenseForm.classList.contains('visible'));
  assert.match(x.nodes.toast.textContent, /NEW-LICENSE/);
});

test('failed login leaves no credential and reports the failure', async () => {
  const x = setup({ '/v1/admin/stats': () => ({ ok: false, status: 403 }) });
  await x.login();
  assert.equal(x.nodes.loginError.textContent, 'Invalid admin secret.');
  assert.equal(x.nodes.secretInput.value, '');
  assert.equal(x.requests.length, 1);
  assert.notEqual(x.nodes.dashboardView.style.display, 'block');
});

test('logout and page departure discard credentials, cached customer data and pending responses', async () => {
  const x = setup(); await x.login();
  let resolvePending;
  x.fixtures['/v1/admin/subscribers'] = () => new Promise(resolve => { resolvePending = resolve; });
  await x.nodes.refreshBtn.fire('click'); await flush();
  await x.nodes.logoutBtn.fire('click');
  assert.equal(x.nodes.dashboardView.style.display, 'none');
  assert.equal(x.nodes.licensesBody.textContent, '');
  assert.equal(x.nodes.usageBody.textContent, '');
  resolvePending({ ok: true, json: async () => ({ devices: [{ deviceId: 'stale', email: 'stale@example.test' }] }) });
  await flush();
  assert.doesNotMatch(x.nodes.subscribersBody.textContent, /stale/);
  assert.ok(x.requests.find(r => r.options.signal.aborted));
  x.fixtures['/v1/admin/subscribers'] = { devices: [] };
  await x.login(); await x.window.fire('pagehide');
  assert.equal(x.nodes.dashboardView.style.display, 'none');
  assert.equal(x.nodes.licensesBody.textContent, '');
});

test('logout during login cannot resurrect a cleared admin session', async () => {
  let resolvePending;
  const x = setup({ '/v1/admin/stats': () => new Promise(resolve => { resolvePending = resolve; }) });
  x.nodes.secretInput.value = 'test-only-admin-secret';
  const login = x.nodes.loginBtn.fire('click');
  await x.window.fire('pagehide');
  resolvePending({ ok: true, json: async () => ({}) });
  await login; await flush();
  assert.equal(x.nodes.dashboardView.style.display, 'none');
  assert.equal(x.requests.length, 1);
});

test('legacy usage fallback and month control remain functional', async () => {
  const x = setup({ '/v1/admin/usage/detailed': () => ({ ok: false, status: 404 }), '/v1/admin/usage': { usage: [{ deviceId: 'legacy-device', apiCalls: 9 }], totalCalls: 9 } });
  await x.login();
  assert.match(x.nodes.usageBody.textContent, /legacy-device/);
  x.nodes.usageMonth.value = '2026-09'; await x.nodes.usageMonth.fire('change'); await flush();
  assert.ok(x.requests.some(r => r.url.endsWith('/v1/admin/usage?month=2026-09')));
});
