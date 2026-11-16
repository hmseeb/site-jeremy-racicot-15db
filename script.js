/* Jeremy Racicot — site behaviour
   Progressive enhancement only: the form works as a plain POST without JS. */
(function () {
  'use strict';

  var ENDPOINT = 'https://vision.leadrai.com/api/forms/0faafb99f10cea34b5b9a9f526357d38';

  /* ---------------------------------------------------------- Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------- Hidden _page field (current URL) */
  var pageField = document.getElementById('page-field');
  if (pageField) pageField.value = window.location.href;

  var form = document.getElementById('quote-form');
  var statusEl = document.getElementById('form-status');
  var errorEl = document.getElementById('form-error');
  var submitBtn = document.getElementById('submit-btn');

  function showConfirmation(scroll) {
    if (!statusEl) return;
    statusEl.hidden = false;
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    if (scroll) {
      try {
        statusEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (e) {
        statusEl.scrollIntoView();
      }
    }
  }

  /* --------------- Confirmation after a plain (non-JS) form submission */
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('submitted') === '1') {
      showConfirmation(true);
      if (form) form.setAttribute('hidden', 'hidden');
    }
  } catch (e) { /* URLSearchParams unavailable — plain POST flow still fine */ }

  /* --------------------------------------------- Enhanced fetch submission */
  if (form && window.fetch) {
    form.addEventListener('submit', function (event) {
      // Honeypot filled in: silently drop.
      var gotcha = form.querySelector('input[name="_gotcha"]');
      if (gotcha && gotcha.value) {
        event.preventDefault();
        return;
      }

      // Keep _page current at submit time.
      if (pageField) pageField.value = window.location.href;

      // Validate required fields, showing a single clear message.
      var required = ['name', 'email', 'details'];
      var firstBad = null;
      for (var i = 0; i < required.length; i++) {
        var el = document.getElementById(required[i]);
        if (!el) continue;
        var ok = el.value.trim() !== '' && (el.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !firstBad) firstBad = el;
      }
      if (firstBad) {
        event.preventDefault();
        if (errorEl) {
          errorEl.textContent = 'Please add your name, a valid email address, and a short description of the job.';
          errorEl.hidden = false;
        }
        firstBad.focus();
        return;
      }

      event.preventDefault();

      var data = {};
      var fd = new FormData(form);
      fd.forEach(function (value, key) {
        if (key === '_gotcha') return;
        data[key] = typeof value === 'string' ? value : String(value);
      });
      data._page = window.location.href;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      if (errorEl) errorEl.hidden = true;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed');
          return response.json().catch(function () { return { ok: true }; });
        })
        .then(function (result) {
          if (result && result.ok === false) throw new Error('Submission rejected');
          form.reset();
          if (pageField) pageField.value = window.location.href;
          form.setAttribute('hidden', 'hidden');
          showConfirmation(true);
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request a quote';
          }
          if (errorEl) {
            errorEl.textContent = 'Sorry, that did not send. Please check your connection and try again.';
            errorEl.hidden = false;
          }
          // Last resort: let the browser do a normal POST.
          form.removeAttribute('hidden');
        });
    });
  }
})();
