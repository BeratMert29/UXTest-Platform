// Default backend URL
const DEFAULT_BACKEND = 'https://uxtest-backend.onrender.com';

let tests = [];
let selectedTest = null;
let activeTest = null;

// Elements
const testListEl = document.getElementById('test-list');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const backendInput = document.getElementById('backend-url');

// Initialize
async function init() {
  // Load saved backend URL
  const stored = await chrome.storage.local.get(['backendUrl', 'activeTest']);
  backendInput.value = stored.backendUrl || DEFAULT_BACKEND;
  
  if (stored.activeTest) {
    activeTest = stored.activeTest;
    updateStatus(true, activeTest.name);
    stopBtn.style.display = 'block';
    startBtn.style.display = 'none';
  }
  
  // Load tests
  await loadTests();
  
  // Save backend URL on change
  backendInput.addEventListener('change', () => {
    chrome.storage.local.set({ backendUrl: backendInput.value });
    loadTests();
  });
}

async function loadTests() {
  const backendUrl = backendInput.value || DEFAULT_BACKEND;
  testListEl.innerHTML = '<div class="loading">Loading tests...</div>';
  
  try {
    const response = await fetch(`${backendUrl}/tests`);
    const data = await response.json();
    tests = (data.tests || data).filter(t => t.isActive);
    renderTests();
  } catch (err) {
    testListEl.innerHTML = '<div class="empty">Could not load tests. Check backend URL.</div>';
  }
}

function renderTests() {
  if (tests.length === 0) {
    testListEl.innerHTML = '<div class="empty">No active tests available</div>';
    return;
  }
  
  testListEl.innerHTML = tests.map(test => `
    <div class="test-item ${selectedTest?.id === test.id ? 'active' : ''}" data-id="${test.id}">
      <div class="test-name">${test.name}</div>
      <div class="test-desc">${test.description || ''}</div>
    </div>
  `).join('');
  
  // Add click handlers
  testListEl.querySelectorAll('.test-item').forEach(el => {
    el.addEventListener('click', () => selectTest(el.dataset.id));
  });
}

function selectTest(testId) {
  selectedTest = tests.find(t => t.id === testId);
  renderTests();
  
  if (selectedTest && !activeTest) {
    startBtn.disabled = false;
    startBtn.textContent = `Start: ${selectedTest.name}`;
  }
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

// Start test
startBtn.addEventListener('click', async () => {
  if (!selectedTest) return;
  
  const backendUrl = backendInput.value || DEFAULT_BACKEND;
  const variant = selectedTest.variants?.includes('B') && Math.random() > 0.5 ? 'B' : 'A';
  
  activeTest = {
    id: selectedTest.id,
    name: selectedTest.name,
    variant,
    backendUrl,
    projectId: 'demo-project'
  };
  
  // Save to storage
  await chrome.storage.local.set({ activeTest });
  
  // Notify content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'START_TEST', test: activeTest });
  
  updateStatus(true, activeTest.name);
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  
  window.close();
});

// Stop test
stopBtn.addEventListener('click', async () => {
  // Notify content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'STOP_TEST' });
  
  activeTest = null;
  await chrome.storage.local.remove('activeTest');
  
  updateStatus(false);
  stopBtn.style.display = 'none';
  startBtn.style.display = 'block';
  startBtn.disabled = true;
  startBtn.textContent = 'Select a test to start';
  selectedTest = null;
  renderTests();
});

init();
