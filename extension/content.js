// UXTest Extension - Content Script
// This runs on every page and manages SDK injection
// Uses fetch() to load SDK source to bypass CSP script-src restrictions

let sdkLoaded = false;
let activeTest = null;

// Check for active test on page load
async function checkActiveTest() {
  // Check chrome.storage.local first (set by popup, or synced from a previous page)
  const stored = await chrome.storage.local.get('activeTest');
  if (stored.activeTest) {
    activeTest = stored.activeTest;
    loadSDK();
    return;
  }

  // Also check the page's localStorage for bookmarklet-started sessions
  try {
    const sessionRaw = localStorage.getItem('uxtest_session');
    const reinitRaw = localStorage.getItem('uxtest_reinit');
    if (!sessionRaw || !reinitRaw) return;

    const session = JSON.parse(sessionRaw);
    const reinit = JSON.parse(reinitRaw);

    // Only resume if session is less than 1 hour old and testIds match
    if (!session || !reinit) return;
    if ((Date.now() - session.timestamp) >= 3600000) return;
    if (reinit.testId !== session.testId) return;

    activeTest = {
      projectId: reinit.projectId,
      id: reinit.testId,
      variant: reinit.variant,
      backendUrl: reinit.endpoint,
      name: reinit.testId
    };

    // Sync to chrome.storage.local so the widget also appears on cross-origin pages
    await chrome.storage.local.set({ activeTest });

    loadSDK();
  } catch (e) {
    // localStorage may be inaccessible on some pages (e.g. chrome:// pages)
  }
}

// Ask the background worker to inject and initialize the SDK (bypasses CSP)
function loadSDK() {
  if (sdkLoaded || !activeTest) return;
  sdkLoaded = true;

  chrome.runtime.sendMessage({ type: 'INJECT_SDK', activeTest }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[UXTest Extension] Could not reach background worker:', chrome.runtime.lastError.message);
      sdkLoaded = false;
      return;
    }
    if (!response?.ok) {
      console.error('[UXTest Extension] SDK injection failed:', response?.error);
      sdkLoaded = false;
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TEST') {
    activeTest = message.test;
    loadSDK();
    sendResponse({ success: true });
  }
  
  if (message.type === 'STOP_TEST') {
    // Clear synced active test from storage
    chrome.storage.local.remove('activeTest');

    if (window.UXTest) {
      window.UXTest.abandon('extension_stopped');
    }
    // Remove widget
    const widget = document.getElementById('uxtest-widget');
    if (widget) widget.remove();
    
    activeTest = null;
    sdkLoaded = false;
    sendResponse({ success: true });
  }
  
  return true;
});

// Initialize on page load
checkActiveTest();

// When the SDK signals test completion, clear the stored active test
window.addEventListener('uxtest:complete', () => {
  chrome.storage.local.remove('activeTest');
  activeTest = null;
  sdkLoaded = false;
});

// Bridge SDK network requests through the background worker (bypasses page CSP)
window.addEventListener('__uxtestProxyRequest', function(e) {
  var detail = e.detail;
  chrome.runtime.sendMessage(
    { type: 'PROXY_REQUEST', url: detail.url, method: detail.method, body: detail.body },
    function(response) {
      window.dispatchEvent(new CustomEvent('__uxtestProxyResponse', {
        detail: Object.assign({ id: detail.id }, response || { error: 'No response from background' })
      }));
    }
  );
});
