// UXTest Extension - Background Service Worker

// Set default backend URL on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    backendUrl: 'https://uxtest-backend.onrender.com'
  });
  console.log('[UXTest] Extension installed');
});

// Listen for tab updates to re-inject SDK on navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const stored = await chrome.storage.local.get('activeTest');
    if (stored.activeTest) {
      // Re-inject content script on navigation
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
      } catch (err) {
        // Ignore errors for chrome:// pages etc
      }
    }
  }
});
