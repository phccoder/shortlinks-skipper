(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  if (root) root.ShortlinksUtils = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function htmlDecode(str) {
    if (!str) return '';
    return String(str)
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function parseOnclick(handler) {
    if (!handler) return '';
    const h = htmlDecode(handler);
    let m = h.match(/window\.open\(\s*['"]([^'"]+)['"]/);
    if (!m) m = h.match(/location\.(?:href|replace\s*\()\s*=?\s*['"]([^'"]+)['"]/);
    if (!m) m = h.match(/location\.replace\(\s*['"]([^'"]+)['"]/);
    if (!m) m = h.match(/location\.(?:href|assign)\s*=\s*['"]([^'"]+)['"]/);
    if (!m) m = h.match(/['"](https?:\/\/[^'"]+)['"]/);
    return m && m[1] ? m[1] : '';
  }

  function parseHref(href) {
    const raw = htmlDecode(href || '');
    if (raw && /^https?:\/\//i.test(raw) && raw.indexOf('#') === -1) return raw;
    return '';
  }

  function matchDomain(host, list) {
    host = String(host || '').toLowerCase();
    return (list || []).some(function (d) {
      d = String(d).trim().toLowerCase();
      return d && (host === d || host.endsWith('.' + d));
    });
  }

  function domainAllowed(settings, host) {
    settings = settings || {};
    if (settings.enabled === false) return false;
    if (matchDomain(host, settings.blacklist)) return false;
    if ((settings.whitelist || []).length && !matchDomain(host, settings.whitelist)) return false;
    return true;
  }

  function scoreGetLink(text, idClass) {
    const txt = String(text || '').trim().toLowerCase();
    const idc = String(idClass || '').toLowerCase();
    if (/(get-?link|btn6|go-link)/.test(idc)) return 3;
    if (txt === 'get link' || txt === 'getlink') return 3;
    if (txt.indexOf('get link') !== -1) return 2;
    if (/\b(continue|proceed)\b/.test(txt) || /(continue|proceed)/.test(idc)) return 2;
    if (['click here', 'verify', 'proceed', 'continue'].some(function (w) { return txt.indexOf(w) !== -1; })) return 1;
    return 0;
  }

  return {
    htmlDecode: htmlDecode,
    parseOnclick: parseOnclick,
    parseHref: parseHref,
    matchDomain: matchDomain,
    domainAllowed: domainAllowed,
    scoreGetLink: scoreGetLink
  };
});
