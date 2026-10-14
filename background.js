const isFirefox = typeof browser !== 'undefined' && !!browser.runtime;
const api = isFirefox ? browser : chrome;

api.runtime.onInstalled.addListener(() => {
  const defaults = { enabled: true, whitelist: [], blacklist: [] };
  try {
    if (isFirefox) {
      api.storage.sync.get(defaults).then((data) => api.storage.sync.set(data));
    } else {
      api.storage.sync.get(defaults, (data) => api.storage.sync.set(data));
    }
  } catch (e) {}
});
