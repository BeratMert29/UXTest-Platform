// UXTest Extension - Background Service Worker

// Set default backend URL on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    backendUrl: 'http://localhost:3001'
  });
  console.log('[UXTest] Extension installed');
});

// Proxy fetch requests from content scripts to avoid mixed-content blocks.
// Content scripts on HTTPS pages cannot fetch HTTP URLs directly; the
// background service worker has no such restriction.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_URL') {
    fetch(message.url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'PROXY_REQUEST') {
    var fetchOpts = {
      method: message.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    if (message.body) fetchOpts.body = JSON.stringify(message.body);
    fetch(message.url, fetchOpts)
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'HTTP ' + r.status); });
        return r.json().catch(function() { return {}; });
      })
      .then(function(data) { sendResponse({ data: data }); })
      .catch(function(err) { sendResponse({ error: err.message }); });
    return true;
  }

  if (message.type === 'INJECT_SDK') {
    const tabUrl = sender.tab?.url || '';
    if (!sender.tab?.id || tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
      sendResponse({ ok: false, error: null });
      return true;
    }
    const tabId = sender.tab.id;
    const activeTest = message.activeTest;

    // Step 1: inject proxy + suppress auto-resume BEFORE SDK loads
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        window.__uxtestNoAutoResume = true;
        window.__uxtestFetch = function(url, method, body) {
          return new Promise(function(resolve, reject) {
            var id = Date.now().toString(36) + Math.random().toString(36).slice(2);
            function handler(e) {
              if (e.detail && e.detail.id === id) {
                window.removeEventListener('__uxtestProxyResponse', handler);
                if (e.detail.error) reject(new Error(e.detail.error));
                else resolve(e.detail.data);
              }
            }
            window.addEventListener('__uxtestProxyResponse', handler);
            window.dispatchEvent(new CustomEvent('__uxtestProxyRequest', {
              detail: { id: id, url: url, method: method, body: body }
            }));
          });
        };
      }
    })
    // Step 2: load the SDK (auto-resume is now suppressed, proxy is ready)
    .then(() => chrome.scripting.executeScript({
      target: { tabId },
      files: ['uxtest.min.js'],
      world: 'MAIN'
    }))
    // Step 3: initialize with the test config
    .then(() => chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (test) => {
        if (!window.UXTest) return;
        window.UXTest.init({
          projectId: test.projectId,
          testId: test.id,
          variant: test.variant,
          endpoint: test.backendUrl,
          tasks: test.tasks || []
        });
      },
      args: [activeTest]
    }))
    .then(() => sendResponse({ ok: true }))
    .catch(err => sendResponse({ ok: false, error: err.message }));

    return true; // keep message channel open for async response
  }
});

