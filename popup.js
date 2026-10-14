const U = (typeof ShortlinksUtils !== 'undefined' && ShortlinksUtils) ||
  (typeof self !== 'undefined' && self.ShortlinksUtils) || null;

const isFirefox = typeof browser !== 'undefined' && !!browser.storage;
const api = isFirefox ? browser : chrome;

const DEFAULTS = { enabled: true, whitelist: [], blacklist: [] };
const SYNC_ITEM_LIMIT = 8000;
let currentHost = '';

function storageGet(defaults) {
  return new Promise((resolve) => {
    try {
      if (isFirefox) api.storage.sync.get(defaults).then((d) => resolve(d || defaults), () => resolve(defaults));
      else api.storage.sync.get(defaults, (d) => resolve(d || defaults));
    } catch (e) { resolve(defaults); }
  });
}

function storageSet(items) {
  return new Promise((resolve, reject) => {
    try {
      if (isFirefox) {
        api.storage.sync.set(items).then(resolve, (e) => reject(e || new Error('Save failed')));
      } else {
        api.storage.sync.set(items, () => {
          const err = api.runtime && api.runtime.lastError;
          if (err) reject(new Error(err.message)); else resolve();
        });
      }
    } catch (e) { reject(e); }
  });
}

function queryTab() {
  return new Promise((resolve) => {
    try {
      if (isFirefox) api.tabs.query({ active: true, currentWindow: true }).then((t) => resolve(t && t[0]), () => resolve(null));
      else api.tabs.query({ active: true, currentWindow: true }, (t) => resolve(t && t[0]));
    } catch (e) { resolve(null); }
  });
}

function domainOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; }
}

function matchHost(host, list) {
  if (U) return U.matchDomain(host, list);
  return (list || []).some((d) => {
    d = String(d).trim().toLowerCase();
    return d && (host === d || host.endsWith('.' + d));
  });
}

function removeHost(host, list) {
  return (list || []).filter((d) => {
    const dd = String(d).trim().toLowerCase();
    return !(host === dd || host.endsWith('.' + dd));
  });
}

function readInputs() {
  return {
    enabled: document.getElementById('enabled').checked,
    whitelist: document.getElementById('whitelist').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    blacklist: document.getElementById('blacklist').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
  };
}

function setStatus(text, isError) {
  const st = document.getElementById('status');
  st.textContent = text || '';
  st.className = isError ? 'err' : '';
}

function renderSite() {
  const hostEl = document.getElementById('site-host');
  const pill = document.getElementById('site-state');
  if (!currentHost) {
    hostEl.textContent = 'No active web page';
    pill.textContent = '';
    pill.className = 'pill';
    return;
  }
  hostEl.textContent = currentHost;
  const data = readInputs();
  let label = 'Active on this site';
  let cls = 'pill on';
  if (!data.enabled) { label = 'Extension disabled'; cls = 'pill off'; }
  else if (matchHost(currentHost, data.blacklist)) { label = 'Paused here'; cls = 'pill off'; }
  else if (data.whitelist.length && !matchHost(currentHost, data.whitelist)) { label = 'Not whitelisted'; cls = 'pill off'; }
  pill.textContent = label;
  pill.className = cls;
}

async function save() {
  const data = readInputs();
  const wlSize = JSON.stringify(data.whitelist).length;
  const blSize = JSON.stringify(data.blacklist).length;
  if (wlSize > SYNC_ITEM_LIMIT || blSize > SYNC_ITEM_LIMIT) {
    setStatus('List too large to sync (max ~8 KB per list)', true);
    return false;
  }
  try {
    await storageSet(data);
    setStatus('Saved');
    setTimeout(() => { if (document.getElementById('status').textContent === 'Saved') setStatus(''); }, 1200);
    renderSite();
    return true;
  } catch (e) {
    setStatus('Save failed: ' + (e && e.message ? e.message : e), true);
    return false;
  }
}

async function load() {
  const data = await storageGet(DEFAULTS);
  document.getElementById('enabled').checked = data.enabled !== false;
  document.getElementById('whitelist').value = (data.whitelist || []).join('\n');
  document.getElementById('blacklist').value = (data.blacklist || []).join('\n');
  const tab = await queryTab();
  currentHost = tab && tab.url ? domainOf(tab.url) : '';
  renderSite();
}

function alwaysSkipHere() {
  if (!currentHost) return;
  const data = readInputs();
  data.blacklist = removeHost(currentHost, data.blacklist);
  if (!matchHost(currentHost, data.whitelist)) data.whitelist.push(currentHost);
  document.getElementById('whitelist').value = data.whitelist.join('\n');
  document.getElementById('blacklist').value = data.blacklist.join('\n');
  save();
}

function neverSkipHere() {
  if (!currentHost) return;
  const data = readInputs();
  data.whitelist = removeHost(currentHost, data.whitelist);
  if (!matchHost(currentHost, data.blacklist)) data.blacklist.push(currentHost);
  document.getElementById('whitelist').value = data.whitelist.join('\n');
  document.getElementById('blacklist').value = data.blacklist.join('\n');
  save();
}

function resetDefaults() {
  document.getElementById('enabled').checked = true;
  document.getElementById('whitelist').value = '';
  document.getElementById('blacklist').value = '';
  save();
}

function exportData() {
  const blob = new Blob([JSON.stringify(readInputs(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shortlinks-skipper-settings.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (typeof data !== 'object' || data === null) throw new Error('Invalid settings file');
      const wl = Array.isArray(data.whitelist) ? data.whitelist : [];
      const bl = Array.isArray(data.blacklist) ? data.blacklist : [];
      document.getElementById('enabled').checked = data.enabled !== false;
      document.getElementById('whitelist').value = wl.join('\n');
      document.getElementById('blacklist').value = bl.join('\n');
      save();
    } catch (e) {
      setStatus('Import failed: ' + (e && e.message ? e.message : e), true);
    }
  };
  reader.onerror = () => setStatus('Import failed', true);
  reader.readAsText(file);
}

document.getElementById('enabled').addEventListener('change', save);
document.getElementById('save').addEventListener('click', save);
document.getElementById('btn-resume').addEventListener('click', alwaysSkipHere);
document.getElementById('btn-pause').addEventListener('click', neverSkipHere);
document.getElementById('btn-reset').addEventListener('click', resetDefaults);
document.getElementById('btn-export').addEventListener('click', exportData);
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) importData(file);
  e.target.value = '';
});
document.getElementById('whitelist').addEventListener('input', renderSite);
document.getElementById('blacklist').addEventListener('input', renderSite);

load();
