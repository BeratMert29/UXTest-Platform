// Default backend URL
const DEFAULT_BACKEND = 'http://localhost:3001';

let activeTest = null;

// Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const backendInput = document.getElementById('backend-url');
const sessionCodeInput = document.getElementById('session-code');

// Initialize
async function init() {
  // Load saved backend URL and active test
  const stored = await chrome.storage.local.get(['backendUrl', 'activeTest']);
  backendInput.value = stored.backendUrl || DEFAULT_BACKEND;

  if (stored.activeTest) {
    activeTest = stored.activeTest;
    updateStatus(true, activeTest.name);
    stopBtn.style.display = 'block';
    startBtn.style.display = 'none';
  }

  // Save backend URL on change
  backendInput.addEventListener('change', () => {
    chrome.storage.local.set({ backendUrl: backendInput.value });
  });

  // Enable Start button only when a code is typed
  sessionCodeInput.addEventListener('input', () => {
    startBtn.disabled = !sessionCodeInput.value.trim();
    if (startBtn.textContent !== 'Start Test') {
      startBtn.textContent = 'Start Test';
    }
  });
}

function updateStatus(active, testName) {
  if (active) {
    statusBar.classList.remove('inactive');
    statusText.textContent = `Testing: ${testName}`;
  } else {
    statusBar.classList.add('inactive');
    statusText.textContent = 'No active test';
  }
}

// Start test via session code
startBtn.addEventListener('click', async () => {
  const code = sessionCodeInput.value.trim().toUpperCase();
  if (!code) return;

  const backendUrl = backendInput.value || DEFAULT_BACKEND;

  startBtn.disabled = true;
  startBtn.textContent = 'Loading...';

  try {
    const res = await fetch(`${backendUrl}/session/${encodeURIComponent(code)}`);

    if (!res.ok) {
      startBtn.textContent = res.status === 404 ? 'Code not found. Try again.' : `Error ${res.status}. Try again.`;
      startBtn.disabled = false;
      return;
    }

    const testConfig = await res.json();
    const variant = testConfig.variants?.includes('B') && Math.random() > 0.5 ? 'B' : 'A';

    activeTest = {
      id: testConfig.id,
      name: testConfig.name,
      variant,
      backendUrl,
      projectId: testConfig.projectId || 'demo-project',
      tasks: testConfig.tasks || []
    };

    // Save to storage — content.js reads this on page load and auto-injects the SDK
    await chrome.storage.local.set({ activeTest });

    if (testConfig.targetUrl) {
      // Open the target URL in a new tab; content.js will auto-inject the SDK on load
      chrome.tabs.create({ url: testConfig.targetUrl });
    } else {
      // No targetUrl — inject into the currently active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'START_TEST', test: activeTest });
    }

    updateStatus(true, activeTest.name);
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';

    window.close();
  } catch (err) {
    startBtn.textContent = 'Error. Check backend URL.';
    startBtn.disabled = false;
  }
});

// Stop test
stopBtn.addEventListener('click', async () => {
  // Notify content script in the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'STOP_TEST' }).catch(() => {});

  activeTest = null;
  await chrome.storage.local.remove('activeTest');

  updateStatus(false);
  stopBtn.style.display = 'none';
  startBtn.style.display = 'block';
  startBtn.disabled = true;
  startBtn.textContent = 'Start Test';
  sessionCodeInput.value = '';
});

init();
