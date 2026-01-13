/**
 * API Client - Optimized for speed
 * Features:
 * - Aggressive caching (30 second TTL)
 * - Instant cache returns
 * - Background refresh
 */

// Use environment variable or auto-detect based on hostname
const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'https://your-backend.onrender.com' // Change after deployment
);
const CACHE_TTL = 30000; // 30 seconds cache
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout

// Simple in-memory cache
const cache = new Map();

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
 * Set cache entry
 */
function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
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
  return request(`/analytics/${encodeURIComponent(testId)}`, options);
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
 * Health check
 */
export async function healthCheck(options = {}) {
  return request('/health', options);
}
