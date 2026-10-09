(function () {
  'use strict';
  // Sign-up form for Tagalong updates. Email is required; first name, mobile number and
  // the text consent box are all optional. The consent wording lives in texts.html and
  // must stay identical to the A2P campaign registration.
  const ENDPOINT = 'https://sms-promote-production.up.railway.app/public/join';
  const TIMEOUT_MS = 15000;
  const SUPPORT = 'support@tagalongai.com';
  const SUCCESS_EMAIL = "Thanks! You're signed up for Tagalong email updates.";
  const SUCCESS_TEXTS = "Thanks! You're signed up for Tagalong email updates and texts from Tagalong AI. Up to 4 msgs/month. Reply STOP to cancel, HELP for help.";

  const form = document.getElementById('texts-form');
  if (!form) return;
  const email = document.getElementById('texts-email');
  const firstName = document.getElementById('texts-first-name');
  const phone = document.getElementById('texts-phone');
  const honeypot = document.getElementById('texts-company-website');
  const consent = document.getElementById('texts-consent');
  const submit = document.getElementById('texts-submit');
  const status = document.getElementById('texts-status');
  const label = submit.textContent;
  let sending = false;

  // The button is always on (except while a request is in flight); it never depends on
  // the consent box. Without JS the form posts straight to the endpoint.
  submit.disabled = false;

  function show(message, kind) {
    status.className = 'texts-status is-' + kind;
    status.textContent = message;
  }
  function clear() {
    status.className = 'texts-status';
    status.textContent = '';
    email.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
  }
  function invalid(field, message) {
    field.setAttribute('aria-invalid', 'true');
    show(message, 'error');
    field.focus();
  }
  function emailLooksValid(value) {
    if (value.length > 254 || /\s/.test(value)) return false;
    const parts = value.split('@');
    if (parts.length !== 2 || !parts[0] || /[\x00-\x1f\x7f]/.test(value)) return false;
    const domain = parts[1];
    return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
  }
  function phoneLooksValid(value) {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+')) return digits.length === 11 && digits[0] === '1';
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  email.addEventListener('input', () => email.removeAttribute('aria-invalid'));
  phone.addEventListener('input', () => phone.removeAttribute('aria-invalid'));
  consent.addEventListener('change', () => { if (!consent.checked) phone.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    clear();
    const address = email.value.trim();
    if (!address) return invalid(email, 'Please enter your email address.');
    if (!emailLooksValid(address)) return invalid(email, 'Please enter a valid email address.');
    // Texts are opt-in only: the number is validated and sent only when the box is checked.
    const wantsTexts = consent.checked;
    if (wantsTexts) {
      if (!phone.value.trim()) return invalid(phone, 'Enter your mobile number to get texts, or uncheck the text box.');
      if (!phoneLooksValid(phone.value)) return invalid(phone, 'Please enter a US or Canadian mobile number.');
    }

    const fields = {
      email: address,
      first_name: firstName.value.trim().slice(0, 60),
      company_website: honeypot ? honeypot.value : '',
      page_url: String(window.location.href).slice(0, 300)
    };
    if (wantsTexts) {
      fields.phone = phone.value.trim();
      fields.consent = 'yes';
    }
    const body = new URLSearchParams(fields);
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
        const fallback = wantsTexts ? SUCCESS_TEXTS : SUCCESS_EMAIL;
        show(typeof data.message === 'string' && data.message ? data.message : fallback, 'success');
        form.reset();
        status.focus();
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
