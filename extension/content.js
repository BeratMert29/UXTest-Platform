// UXTest Extension - Content Script
// This runs on every page and manages SDK injection
// Uses fetch() to load SDK source to bypass CSP script-src restrictions

let sdkLoaded = false;
let activeTest = null;

// Check for active test on page load
async function checkActiveTest() {
  const stored = await chrome.storage.local.get('activeTest');
  if (stored.activeTest) {
    activeTest = stored.activeTest;
    loadSDK();
  }
}

// Load the SDK - tries script tag first, falls back to fetch+eval for CSP-blocked sites
function loadSDK() {
  if (sdkLoaded || !activeTest) return;

  const sdkUrl = `${activeTest.backendUrl}/sdk/uxtest.min.js`;

  // Try standard script injection first
  const script = document.createElement('script');
  script.src = sdkUrl;
  script.onload = () => {
    sdkLoaded = true;
    initSDK();
  };
  script.onerror = () => {
    console.warn('[UXTest Extension] Script tag blocked by CSP. Attempting fetch fallback...');
    loadSDKViaFetch(sdkUrl);
  };
  (document.head || document.documentElement).appendChild(script);
}

// Fallback: fetch SDK source and inject via chrome.scripting or inline script
async function loadSDKViaFetch(sdkUrl) {
  try {
    const response = await fetch(sdkUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sdkCode = await response.text();

    // Content scripts run in an isolated world, so we use a blob URL
    // which is more likely to bypass strict CSP than inline scripts
    const blob = new Blob([sdkCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const blobScript = document.createElement('script');
    blobScript.src = blobUrl;
    blobScript.onload = () => {
      URL.revokeObjectURL(blobUrl);
      sdkLoaded = true;
      initSDK();
      console.log('[UXTest Extension] SDK loaded via fetch+blob fallback');
    };
    blobScript.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      // Last resort: eval in page context via window.eval
      try {
        const evalScript = document.createElement('script');
        evalScript.textContent = sdkCode;
        (document.head || document.documentElement).appendChild(evalScript);
        sdkLoaded = true;
        initSDK();
        console.log('[UXTest Extension] SDK loaded via inline script fallback');
      } catch(e) {
        console.error('[UXTest Extension] All SDK loading methods blocked by CSP.',
          'The target site has strict CSP that blocks all external scripts.', e.message);
      }
    };
    (document.head || document.documentElement).appendChild(blobScript);
  } catch(e) {
    console.error('[UXTest Extension] Failed to fetch SDK:', e.message);
  }
}

// Initialize the SDK
function initSDK() {
  if (!window.UXTest || !activeTest) return;

  window.UXTest.init({
    projectId: activeTest.projectId,
    testId: activeTest.id,
    variant: activeTest.variant,
    endpoint: activeTest.backendUrl
  });

  console.log('[UXTest Extension] Test started:', activeTest.name);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TEST') {
    activeTest = message.test;
    loadSDK();
    sendResponse({ success: true });
  }
  
  if (message.type === 'STOP_TEST') {
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
