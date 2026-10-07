(function () {
  'use strict';
  // Opt-in form for the Tagalong text program. Consent wording lives in texts.html
  // and must stay identical to the A2P campaign registration.
  const ENDPOINT = 'https://sms-promote-production.up.railway.app/public/join';
  const TIMEOUT_MS = 15000;
  const SUPPORT = 'support@tagalongai.com';

  const form = document.getElementById('texts-form');
  if (!form) return;
  const firstName = document.getElementById('texts-first-name');
  const phone = document.getElementById('texts-phone');
  const honeypot = document.getElementById('texts-company-website');
  const consent = document.getElementById('texts-consent');
  const submit = document.getElementById('texts-submit');
  const status = document.getElementById('texts-status');
  const label = submit.textContent;
  let sending = false;

  submit.disabled = false;

  function show(message, kind) {
    status.className = 'texts-status is-' + kind;
    status.textContent = message;
  }
  function clear() {
    status.className = 'texts-status';
    status.textContent = '';
    phone.removeAttribute('aria-invalid');
    consent.removeAttribute('aria-invalid');
  }
  function invalid(field, message) {
    field.setAttribute('aria-invalid', 'true');
    show(message, 'error');
    field.focus();
  }
  function phoneLooksValid(value) {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+')) return digits.length === 11 && digits[0] === '1';
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  phone.addEventListener('input', () => phone.removeAttribute('aria-invalid'));
  consent.addEventListener('change', () => consent.removeAttribute('aria-invalid'));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    clear();
    if (!phone.value.trim()) return invalid(phone, 'Please enter your mobile number.');
    if (!phoneLooksValid(phone.value)) return invalid(phone, 'Please enter a US or Canadian mobile number.');
    if (!consent.checked) return invalid(consent, 'Please check the box to agree to receive texts.');

    const body = new URLSearchParams({
      first_name: firstName.value.trim().slice(0, 60),
      phone: phone.value.trim(),
      consent: 'yes',
      company_website: honeypot ? honeypot.value : '',
      page_url: String(window.location.href).slice(0, 300)
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'Signing you up…';
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'omit',
        signal: controller.signal
      });
      let data = {};
      try { data = await response.json(); } catch (_) { data = {}; }
      if (response.ok && data && data.ok) {
        show(typeof data.message === 'string' && data.message ? data.message : "You're subscribed! Watch for a confirmation text.", 'success');
        form.reset();
      } else if (response.status === 429) {
        show('Too many sign-up attempts from this connection. Please try again in an hour.', 'error');
      } else {
        show(data && typeof data.error === 'string' && data.error ? data.error : 'Something went wrong. Please try again, or email ' + SUPPORT + '.', 'error');
      }
    } catch (_) {
      show('We couldn’t reach the sign-up service. Check your connection and try again, or email ' + SUPPORT + '.', 'error');
    } finally {
      clearTimeout(timer);
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });
})();
