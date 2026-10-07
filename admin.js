(function () {
'use strict';

var API_BASE = 'https://api.tagalongai.com';

// --- Data stores for client-side filtering ---
var subscribersData = [];
var licensesData = [];
var usageData = [];
var usageTotals = {};
var globalSearchQuery = '';

// Credentials exist only in this page's closure, never in browser storage.
var adminSecret = '';
var authGeneration = 0;
var pendingRequests = new Set();
try { sessionStorage.removeItem('tagalong_admin_secret'); } catch (_) { /* Storage may be disabled. */ }

// --- Auth ---

function getSecret() {
  return adminSecret;
}

function handleLogin() {
  var secret = document.getElementById('secretInput').value.trim();
  if (!secret) {
    showLoginError('Please enter the admin secret.');
    return;
  }
  document.getElementById('secretInput').value = '';
  var btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  return apiFetch('/v1/admin/stats', { secret: secret })
    .then(function () {
      adminSecret = secret;
      secret = '';
      showDashboard();
    })
    .catch(function (err) {
      if (err.name === 'AbortError') return;
      showLoginError(err.status === 403 || err.status === 401 ? 'Invalid admin secret.' : 'Connection failed. Check the API.');
    })
    .finally(function () {
      secret = '';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    });
}

function handleLogout() {
  adminSecret = '';
  authGeneration += 1;
  pendingRequests.forEach(function (request) { request.abort(); });
  pendingRequests.clear();
  subscribersData = [];
  licensesData = [];
  usageData = [];
  usageTotals = {};
  globalSearchQuery = '';
  document.getElementById('globalSearch').value = '';
  document.getElementById('licenseNote').value = '';
  ['subscribersBody', 'licensesBody', 'usageBody', 'usageSummary'].forEach(function (id) {
    document.getElementById(id).replaceChildren();
  });
  ['statDevices', 'statSubscribers', 'statLicenses', 'statMRR', 'statApiCost', 'statNetMargin',
    'statDevicesSub', 'statMRRSub', 'statApiCostSub', 'statNetMarginSub', 'toast'].forEach(function (id) {
    document.getElementById(id).textContent = '';
  });
  document.getElementById('subscribersCount').textContent = '0';
  document.getElementById('licensesCount').textContent = '0';
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('secretInput').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function showLoginError(msg) {
  var el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function showDashboard() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';

  // Set usage month to current
  var now = new Date();
  var month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('usageMonth').value = month;

  refreshAll();
}

// --- API ---

function apiFetch(path, opts) {
  opts = opts || {};
  var secret = opts.secret || getSecret();
  var generation = authGeneration;
  var request = new AbortController();
  pendingRequests.add(request);
  var fetchOpts = {
    signal: request.signal,
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    method: opts.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + secret,
      'Content-Type': 'application/json'
    }
  };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }
  return fetch(API_BASE + path, fetchOpts).then(function (res) {
    if (!res.ok) {
      var err = new Error('HTTP ' + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }).then(function (data) {
    if (generation !== authGeneration) {
      var error = new Error('Signed out');
      error.name = 'AbortError';
      throw error;
    }
    return data;
  }).finally(function () {
    pendingRequests.delete(request);
  });
}

// --- Global Search ---

function handleGlobalSearch() {
  globalSearchQuery = document.getElementById('globalSearch').value.trim().toLowerCase();
  renderSubscribers();
  renderLicenses();
  renderUsage();
}

function matchesSearch(item) {
  if (!globalSearchQuery) return true;
  var q = globalSearchQuery;
  var fields = [
    item.email, item.deviceId, item.stripeCustomerId,
    item.licenseKey, item.note, item.activatedDeviceId
  ];
  for (var i = 0; i < fields.length; i++) {
    if (fields[i] && String(fields[i]).toLowerCase().indexOf(q) !== -1) return true;
  }
  return false;
}

// --- Refresh ---

function refreshAll() {
  fetchStats();
  fetchSubscribers();
  fetchLicenses();
  fetchUsageDetailed();
}

// --- Stats ---

function fetchStats() {
  var ids = ['statDevices', 'statSubscribers', 'statLicenses', 'statMRR'];
  ids.forEach(function (id) { document.getElementById(id).textContent = '...'; });
  document.getElementById('statApiCost').textContent = '...';
  document.getElementById('statNetMargin').textContent = '...';

  apiFetch('/v1/admin/stats')
    .then(function (data) {
      document.getElementById('statDevices').textContent = data.totalDevices;
      document.getElementById('statSubscribers').textContent = data.uniqueSubscribers;
      document.getElementById('statDevicesSub').textContent = data.activeDevices + ' active device' + (data.activeDevices !== 1 ? 's' : '');
      document.getElementById('statLicenses').textContent = data.activeLicenses;
      document.getElementById('statMRR').textContent = '$' + data.mrr;
      document.getElementById('statMRRSub').textContent = data.mrrSource === 'stripe' ? 'From Stripe' : 'From Redis (verify with Stripe)';
    })
    .catch(function () {
      ids.forEach(function (id) { document.getElementById(id).textContent = '--'; });
    });
}

function verifyWithStripe() {
  var btn = document.getElementById('stripeVerifyBtn');
  btn.disabled = true;
  btn.textContent = 'Checking...';

  apiFetch('/v1/admin/stats/stripe')
    .then(function (data) {
      document.getElementById('statMRRSub').textContent =
        'Stripe: ' + data.stripeActiveSubscriptions + ' subs, $' + data.stripeMRR + ' MRR';
      showToast('Stripe: ' + data.stripeActiveSubscriptions + ' active subs, $' + data.stripeMRR + ' MRR');
    })
    .catch(function (err) {
      document.getElementById('statMRRSub').textContent = 'Stripe verification failed';
      showToast('Stripe verification failed');
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Verify with Stripe';
    });
}

// --- Subscribers ---

function fetchSubscribers() {
  var tbody = document.getElementById('subscribersBody');
  tableMessage(tbody, 6, 'Loading...', 'loading-row');

  apiFetch('/v1/admin/subscribers')
    .then(function (data) {
      subscribersData = data.devices || [];
      renderSubscribers();
    })
    .catch(function () {
      tableMessage(tbody, 6, 'Failed to load subscribers.', 'error-state');
    });
}

function renderSubscribers(filtered) {
  var tbody = document.getElementById('subscribersBody');
  var devices = filtered || subscribersData;

  // Apply filters
  var statusFilter = document.getElementById('subscriberStatusFilter').value;
  var tierFilter = document.getElementById('subscriberTierFilter').value;

  devices = devices.filter(function (d) {
    if (!matchesSearch(d)) return false;
    if (statusFilter === 'active' && d.subscriptionActive !== 'true') return false;
    if (statusFilter === 'inactive' && d.subscriptionActive === 'true') return false;
    if (tierFilter !== 'all' && (d.tier || 'free') !== tierFilter) return false;
    return true;
  });

  document.getElementById('subscribersCount').textContent = devices.length;

  if (devices.length === 0) {
    tableMessage(tbody, 6, 'No devices match the current filters.', 'empty-state');
    return;
  }

  tbody.replaceChildren();
  devices.forEach(function (d, i) {
    var row = element('tr', 'expandable');
    var customer = element('div', 'customer-cell');
    customer.append(element('span', 'customer-email', d.email || 'No email'));
    var device = String(d.deviceId || '');
    customer.append(d.email
      ? element('span', 'customer-device', device.substring(0, 12) + '...')
      : copyable(device, 'customer-device', device.substring(0, 16) + '...'));
    row.append(cell(customer));
    var active = d.subscriptionActive === 'true';
    row.append(cell(element('span', 'badge ' + (active ? 'badge-active' : 'badge-inactive'), active ? 'Active' : 'Inactive')));
    row.append(cell(element('span', 'badge ' + (d.tier === 'pro' ? 'badge-pro' : 'badge-free'), d.tier || 'free')));
    row.append(cell(d.stripeCustomerId || '--', 'mono'), cell(formatDate(d.registeredAt)), cell(formatDate(d.lastSeenAt)));
    appendDetails(tbody, row, 'sub-detail-' + i, d, ['deviceId', 'email', 'subscriptionActive', 'tier', 'stripeCustomerId', 'subscriptionId', 'registeredAt', 'lastSeenAt']);
  });
}

// --- Licenses ---

function fetchLicenses() {
  var tbody = document.getElementById('licensesBody');
  tableMessage(tbody, 6, 'Loading...', 'loading-row');

  apiFetch('/v1/admin/licenses')
    .then(function (data) {
      licensesData = data.licenses || [];
      renderLicenses();
    })
    .catch(function () {
      tableMessage(tbody, 6, 'Failed to load licenses.', 'error-state');
    });
}

function renderLicenses(filtered) {
  var tbody = document.getElementById('licensesBody');
  var licenses = filtered || licensesData;

  licenses = licenses.filter(function (l) {
    return matchesSearch(l);
  });

  document.getElementById('licensesCount').textContent = licenses.length;

  if (licenses.length === 0) {
    tableMessage(tbody, 6, 'No licenses match the current filters.', 'empty-state');
    return;
  }

  tbody.replaceChildren();
  licenses.forEach(function (l, i) {
    var row = element('tr', 'expandable');
    row.append(cell(copyable(l.licenseKey, 'mono')));
    row.append(cell(element('span', 'badge badge-pro', l.tier)));
    row.append(cell(formatDate(l.createdAt)), cell(l.maxDevices || '1'), cell(l.note || '--'));
    row.append(cell(l.activatedDeviceId
      ? copyable(l.activatedDeviceId, 'mono truncate', String(l.activatedDeviceId).substring(0, 12) + '...')
      : '--'));
    appendDetails(tbody, row, 'lic-detail-' + i, l, ['licenseKey', 'tier', 'createdAt', 'maxDevices', 'note', 'activatedDeviceId', 'activatedAt']);
  });
}

function toggleLicenseForm() {
  var form = document.getElementById('licenseForm');
  form.classList.toggle('visible');
}

function generateLicense() {
  var tier = document.getElementById('licenseTier').value;
  var note = document.getElementById('licenseNote').value.trim();
  var btn = document.getElementById('createLicenseBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  var body = { tier: tier };
  if (note) body.note = note;

  apiFetch('/v1/admin/generate-license', { method: 'POST', body: body })
    .then(function (data) {
      showToast('License created: ' + data.licenseKey);
      document.getElementById('licenseNote').value = '';
      document.getElementById('licenseForm').classList.remove('visible');
      fetchLicenses();
    })
    .catch(function () {
      showToast('Failed to create license.');
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Create';
    });
}

// --- Usage (Detailed) ---

function fetchUsageDetailed() {
  var month = document.getElementById('usageMonth').value;
  if (!month) return;

  var tbody = document.getElementById('usageBody');
  var summary = document.getElementById('usageSummary');
  tableMessage(tbody, 8, 'Loading...', 'loading-row');
  summary.style.display = 'none';

  apiFetch('/v1/admin/usage/detailed?month=' + encodeURIComponent(month))
    .then(function (data) {
      usageData = data.usage || [];
      usageTotals = data.totals || {};
      renderUsage();
      updateCostStats();
    })
    .catch(function (err) {
      if (err.name === 'AbortError') return;
      // Fall back to legacy endpoint
      apiFetch('/v1/admin/usage?month=' + encodeURIComponent(month))
        .then(function (data) {
          // Map legacy format to detailed format
          usageData = (data.usage || []).map(function (u) {
            return {
              deviceId: u.deviceId,
              email: null,
              endpoints: {},
              totalCalls: u.apiCalls,
              estimatedCost: 0,
              revenue: 0,
              profit: 0,
              isActiveSubscriber: false,
            };
          });
          usageTotals = { totalCalls: data.totalCalls, estimatedCost: 0, revenue: 0, profit: 0, marginPercent: 0 };
          renderUsage();
          updateCostStats();
        })
        .catch(function () {
          tableMessage(tbody, 8, 'Failed to load usage data.', 'error-state');
          summary.style.display = 'none';
        });
    });
}

function renderUsage(filtered) {
  var tbody = document.getElementById('usageBody');
  var summary = document.getElementById('usageSummary');
  var usage = filtered || usageData;

  usage = usage.filter(function (u) {
    return matchesSearch(u);
  });

  if (usage.length === 0) {
    tableMessage(tbody, 8, 'No usage data for this month.', 'empty-state');
    summary.style.display = 'none';
    return;
  }

  // Summary bar
  var t = usageTotals;
  var hasEnhanced = usage.some(function (u) { return u.costSource === 'enhanced'; });
  var hasLegacy = usage.some(function (u) { return u.costSource === 'blended'; });
  summary.replaceChildren();
  function summaryItem(label, value, className, suffix) {
    var item = element('span', '', label + ': ');
    item.append(element('strong', className || '', value));
    if (suffix) item.append(document.createTextNode(suffix));
    summary.append(item);
  }
  summaryItem('API Cost', money(t.estimatedCost), 'cost');
  summaryItem('Revenue', money(t.revenue), 'revenue');
  summaryItem('Net', money(t.profit), 'profit', ' (' + number(t.marginPercent) + '%)');
  summaryItem('Devices', usage.length);
  if (hasEnhanced) summary.append(element('span', '', '● enhanced = real tokens + estimated whisper/gemini'));
  if (hasLegacy) summary.append(element('span', '', '~est = blended average (no endpoint data)'));
  summary.style.display = 'flex';

  tbody.replaceChildren();
  usage.forEach(function (u) {
    var ep = u.endpoints || {};
    var row = element('tr');
    row.append(cell(u.email || copyable(u.deviceId, 'mono truncate', String(u.deviceId || '').substring(0, 14) + '...')));
    row.append(cell(number(ep.whisper) + number(ep.chat), 'right mono'));
    row.append(cell(number(ep['assemblyai-submit']) + number(ep['assemblyai-upload']) + number(ep['assemblyai-poll']), 'right mono'));
    row.append(cell(number(ep.gemini), 'right mono'));
    row.append(cell(element('strong', '', number(u.totalCalls)), 'right'));
    var costCell = cell(money(u.cost !== undefined ? u.cost : u.estimatedCost), 'right mono');
    if (u.costSource === 'enhanced') {
      var badge = element('span', '', ' ●');
      badge.title = 'Real token/duration data from API responses';
      costCell.append(badge);
      if (u.realCostBreakdown) {
        var rb = u.realCostBreakdown;
        costCell.title = 'Chat: $' + number(rb.realCostChat).toFixed(4) + ' (' + number(rb.tokensInputChat) + ' in / ' + number(rb.tokensOutputChat) + ' out)' +
          '\nAAI: $' + number(rb.realCostAssemblyai).toFixed(4) + ' (' + number(rb.audioDurationSeconds).toFixed(0) + 's audio)' +
          '\nWhisper est: $' + number(rb.whisperEstimate).toFixed(4) +
          '\nGemini est: $' + number(rb.geminiEstimate).toFixed(4) +
          (rb.lastModelChat ? '\nModel: ' + String(rb.lastModelChat) : '');
      }
    } else if (u.costSource === 'blended') {
      costCell.append(element('span', '', ' ~est'));
      costCell.title = 'Blended average — no per-endpoint data';
    }
    row.append(costCell, cell(money(u.revenue), 'right mono'));
    row.append(cell(money(u.profit), 'right mono ' + (number(u.profit) >= 0 ? 'profit-positive' : 'profit-negative')));
    tbody.append(row);
  });
}

function updateCostStats() {
  var t = usageTotals;
  if (t && t.estimatedCost !== undefined) {
    document.getElementById('statApiCost').textContent = money(t.estimatedCost);
    document.getElementById('statApiCostSub').textContent = 'This month';

    var profit = number(t.profit);
    var margin = number(t.marginPercent);
    document.getElementById('statNetMargin').textContent = '$' + profit.toFixed(2);
    var marginEl = document.getElementById('statNetMargin');
    marginEl.className = 'stat-card-value ' + (profit >= 0 ? 'green' : 'red');
    document.getElementById('statNetMarginSub').textContent = margin + '% margin';
  }
}

// --- Detail Row Helpers ---

function toggleDetail(rowId, triggerRow) {
  var detail = document.getElementById(rowId);
  if (!detail) return;
  detail.classList.toggle('visible');
  triggerRow.classList.toggle('expanded');
}

function buildDetailItems(obj, knownKeys) {
  var grid = element('div', 'detail-grid');
  var allKeys = knownKeys.slice();
  Object.keys(obj).forEach(function (key) {
    if (allKeys.indexOf(key) === -1) allKeys.push(key);
  });
  allKeys.forEach(function (key) {
    var val = obj[key];
    var displayVal = val === undefined || val === null ? '--' : String(val);
    var isDate = key.toLowerCase().endsWith('at') && key.length > 2;
    if (isDate && displayVal !== '--') displayVal = formatDate(displayVal);
    var isCopyable = displayVal.length > 20 || /id|key/i.test(key);
    var item = element('div', 'detail-item');
    item.append(element('span', 'detail-label', formatFieldName(key)));
    item.append(isCopyable && displayVal !== '--'
      ? copyable(displayVal, 'detail-value')
      : element('span', 'detail-value', displayVal));
    grid.append(item);
  });
  return grid;
}

function appendDetails(tbody, row, rowId, obj, knownKeys) {
  var detail = element('tr', 'detail-row');
  detail.id = rowId;
  var td = cell(buildDetailItems(obj, knownKeys));
  td.colSpan = 6;
  detail.append(td);
  row.addEventListener('click', function () { toggleDetail(rowId, row); });
  tbody.append(row, detail);
}

function formatFieldName(key) {
  // Convert camelCase to Title Case (e.g. "stripeCustomerId" -> "Stripe Customer Id")
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); });
}

// --- Utilities ---

function formatDate(iso) {
  if (!iso) return '--';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// API fields are only assigned as text or DOM properties, never parsed as HTML or code.
function element(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function cell(value, className) {
  var td = element('td', className);
  if (value && typeof value === 'object' && value.nodeType) td.append(value);
  else td.textContent = String(value === undefined || value === null ? '' : value);
  return td;
}

function copyable(value, className, label) {
  var text = String(value === undefined || value === null ? '' : value);
  var node = element('span', className + ' copyable', label === undefined ? text : label);
  node.title = text;
  node.addEventListener('click', function (event) {
    event.stopPropagation();
    copyText(text);
  });
  return node;
}

function tableMessage(tbody, columns, text, className) {
  var row = element('tr');
  var td = cell(text, className);
  td.colSpan = columns;
  row.append(td);
  tbody.replaceChildren(row);
}

function number(value) {
  var result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function money(value) { return '$' + number(value).toFixed(2); }

function copyText(text) {
  navigator.clipboard.writeText(text).then(function () {
    showToast('Copied to clipboard');
  }).catch(function () { showToast('Clipboard unavailable.'); });
}

var toastTimer;
function showToast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove('visible');
  }, 2500);
}

// --- Init ---

document.getElementById('secretInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') handleLogin();
});

[
  ['loginBtn', 'click', handleLogin],
  ['refreshBtn', 'click', refreshAll],
  ['logoutBtn', 'click', handleLogout],
  ['stripeVerifyBtn', 'click', verifyWithStripe],
  ['generateBtn', 'click', toggleLicenseForm],
  ['cancelLicenseBtn', 'click', toggleLicenseForm],
  ['createLicenseBtn', 'click', generateLicense],
  ['globalSearch', 'input', handleGlobalSearch],
  ['usageMonth', 'change', fetchUsageDetailed],
  ['subscriberStatusFilter', 'change', function () { renderSubscribers(); }],
  ['subscriberTierFilter', 'change', function () { renderSubscribers(); }]
].forEach(function (binding) {
  document.getElementById(binding[0]).addEventListener(binding[1], binding[2]);
});
// Clear memory and rendered customer data before this page can enter the back/forward cache.
window.addEventListener('pagehide', handleLogout);
})();
