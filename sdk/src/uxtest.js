/**
 * UXTest SDK - Privacy-first UX testing for developers
 * Embeddable JavaScript SDK for task-based usability experiments
 * 
 * Features:
 * - Floating task widget for users
 * - AJAX with fetch() + XMLHttpRequest fallback
 * - Exponential backoff retry logic
 * - Offline queue with localStorage persistence
 */
(function(global) {
  'use strict';

  var VERSION = '1.0.0';
  var STORAGE_KEY = 'uxtest_offline_queue';
  var DEFAULT_BATCH_SIZE = 5;
  var DEFAULT_FLUSH_INTERVAL = 10000;
  var DEFAULT_ENDPOINT = 'http://localhost:3001';
  var MAX_RETRIES = 3;
  var RETRY_DELAY_BASE = 1000;

  // Internal state
  var config = null;
  var testConfig = null;
  var sessionId = null;
  var startTime = null;
  var queue = [];
  var flushTimer = null;
  var isInitialized = false;
  var isFlushing = false;
  var retryCount = 0;
  var widgetElement = null;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function now() {
    return Date.now();
  }

  function hasFetch() {
    return typeof fetch === 'function';
  }

  function hasBeacon() {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
  }

  // ============================================
  // AJAX FUNCTIONS
  // ============================================

  function xhrRequest(url, method, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          var response = null;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            response = xhr.responseText;
          }
          callback(null, response);
        } else {
          callback(new Error('HTTP ' + xhr.status), null);
        }
      }
    };
    
    xhr.onerror = function() { callback(new Error('Network error'), null); };
    xhr.ontimeout = function() { callback(new Error('Request timeout'), null); };
    xhr.timeout = 30000;
    
    if (data) {
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
    
    return xhr;
  }

  function ajax(url, method, data) {
    return new Promise(function(resolve, reject) {
      if (hasFetch()) {
        var options = {
          method: method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        
        fetch(url, options)
          .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then(resolve)
          .catch(reject);
      } else {
        xhrRequest(url, method, data, function(err, response) {
          if (err) reject(err);
          else resolve(response);
        });
      }
    });
  }

  function getRetryDelay(attempt) {
    var delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
    var jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.min(delay + jitter, 30000);
  }

  // ============================================
  // PAYLOAD & QUEUE FUNCTIONS
  // ============================================

  function sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') return null;
    
    var sanitized = {};
    var forbiddenKeys = ['email', 'password', 'phone', 'ssn', 'credit', 'card', 'address', 'name', 'ip'];
    
    for (var key in payload) {
      if (payload.hasOwnProperty(key)) {
        var value = payload[key];
        var lowerKey = key.toLowerCase();
        var isForbidden = false;
        
        for (var i = 0; i < forbiddenKeys.length; i++) {
          if (lowerKey.indexOf(forbiddenKeys[i]) !== -1) {
            isForbidden = true;
            break;
          }
        }
        
        if (!isForbidden && typeof value !== 'function') {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
          }
        }
      }
    }
    
    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  function persistQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      }
    } catch (e) {}
  }

  function recoverQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          var recovered = JSON.parse(stored);
          if (Array.isArray(recovered) && recovered.length > 0) {
            queue = recovered.concat(queue);
          }
        }
      }
    } catch (e) {}
  }

  function clearPersistedQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  }

  function sendBeacon(events) {
    if (!hasBeacon() || events.length === 0) return false;
    try {
      var data = JSON.stringify({ events: events });
      var blob = new Blob([data], { type: 'application/json' });
      return navigator.sendBeacon(config.endpoint + '/events', blob);
    } catch (e) {
      return false;
    }
  }

  function flush(useBeacon) {
    if (queue.length === 0 || isFlushing) return Promise.resolve();

    if (useBeacon && hasBeacon()) {
      var sent = sendBeacon(queue);
      if (sent) {
        queue = [];
        clearPersistedQueue();
        return Promise.resolve();
      }
    }

    isFlushing = true;
    var eventsToSend = queue.slice();
    queue = [];

    return ajax(config.endpoint + '/events', 'POST', { events: eventsToSend })
      .then(function(response) {
        isFlushing = false;
        retryCount = 0;
        clearPersistedQueue();
        return response;
      })
      .catch(function(error) {
        isFlushing = false;
        queue = eventsToSend.concat(queue);
        persistQueue();
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          var delay = getRetryDelay(retryCount);
          setTimeout(function() { flush(); }, delay);
        } else {
          retryCount = 0;
        }
        throw error;
      });
  }

  function scheduleFlush() {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(function() { flush(); }, config.flushInterval);
  }

  function enqueue(event) {
    queue.push(event);
    persistQueue();
    if (queue.length >= config.batchSize) flush();
  }

  function createEvent(type, payload, duration) {
    var event = {
      sessionId: sessionId,
      projectId: config.projectId,
      testId: config.testId,
      variant: config.variant,
      type: type,
      payload: sanitizePayload(payload),
      timestamp: now()
    };
    if (typeof duration === 'number') event.duration = duration;
    return event;
  }

  // ============================================
  // WIDGET UI
  // ============================================

  function createWidget() {
    if (widgetElement) return;

    var widget = document.createElement('div');
    widget.id = 'uxtest-widget';
    widget.innerHTML = getWidgetHTML();
    
    // Add styles
    var style = document.createElement('style');
    style.textContent = getWidgetCSS();
    document.head.appendChild(style);
    
    document.body.appendChild(widget);
    widgetElement = widget;
    
    // Bind events
    var doneBtn = widget.querySelector('#uxtest-done-btn');
    var abandonBtn = widget.querySelector('#uxtest-abandon-btn');
    var minimizeBtn = widget.querySelector('#uxtest-minimize-btn');
    var expandBtn = widget.querySelector('#uxtest-expand-btn');
    
    doneBtn.onclick = function() { UXTest.success(); };
    abandonBtn.onclick = function() { UXTest.abandon('user_clicked_abandon'); };
    minimizeBtn.onclick = function() { toggleMinimize(true); };
    expandBtn.onclick = function() { toggleMinimize(false); };
  }

  function toggleMinimize(minimize) {
    var content = widgetElement.querySelector('.uxtest-content');
    var expandBtn = widgetElement.querySelector('#uxtest-expand-btn');
    
    if (minimize) {
      content.style.display = 'none';
      expandBtn.style.display = 'flex';
    } else {
      content.style.display = 'block';
      expandBtn.style.display = 'none';
    }
  }

  function getWidgetHTML() {
    var taskName = testConfig ? testConfig.name : 'UX Test';
    var taskDesc = testConfig ? testConfig.description : 'Complete the task and click Done when finished.';
    var variantLabel = config.variant ? ' (Variant ' + config.variant + ')' : '';
    
    return '' +
      '<div class="uxtest-header">' +
        '<div class="uxtest-logo">◈ UXTest</div>' +
        '<button id="uxtest-minimize-btn" class="uxtest-icon-btn" title="Minimize">−</button>' +
      '</div>' +
      '<div class="uxtest-content">' +
        '<div class="uxtest-task-label">YOUR TASK' + variantLabel + '</div>' +
        '<h3 class="uxtest-task-title">' + escapeHtml(taskName) + '</h3>' +
        '<p class="uxtest-task-desc">' + escapeHtml(taskDesc) + '</p>' +
        '<div class="uxtest-timer" id="uxtest-timer">00:00</div>' +
        '<div class="uxtest-buttons">' +
          '<button id="uxtest-done-btn" class="uxtest-btn uxtest-btn-success">✓ Done</button>' +
          '<button id="uxtest-abandon-btn" class="uxtest-btn uxtest-btn-danger">✗ Can\'t Complete</button>' +
        '</div>' +
      '</div>' +
      '<button id="uxtest-expand-btn" class="uxtest-expand-btn" style="display:none;" title="Expand">' +
        '◈ Task in Progress...' +
      '</button>';
  }

  function getWidgetCSS() {
    return '' +
      '#uxtest-widget {' +
        'position: fixed;' +
        'bottom: 20px;' +
        'right: 20px;' +
        'width: 320px;' +
        'background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);' +
        'border-radius: 16px;' +
        'box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);' +
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
        'color: #fff;' +
        'z-index: 2147483647;' +
        'overflow: hidden;' +
        'animation: uxtest-slide-in 0.3s ease;' +
      '}' +
      '@keyframes uxtest-slide-in {' +
        'from { transform: translateY(100px); opacity: 0; }' +
        'to { transform: translateY(0); opacity: 1; }' +
      '}' +
      '.uxtest-header {' +
        'display: flex;' +
        'justify-content: space-between;' +
        'align-items: center;' +
        'padding: 12px 16px;' +
        'background: rgba(255,255,255,0.05);' +
        'border-bottom: 1px solid rgba(255,255,255,0.1);' +
      '}' +
      '.uxtest-logo {' +
        'font-weight: 600;' +
        'font-size: 14px;' +
        'color: #60a5fa;' +
      '}' +
      '.uxtest-icon-btn {' +
        'background: none;' +
        'border: none;' +
        'color: #94a3b8;' +
        'font-size: 18px;' +
        'cursor: pointer;' +
        'padding: 4px 8px;' +
        'border-radius: 4px;' +
        'transition: all 0.2s;' +
      '}' +
      '.uxtest-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }' +
      '.uxtest-content { padding: 20px; }' +
      '.uxtest-task-label {' +
        'font-size: 10px;' +
        'font-weight: 600;' +
        'letter-spacing: 0.1em;' +
        'color: #f59e0b;' +
        'margin-bottom: 8px;' +
      '}' +
      '.uxtest-task-title {' +
        'font-size: 18px;' +
        'font-weight: 600;' +
        'margin: 0 0 8px 0;' +
        'color: #f1f5f9;' +
      '}' +
      '.uxtest-task-desc {' +
        'font-size: 14px;' +
        'color: #94a3b8;' +
        'margin: 0 0 16px 0;' +
        'line-height: 1.5;' +
      '}' +
      '.uxtest-timer {' +
        'text-align: center;' +
        'font-size: 28px;' +
        'font-weight: 700;' +
        'font-family: "SF Mono", Monaco, monospace;' +
        'color: #60a5fa;' +
        'margin-bottom: 20px;' +
        'padding: 12px;' +
        'background: rgba(96, 165, 250, 0.1);' +
        'border-radius: 8px;' +
      '}' +
      '.uxtest-buttons { display: flex; gap: 10px; }' +
      '.uxtest-btn {' +
        'flex: 1;' +
        'padding: 12px 16px;' +
        'border: none;' +
        'border-radius: 8px;' +
        'font-size: 14px;' +
        'font-weight: 600;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
      '}' +
      '.uxtest-btn-success {' +
        'background: linear-gradient(135deg, #10b981 0%, #059669 100%);' +
        'color: white;' +
      '}' +
      '.uxtest-btn-success:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }' +
      '.uxtest-btn-danger {' +
        'background: rgba(239, 68, 68, 0.2);' +
        'color: #f87171;' +
        'border: 1px solid rgba(239, 68, 68, 0.3);' +
      '}' +
      '.uxtest-btn-danger:hover { background: rgba(239, 68, 68, 0.3); }' +
      '.uxtest-expand-btn {' +
        'width: 100%;' +
        'padding: 16px;' +
        'background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);' +
        'border: none;' +
        'color: #60a5fa;' +
        'font-size: 14px;' +
        'font-weight: 500;' +
        'cursor: pointer;' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'gap: 8px;' +
      '}' +
      '.uxtest-expand-btn:hover { background: #1e293b; }' +
      '.uxtest-complete {' +
        'text-align: center;' +
        'padding: 30px 20px;' +
      '}' +
      '.uxtest-complete-icon { font-size: 48px; margin-bottom: 12px; }' +
      '.uxtest-complete h3 { margin: 0 0 8px 0; color: #10b981; }' +
      '.uxtest-complete p { margin: 0; color: #94a3b8; font-size: 14px; }';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateTimer() {
    if (!widgetElement) return;
    
    var timerEl = widgetElement.querySelector('#uxtest-timer');
    if (!timerEl) return;
    
    var elapsed = Math.floor((now() - startTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    
    timerEl.textContent = 
      (minutes < 10 ? '0' : '') + minutes + ':' + 
      (seconds < 10 ? '0' : '') + seconds;
  }

  function showComplete(abandoned) {
    if (!widgetElement) return;
    
    var content = widgetElement.querySelector('.uxtest-content');
    var elapsed = Math.floor((now() - startTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    var timeStr = minutes + 'm ' + seconds + 's';
    
    if (abandoned) {
      content.innerHTML = 
        '<div class="uxtest-complete">' +
          '<div class="uxtest-complete-icon">🚫</div>' +
          '<h3 style="color: #f87171;">Task Abandoned</h3>' +
          '<p>Thanks for your feedback!</p>' +
        '</div>';
    } else {
      content.innerHTML = 
        '<div class="uxtest-complete">' +
          '<div class="uxtest-complete-icon">✅</div>' +
          '<h3>Task Complete!</h3>' +
          '<p>Completed in ' + timeStr + '</p>' +
        '</div>';
    }
    
    // Remove widget after 3 seconds
    setTimeout(function() {
      if (widgetElement && widgetElement.parentNode) {
        widgetElement.parentNode.removeChild(widgetElement);
        widgetElement = null;
      }
    }, 3000);
  }

  function fetchTestConfig() {
    return ajax(config.endpoint + '/tests/' + config.testId, 'GET', null)
      .then(function(data) {
        testConfig = data;
        return data;
      })
      .catch(function(err) {
        console.warn('[UXTest] Could not fetch test config:', err.message);
        return null;
      });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  var UXTest = {
    /**
     * Initialize the SDK
     */
    init: function(options) {
      if (isInitialized) {
        console.warn('[UXTest] Already initialized');
        return Promise.resolve();
      }

      if (!options || !options.projectId || !options.testId) {
        throw new Error('[UXTest] projectId and testId are required');
      }

      config = {
        projectId: options.projectId,
        testId: options.testId,
        variant: options.variant || 'A',
        endpoint: (options.endpoint || DEFAULT_ENDPOINT).replace(/\/$/, ''),
        batchSize: options.batchSize || DEFAULT_BATCH_SIZE,
        flushInterval: options.flushInterval || DEFAULT_FLUSH_INTERVAL,
        showWidget: options.showWidget !== false // default true
      };

      sessionId = generateUUID();
      startTime = now();
      isInitialized = true;

      recoverQueue();

      enqueue(createEvent('task_started', {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        screenWidth: screen.width,
        screenHeight: screen.height,
        language: navigator.language
      }));

      scheduleFlush();

      // Event listeners
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', function() { flush(true); });
        window.addEventListener('pagehide', function() { flush(true); });
        window.addEventListener('visibilitychange', function() {
          if (document.visibilityState === 'hidden') flush(true);
        });
        window.addEventListener('online', function() {
          retryCount = 0;
          flush();
        });
      }

      // Fetch test config and show widget
      if (config.showWidget) {
        return fetchTestConfig().then(function() {
          createWidget();
          // Start timer update
          setInterval(updateTimer, 1000);
          console.log('[UXTest] Initialized with widget', { testId: config.testId, sessionId: sessionId });
        });
      } else {
        console.log('[UXTest] Initialized (headless)', { testId: config.testId, sessionId: sessionId });
        return Promise.resolve();
      }
    },

    /**
     * Log a custom event
     */
    logEvent: function(type, payload) {
      if (!isInitialized) {
        console.warn('[UXTest] Not initialized');
        return;
      }
      if (!type || typeof type !== 'string') return;
      enqueue(createEvent(type, payload));
    },

    /**
     * Mark task as successfully completed
     */
    success: function(metadata) {
      if (!isInitialized) return;

      var duration = now() - startTime;
      enqueue(createEvent('task_completed', metadata, duration));
      flush();
      
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }

      showComplete(false);
      console.log('[UXTest] Task completed in', duration, 'ms');
    },

    /**
     * Mark task as abandoned
     */
    abandon: function(reason) {
      if (!isInitialized) return;

      var duration = now() - startTime;
      enqueue(createEvent('task_abandoned', { reason: reason }, duration));
      flush();
      
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }

      showComplete(true);
      console.log('[UXTest] Task abandoned after', duration, 'ms');
    },

    version: VERSION,
    getSessionId: function() { return sessionId; },
    getTransport: function() { return hasFetch() ? 'fetch' : 'XMLHttpRequest'; },
    getQueueLength: function() { return queue.length; },
    flush: function() { return flush(); }
  };

  global.UXTest = UXTest;

})(typeof window !== 'undefined' ? window : this);

