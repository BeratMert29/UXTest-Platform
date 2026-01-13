// UXTest Extension - Content Script
// This runs on every page and manages SDK injection

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

// Load the SDK script
function loadSDK() {
  if (sdkLoaded || !activeTest) return;
  
  const script = document.createElement('script');
  script.src = `${activeTest.backendUrl}/sdk/uxtest.min.js`;
  script.onload = () => {
    sdkLoaded = true;
    initSDK();
  };
  script.onerror = () => {
    console.error('[UXTest Extension] Failed to load SDK');
  };
  document.head.appendChild(script);
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
