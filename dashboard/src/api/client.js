/**
 * API Client - Optimized for speed
 * Features:
 * - Aggressive caching (30 second TTL)
 * - Instant cache returns
 * - Background refresh
 */

// Backend URL
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'
  : 'https://uxtest-backend.onrender.com';

console.log('[API] Using backend:', API_BASE);
const CACHE_TTL = 5000; // 5 seconds cache
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout

// In-memory cache backed by localStorage for persistence across refreshes
const cache = new Map();
const CACHE_PREFIX = 'uxtest_cache_';

// Hydrate in-memory cache from localStorage on load
function hydrateCache() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
        const entry = JSON.parse(localStorage.getItem(storageKey));
        if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
          const cacheKey = storageKey.slice(CACHE_PREFIX.length);
          cache.set(cacheKey, entry);
        } else {
          // Expired - clean up
          localStorage.removeItem(storageKey);
        }
      }
    }
  } catch(e) {
    // localStorage may be unavailable
  }
}
hydrateCache();

/**
 * Get cached response if valid
 */
function getCached(key) {
  const cached = cache.get(key);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL) {
      return { data: cached.data, fresh: true };
    }
    // Return stale data but mark as needing refresh
    return { data: cached.data, fresh: false };
  }
  return null;
}

/**
 * Set cache entry (in-memory + localStorage)
 */
function setCache(key, data) {
  const entry = {
    data,
    timestamp: Date.now()
  };
  cache.set(key, entry);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch(e) {
    // localStorage full or unavailable - in-memory cache still works
  }
}

/**
 * Make fetch request with timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make API request with caching
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const method = options.method || 'GET';
  const cacheKey = `${method}:${url}`;
  
  // For GET requests, try cache first
  if (method === 'GET' && !options.skipCache) {
    const cached = getCached(cacheKey);
    if (cached?.fresh) {
      return cached.data;
    }
  }
  
  // Make the request
  const data = await fetchWithTimeout(url, options);
  
  // Cache GET responses
  if (method === 'GET') {
    setCache(cacheKey, data);
  }
  
  return data;
}

/**
 * Clear the response cache
 */
export function clearCache() {
  cache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) { localStorage.removeItem(key); });
  } catch(e) {}
}

/**
 * Get tests list
 */
export async function getTests(projectId = 'demo-project', options = {}) {
  return request(`/tests?projectId=${encodeURIComponent(projectId)}`, options);
}

/**
 * Get single test
 */
export async function getTest(testId, options = {}) {
  return request(`/tests/${encodeURIComponent(testId)}`, options);
}

/**
 * Get analytics for a test
 */
export async function getAnalytics(testId, options = {}) {
  return request(`/analytics/${encodeURIComponent(testId)}`, { ...options, skipCache: true });
}

/**
 * Get projects list
 */
export async function getProjects(options = {}) {
  return request('/projects', options);
}

/**
 * Create a new test
 */
export async function createTest(testData, options = {}) {
  clearCache(); // Clear cache after mutation
  return request('/tests', {
    ...options,
    method: 'POST',
    body: JSON.stringify(testData)
  });
}

/**
 * Update a test
 */
export async function updateTest(testId, testData, options = {}) {
  clearCache();
  return request(`/tests/${encodeURIComponent(testId)}`, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(testData)
  });
}

/**
 * Delete a test
 */
export async function deleteTest(testId, options = {}) {
  clearCache();
  return request(`/tests/${encodeURIComponent(testId)}`, {
    ...options,
    method: 'DELETE'
  });
}

/**
 * Create a new project
 */
export async function createProject(projectData, options = {}) {
  clearCache();
  return request('/projects', {
    ...options,
    method: 'POST',
    body: JSON.stringify(projectData)
  });
}

/**
 * Get test config by session code (6-char code derived from test ID)
 */
export async function getTestBySessionCode(code, options = {}) {
  return request(`/session/${encodeURIComponent(code)}`, { ...options, skipCache: true });
}

/**
 * Health check
 */
export async function healthCheck(options = {}) {
  return request('/health', options);
}
