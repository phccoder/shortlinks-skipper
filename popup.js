const isFirefox = typeof browser !== 'undefined' && !!browser.storage;
const api = isFirefox ? browser : chrome;

const DEFAULTS = { enabled: true, whitelist: [], blacklist: [] };
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
  return new Promise((resolve) => {
    try {
      if (isFirefox) api.storage.sync.set(items).then(resolve, resolve);
      else api.storage.sync.set(items, resolve);
    } catch (e) { resolve(); }
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
  return (list || []).some((d) => {
    d = String(d).trim().toLowerCase();
    return d && (host === d || host.endsWith('.' + d));
  });
}

function readInputs() {
  return {
    enabled: document.getElementById('enabled').checked,
    whitelist: document.getElementById('whitelist').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    blacklist: document.getElementById('blacklist').value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
  };
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
  await storageSet(data);
  const st = document.getElementById('status');
  st.textContent = 'Saved';
  setTimeout(() => { st.textContent = ''; }, 1000);
  renderSite();
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

function addCurrentToBlacklist() {
  if (!currentHost) return;
  const data = readInputs();
  if (!matchHost(currentHost, data.blacklist)) data.blacklist.push(currentHost);
  document.getElementById('blacklist').value = data.blacklist.join('\n');
  save();
}

function removeCurrentFromBlacklist() {
  if (!currentHost) return;
  const data = readInputs();
  data.blacklist = data.blacklist.filter((d) => {
    const dd = String(d).trim().toLowerCase();
    return !(currentHost === dd || currentHost.endsWith('.' + dd));
  });
  document.getElementById('blacklist').value = data.blacklist.join('\n');
  save();
}

document.getElementById('enabled').addEventListener('change', save);
document.getElementById('save').addEventListener('click', save);
document.getElementById('btn-pause').addEventListener('click', addCurrentToBlacklist);
document.getElementById('btn-resume').addEventListener('click', removeCurrentFromBlacklist);
document.getElementById('whitelist').addEventListener('input', renderSite);
document.getElementById('blacklist').addEventListener('input', renderSite);

load();
