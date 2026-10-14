(function () {
  const U = (typeof self !== 'undefined' && self.ShortlinksUtils) ||
    (typeof ShortlinksUtils !== 'undefined' ? ShortlinksUtils : null);
  if (!U) return;
  const parseOnclick = U.parseOnclick;
  const parseHref = U.parseHref;
  const domainAllowed = U.domainAllowed;
  const scoreGetLink = U.scoreGetLink;

  const isEarlyPage = () => {
    const t = (document.title || '').toLowerCase();
    if (t.includes('just a moment') || t.includes('one moment') || t.includes('checking your browser') ||
      t.includes('attention required') || t.includes('cloudflare') || t.includes('ddos')) return true;
    const bodyText = (document.body && document.body.textContent || '').toLowerCase();
    if (bodyText.includes('checking your browser') || bodyText.includes('ddos protection') ||
      bodyText.includes('enable javascript and cookies to continue') ||
      bodyText.includes('please wait while your request is being verified') ||
      bodyText.includes('accessing the link without any vpn')) return true;
    return false;
  };

  const tooEarlyPage = () => {
    const body = (document.body && document.body.textContent || '').toLowerCase();
    const title = (document.title || '').toLowerCase();
    return body.includes('too early') || body.includes("isn't ready yet") ||
      body.includes('isnt ready yet') || body.includes('url isnt ready') ||
      body.includes('is not ready yet') || title.includes('too early');
  };

  const isShortenerHost = () =>
    /(shortxlinks|adlinkfly|gplinks|shrinkme|shrinkearn|mdiskshortner|try2link|tnlink|rocklinks|dropgalaxy)/i.test(location.hostname);

  const isFirefox = typeof browser !== 'undefined' && !!browser.storage;
  const ext = isFirefox ? browser : (typeof chrome !== 'undefined' && chrome.storage ? chrome : null);

  function loadSettings(cb) {
    const defaults = { enabled: true, whitelist: [], blacklist: [] };
    if (!ext) { cb(defaults); return; }
    try {
      if (isFirefox) {
        ext.storage.sync.get(defaults).then(cb, () => cb(defaults));
      } else {
        ext.storage.sync.get(defaults, (data) => cb(data || defaults));
      }
    } catch (e) { cb(defaults); }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  function captchaPresent() {
    try {
      return !!document.querySelector(
        'iframe[src*="challenges.cloudflare.com"], iframe[src*="hcaptcha.com"], iframe[src*="recaptcha"], ' +
        '.g-recaptcha, .h-captcha, .cf-turnstile, [class*="turnstile"], #challenge-form, #cf-challenge-running'
      );
    } catch (e) { return false; }
  }

  function findClickable(el) {
    if (!el) return null;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT') return el;
    if (el.hasAttribute('onclick') || el.getAttribute('role') === 'button') return el;
    const child = el.querySelector('a, button, input[type="submit"], [role="button"]');
    return child || el;
  }

  let redirected = false;
  let running = false;
  let navigating = false;
  function markDone() { window.__shortlinks_skipper_done__ = true; }
  function isDone() { return window.__shortlinks_skipper_done__; }

  function redirectToUrl(url) {
    if (!url || redirected || isDone()) return false;
    redirected = true;
    markDone();
    try { window.location.replace(url); } catch (e) { try { window.location.href = url; } catch (ee) {} }
    return true;
  }

  function clickElement(el) {
    if (!el || redirected || isDone() || navigating) return false;
    const c = findClickable(el);
    if (!c) return false;
    try { c.focus(); } catch (e) {}
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(type => {
      try { c.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })); } catch (e) {}
    });
    try { c.click(); } catch (e) {}
    return true;
  }

  function extractLink(el) {
    if (!el) return '';
    let oc = (el.getAttribute && el.getAttribute('onclick')) || '';
    if (!oc && typeof el.onclick === 'function') {
      try { oc = el.onclick.toString(); } catch (e) { oc = ''; }
    }
    const fromOnclick = parseOnclick(oc);
    if (fromOnclick) return fromOnclick;
    const href = el.getAttribute ? (el.getAttribute('href') || el.href || '') : (el.href || '');
    return parseHref(href);
  }

  function findGenerate() {
    const g = document.getElementById('wpsafe-generate');
    if (g) {
      const a = g.querySelector('a');
      if (a) return a;
      const img = g.querySelector('img');
      if (img) return img.closest('a') || img;
    }
    let el = document.querySelector('a[onclick="wpsafegenerate()"], [onclick*="wpsafegenerate"], a[href="#wpsafegenerate"]');
    if (el) return el;
    const img = document.querySelector('img[alt*="CLICK 2X FOR GENERATE LINK"], img[alt*="GENERATE LINK"], img[src*="generate"], img[alt*="CLICK 2X"]');
    if (img) {
      const a = img.closest('a');
      if (a) return a;
      return img;
    }
    const top = document.querySelector('.wpsafe-top, .wpsafe, .wp-safelink');
    if (top) {
      const a = top.querySelector('a[href="#wpsafegenerate"], a[onclick*="generate"]');
      if (a) return a;
    }
    return null;
  }

  function findFinal() {
    const l = document.getElementById('wpsafe-link');
    if (l) {
      const a = l.querySelector('a[onclick], a[href]') || l.querySelector('a');
      if (a) return a;
    }
    const a = document.querySelector('a[onclick*="safelink_redirect"], a[onclick*="wpsafegenerate"]');
    if (a) return a;
    return null;
  }

  function findGetLink() {
    const nodes = document.querySelectorAll('a, button, input[type="button"], input[type="submit"]');
    let best = null, bestScore = 0;
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const txt = el.textContent || el.value || '';
      const idc = (el.id || '') + ' ' + (el.className || '');
      const score = scoreGetLink(txt, idc);
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return bestScore >= 1 ? best : null;
  }

  function hasSafelink() {
    return !!(document.getElementById('wpsafe-generate') ||
      document.getElementById('wpsafe-link') ||
      document.querySelector('a[onclick*="safelink_redirect"], a[onclick*="wpsafegenerate"]'));
  }

  function inShortenerFlow() {
    try { if (sessionStorage.getItem('__sl_shortener__') === '1') return true; } catch (e) {}
    if (!isShortenerHost()) return false;
    return location.pathname.replace(/\/+$/, '').length > 1;
  }

  function isTargetPage() {
    if (tooEarlyPage()) return true;
    if (inShortenerFlow()) return true;
    if (hasSafelink()) return true;
    return false;
  }

  function skipContext() {
    if (tooEarlyPage()) return true;
    if (inShortenerFlow()) return true;
    if (document.getElementById('wpsafe-generate') || document.getElementById('wpsafe-link')) return true;
    if (document.querySelector('a[onclick*="safelink_redirect"], a[onclick*="wpsafegenerate"]')) return true;
    return false;
  }

  let overlayStatusEl = null;
  let overlayTimer = null;
  let overlayDismissed = false;

  function showOverlay() {
    try {
      if (overlayDismissed || captchaPresent()) return;
      if (document.getElementById('__sl_overlay')) return;

      const el = document.createElement('div');
      el.id = '__sl_overlay';
      el.style.cssText =
        'all:initial;position:fixed!important;top:0!important;left:0!important;' +
        'width:100vw!important;height:100vh!important;z-index:2147483647!important;' +
        'background:#0b0b0d!important;color:#fff!important;display:flex!important;' +
        'flex-direction:column!important;align-items:center!important;justify-content:center!important;' +
        'gap:18px!important;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;' +
        'pointer-events:none!important';

      const ring = document.createElement('div');
      ring.style.cssText =
        'width:46px!important;height:46px!important;box-sizing:border-box!important;' +
        'border:4px solid rgba(255,255,255,.18)!important;border-top-color:#6366f1!important;' +
        'border-radius:50%!important;display:block!important;will-change:transform!important';

      const title = document.createElement('div');
      title.style.cssText =
        'all:initial;color:#fff!important;font-size:20px!important;font-weight:600!important;' +
        'letter-spacing:.4px!important;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important';
      title.textContent = 'Skipping…';

      const status = document.createElement('div');
      status.style.cssText =
        'all:initial;color:rgba(255,255,255,.55)!important;font-size:12px!important;' +
        'font-weight:600!important;letter-spacing:1px!important;text-transform:uppercase!important;' +
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important';
      status.textContent = 'Preparing…';

      const hint = document.createElement('div');
      hint.style.cssText =
        'all:initial;color:rgba(255,255,255,.3)!important;font-size:11px!important;' +
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important';
      hint.textContent = 'Press Esc to show this page';

      el.appendChild(ring);
      el.appendChild(title);
      el.appendChild(status);
      el.appendChild(hint);
      (document.documentElement || document.body).appendChild(el);
      overlayStatusEl = status;

      try {
        if (ring.animate) {
          ring.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: 800, iterations: Infinity, easing: 'linear' }
          );
        } else {
          const st = document.createElement('style');
          st.id = '__sl_overlay_style';
          st.textContent = '@keyframes __sl_spin{to{transform:rotate(360deg)}}';
          document.head.appendChild(st);
          ring.style.animation = '__sl_spin .8s linear infinite';
        }
      } catch (e) {}

      overlayTimer = setTimeout(() => { hideOverlay(); }, 90000);
    } catch (e) {}
  }

  function setOverlayStatus(msg) {
    if (overlayStatusEl && overlayStatusEl.textContent !== msg) overlayStatusEl.textContent = msg;
  }

  function hideOverlay() {
    const el = document.getElementById('__sl_overlay');
    if (el) el.remove();
    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }
    overlayStatusEl = null;
  }

  function dismissOverlay() {
    overlayDismissed = true;
    hideOverlay();
  }

  function giveUp(msg) {
    setOverlayStatus(msg);
    setTimeout(() => {
      if (overlayStatusEl === null || (overlayStatusEl && overlayStatusEl.textContent === msg)) dismissOverlay();
    }, 2500);
  }

  let globalBound = false;
  function bindGlobal() {
    if (globalBound) return;
    globalBound = true;
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismissOverlay(); }, true);
    window.addEventListener('pagehide', () => { navigating = true; }, true);
    window.addEventListener('beforeunload', () => { navigating = true; }, true);
  }

  async function handleTooEarly() {
    setOverlayStatus('Waiting for the unlock…');
    try { sessionStorage.setItem('__sl_shortener__', '1'); } catch (e) {}
    for (let i = 0; i < 80; i++) {
      if (navigating || redirected) return;
      if (!tooEarlyPage()) { run(); return; }
      await sleep(250);
    }
    let n = 0;
    try { n = parseInt(sessionStorage.getItem('__sl_tooearly_n__') || '0', 10) || 0; } catch (e) {}
    if (n >= 8) { giveUp('Unlock not ready — try reloading'); return; }
    try { sessionStorage.setItem('__sl_tooearly_n__', String(n + 1)); } catch (e) {}
    setOverlayStatus('Reloading to retry…');
    setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 1000);
  }

  async function runShortenerFlow() {
    const deadline = Date.now() + 240000;
    let lastEl = null, lastClick = 0, lastMsg = '';
    while (Date.now() < deadline) {
      if (isDone() || redirected || navigating) return;
      showOverlay();
      if (captchaPresent()) {
        if (lastMsg !== 'v') { setOverlayStatus('Complete the verification to continue…'); lastMsg = 'v'; }
        await sleep(500);
        continue;
      }
      const gl = findGetLink();
      if (gl) {
        if (lastMsg !== 'c') { setOverlayStatus('Clicking through…'); lastMsg = 'c'; }
        const now = Date.now();
        if (gl !== lastEl || now - lastClick > 1500) {
          clickElement(gl);
          lastEl = gl;
          lastClick = now;
        }
        await sleep(250);
      } else {
        if (lastMsg !== 'w') { setOverlayStatus('Waiting for Get Link…'); lastMsg = 'w'; }
        await sleep(150);
      }
    }
    if (!isDone() && !redirected && !navigating) giveUp('Still on the shortener page — showing it');
  }

  async function run() {
    if (running || isDone() || redirected || navigating) return;
    running = true;
    try {
      if (!isTargetPage()) return;
      if (inShortenerFlow()) {
        showOverlay();
        await runShortenerFlow();
        return;
      }
      showOverlay();
      try {
        if (typeof window.wpsafegenerate === 'function') {
          window.wpsafegenerate();
          await sleep(150);
          if (isDone() || redirected || navigating) return;
        }
      } catch (e) {}
      for (let i = 0; i < 1800; i++) {
        if (isDone() || redirected || navigating) return;
        if (captchaPresent()) {
          setOverlayStatus('Complete the verification to continue…');
          await sleep(500);
          continue;
        }
        const fin = findFinal();
        if (fin) {
          const url = extractLink(fin);
          if (url) { redirectToUrl(url); return; }
          if (isVisible(fin)) {
            clickElement(fin);
            await sleep(60);
            if (isDone() || redirected || navigating) return;
            continue;
          }
        }
        const gen = findGenerate();
        if (gen && isVisible(gen)) {
          clickElement(gen);
          await sleep(60);
          if (isDone() || redirected || navigating) return;
          continue;
        }
        await sleep(20);
      }
      if (!isDone() && !redirected && !navigating) giveUp('Could not find the link — showing the page');
    } finally {
      running = false;
    }
  }

  let observerAttached = false;
  let pendingRun = null;
  function scheduleRun() {
    if (pendingRun) return;
    pendingRun = setTimeout(() => { pendingRun = null; run(); }, 120);
  }

  function attachObserver() {
    if (observerAttached) return;
    observerAttached = true;
    try {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          const t = m.target;
          if (t && t.closest && t.closest('#__sl_overlay')) continue;
          scheduleRun();
          return;
        }
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  function start() {
    if (!isTargetPage()) return;
    bindGlobal();
    attachObserver();
    if (skipContext()) showOverlay();
    if (tooEarlyPage()) { handleTooEarly(); return; }
    try { sessionStorage.removeItem('__sl_tooearly_n__'); } catch (e) {}
    if (isEarlyPage()) {
      const earlyFinal = findFinal();
      if (!(earlyFinal && extractLink(earlyFinal))) return;
    }
    run();
  }

  loadSettings((data) => { if (domainAllowed(data, location.hostname)) start(); });

  if (ext && ext.storage && ext.storage.onChanged) {
    ext.storage.onChanged.addListener((changes, area) => {
      if (area && area !== 'sync') return;
      loadSettings((data) => { if (domainAllowed(data, location.hostname)) start(); });
    });
  }
})();
