/**
 * UXTest SDK - Privacy-first UX testing
 * Multi-task widget with session persistence across page navigation
 */
(function(global) {
  'use strict';

  var VERSION = '1.1.0';
  var QUEUE_KEY = 'uxtest_queue';
  var SESSION_KEY = 'uxtest_session';
  var DEFAULT_ENDPOINT = 'http://localhost:3001';

  var config = null;
  var testConfig = null;
  var sessionId = null;
  var startTime = null;
  var queue = [];
  var flushTimer = null;
  var isInitialized = false;
  var widgetElement = null;
  var currentTaskIndex = 0;
  var taskStartTime = null;

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function now() { return Date.now(); }

  // Session persistence - survives page navigation
  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId: sessionId,
        testId: config.testId,
        projectId: config.projectId,
        variant: config.variant,
        endpoint: config.endpoint,
        startTime: startTime,
        currentTaskIndex: currentTaskIndex,
        taskStartTime: taskStartTime,
        timestamp: now()
      }));
    } catch(e) {}
  }

  function loadSession(testId) {
    try {
      var data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      var session = JSON.parse(data);
      // Only restore if same test and session is less than 1 hour old
      if (session.testId === testId && (now() - session.timestamp) < 3600000) {
        return session;
      }
      return null;
    } catch(e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
  }

  // AJAX
  function ajax(url, method, data) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 15000;
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch(e) {
            resolve({});
          }
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = function() { reject(new Error('Network error')); };
      xhr.ontimeout = function() { reject(new Error('Timeout')); };
      xhr.send(data ? JSON.stringify(data) : null);
    });
  }

  // Queue management
  function persistQueue() {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch(e) {}
  }

  function recoverQueue() {
    try {
      var stored = localStorage.getItem(QUEUE_KEY);
      if (stored) queue = JSON.parse(stored).concat(queue);
    } catch(e) {}
  }

  function clearQueue() {
    try { localStorage.removeItem(QUEUE_KEY); } catch(e) {}
  }

  function flush() {
    if (queue.length === 0 || !config) return Promise.resolve();
    var events = queue.slice();
    queue = [];
    
    console.log('[UXTest] Sending', events.length, 'events to', config.endpoint);
    
    return ajax(config.endpoint + '/events', 'POST', { events: events })
      .then(function(result) { 
        clearQueue();
        console.log('[UXTest] ✓ Events sent successfully');
      })
      .catch(function(err) { 
        queue = events.concat(queue); 
        persistQueue();
        console.error('[UXTest] ✗ Failed to send events:', err.message);
      });
  }

  function enqueue(type, payload, duration) {
    var event = {
      sessionId: sessionId,
      projectId: config.projectId,
      testId: config.testId,
      variant: config.variant,
      type: type,
      payload: payload || null,
      timestamp: now(),
      duration: duration
    };
    queue.push(event);
    persistQueue();
    console.log('[UXTest] Event:', type);
    if (queue.length >= 5) flush();
  }

  // Widget UI
  function createWidget() {
    if (widgetElement) {
      document.body.removeChild(widgetElement);
    }

    var widget = document.createElement('div');
    widget.id = 'uxtest-widget';
    
    var style = document.createElement('style');
    style.textContent = getCSS();
    document.head.appendChild(style);
    document.body.appendChild(widget);
    widgetElement = widget;
    
    renderWidget();
  }

  function renderWidget() {
    if (!widgetElement || !testConfig) return;
    
    var tasks = testConfig.tasks || [];
    var currentTask = tasks[currentTaskIndex];
    var progress = tasks.length > 0 ? ((currentTaskIndex) / tasks.length * 100) : 0;
    
    widgetElement.innerHTML = '' +
      '<div class="ux-header">' +
        '<div class="ux-title">📋 UX Test</div>' +
        '<div class="ux-progress-bar"><div class="ux-progress-fill" style="width:' + progress + '%"></div></div>' +
        '<div class="ux-progress-text">Task ' + (currentTaskIndex + 1) + ' of ' + tasks.length + '</div>' +
      '</div>' +
      '<div class="ux-body">' +
        '<div class="ux-task-title">' + (currentTask ? currentTask.title : 'Complete the task') + '</div>' +
        '<div class="ux-task-desc">' + (currentTask ? currentTask.description || '' : '') + '</div>' +
        '<div class="ux-timer" id="ux-timer">0:00</div>' +
        '<div class="ux-nav-hint">💡 Widget stays active when you navigate!</div>' +
      '</div>' +
      '<div class="ux-footer">' +
        '<button class="ux-btn ux-btn-done" onclick="UXTest.success()">✓ Done</button>' +
        '<button class="ux-btn ux-btn-skip" onclick="UXTest.nextTask()">Skip →</button>' +
        '<button class="ux-btn ux-btn-abandon" onclick="UXTest.abandon(\'user_quit\')">✗ Quit</button>' +
      '</div>';
  }

  function showComplete(abandoned) {
    if (!widgetElement) return;
    clearSession();
    widgetElement.innerHTML = '' +
      '<div class="ux-complete">' +
        '<div class="ux-complete-icon">' + (abandoned ? '👋' : '🎉') + '</div>' +
        '<h3>' + (abandoned ? 'Test Ended' : 'All Done!') + '</h3>' +
        '<p>' + (abandoned ? 'Thanks for participating' : 'Thank you for testing!') + '</p>' +
        '<button class="ux-btn ux-btn-done" onclick="document.getElementById(\'uxtest-widget\').remove()" style="margin-top:15px">Close</button>' +
      '</div>';
  }

  function updateTimer() {
    var el = document.getElementById('ux-timer');
    if (!el || !taskStartTime) return;
    var elapsed = Math.floor((now() - taskStartTime) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    el.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function getCSS() {
    return '#uxtest-widget{' +
      'position:fixed;bottom:20px;right:20px;width:320px;' +
      'background:linear-gradient(145deg,#1a1a2e,#16213e);' +
      'border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.4);' +
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;z-index:2147483647;' +
      'border:1px solid rgba(255,255,255,0.1);overflow:hidden}' +
      '.ux-header{padding:16px;border-bottom:1px solid rgba(255,255,255,0.1)}' +
      '.ux-title{font-weight:700;font-size:14px;margin-bottom:10px}' +
      '.ux-progress-bar{height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden}' +
      '.ux-progress-fill{height:100%;background:linear-gradient(90deg,#10b981,#34d399);transition:width 0.3s}' +
      '.ux-progress-text{font-size:11px;color:#94a3b8;margin-top:6px}' +
      '.ux-body{padding:16px}' +
      '.ux-task-title{font-weight:600;font-size:15px;margin-bottom:6px}' +
      '.ux-task-desc{font-size:13px;color:#94a3b8;line-height:1.4;margin-bottom:12px}' +
      '.ux-timer{font-size:24px;font-weight:700;color:#60a5fa;font-family:monospace}' +
      '.ux-nav-hint{font-size:11px;color:#f59e0b;margin-top:10px;padding:8px;background:rgba(245,158,11,0.1);border-radius:6px}' +
      '.ux-footer{padding:12px 16px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.1)}' +
      '.ux-btn{flex:1;padding:10px;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s}' +
      '.ux-btn-done{background:#10b981;color:#fff}' +
      '.ux-btn-done:hover{background:#059669}' +
      '.ux-btn-skip{background:rgba(96,165,250,0.2);color:#60a5fa}' +
      '.ux-btn-skip:hover{background:rgba(96,165,250,0.3)}' +
      '.ux-btn-abandon{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.3)}' +
      '.ux-btn-abandon:hover{background:rgba(239,68,68,0.1)}' +
      '.ux-complete{text-align:center;padding:30px 20px}' +
      '.ux-complete-icon{font-size:40px;margin-bottom:10px}' +
      '.ux-complete h3{margin:0 0 6px;color:#10b981}' +
      '.ux-complete p{margin:0;color:#94a3b8;font-size:13px}';
  }

  function fetchTestConfig() {
    return ajax(config.endpoint + '/tests/' + config.testId, 'GET', null)
      .then(function(data) {
        testConfig = data;
        if (!testConfig.tasks || testConfig.tasks.length === 0) {
          testConfig.tasks = [{ title: testConfig.name, description: testConfig.instructions || testConfig.description }];
        }
        return data;
      })
      .catch(function(err) {
        console.error('[UXTest] Could not fetch test:', err);
        testConfig = { tasks: [{ title: 'Complete the task', description: 'Follow the instructions' }] };
      });
  }

  // Public API
  var UXTest = {
    init: function(options) {
      if (!options || !options.projectId || !options.testId) {
        throw new Error('projectId and testId required');
      }

      // Check for existing session
      var existingSession = loadSession(options.testId);
      
      if (existingSession && !isInitialized) {
        // Resume existing session
        console.log('[UXTest] Resuming session from previous page...');
        config = {
          projectId: existingSession.projectId,
          testId: existingSession.testId,
          variant: existingSession.variant,
          endpoint: existingSession.endpoint
        };
        sessionId = existingSession.sessionId;
        startTime = existingSession.startTime;
        currentTaskIndex = existingSession.currentTaskIndex;
        taskStartTime = existingSession.taskStartTime;
        isInitialized = true;
        
        recoverQueue();
        enqueue('page_navigated', { url: location.href });
        
        flushTimer = setInterval(flush, 10000);
        window.addEventListener('beforeunload', function() { flush(); saveSession(); });
        
        return fetchTestConfig().then(function() {
          createWidget();
          setInterval(updateTimer, 1000);
          console.log('[UXTest] Session resumed - Task', currentTaskIndex + 1);
        });
      }
      
      if (isInitialized) {
        // Already initialized on this page, just recreate widget
        createWidget();
        return Promise.resolve();
      }

      // New session
      config = {
        projectId: options.projectId,
        testId: options.testId,
        variant: options.variant || 'A',
        endpoint: (options.endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '')
      };

      sessionId = generateUUID();
      startTime = now();
      taskStartTime = now();
      currentTaskIndex = 0;
      isInitialized = true;

      recoverQueue();
      enqueue('test_started', { url: location.href, userAgent: navigator.userAgent });
      saveSession();

      flushTimer = setInterval(flush, 10000);
      window.addEventListener('beforeunload', function() { flush(); saveSession(); });

      return fetchTestConfig().then(function() {
        createWidget();
        setInterval(updateTimer, 1000);
        console.log('[UXTest] Started -', testConfig.tasks.length, 'tasks');
      });
    },

    nextTask: function() {
      if (!isInitialized || !testConfig) return;
      
      var tasks = testConfig.tasks || [];
      enqueue('task_skipped', { taskIndex: currentTaskIndex });
      
      currentTaskIndex++;
      taskStartTime = now();
      saveSession();
      
      if (currentTaskIndex >= tasks.length) {
        // All tasks done
        var duration = now() - startTime;
        enqueue('test_completed', { completedTasks: currentTaskIndex }, duration);
        flush();
        clearInterval(flushTimer);
        showComplete(false);
      } else {
        renderWidget();
      }
    },

    logEvent: function(type, payload) {
      if (!isInitialized) return;
      enqueue(type, payload);
    },

    success: function(metadata) {
      if (!isInitialized || !testConfig) return;
      
      var tasks = testConfig.tasks || [];
      enqueue('task_completed', { taskIndex: currentTaskIndex, ...metadata });
      
      currentTaskIndex++;
      taskStartTime = now();
      saveSession();
      
      if (currentTaskIndex >= tasks.length) {
        // All tasks done
        var duration = now() - startTime;
        enqueue('test_completed', { completedTasks: currentTaskIndex }, duration);
        flush();
        clearInterval(flushTimer);
        showComplete(false);
      } else {
        renderWidget();
        console.log('[UXTest] Task done! Next:', currentTaskIndex + 1);
      }
    },

    abandon: function(reason) {
      if (!isInitialized) return;
      var duration = now() - startTime;
      enqueue('test_abandoned', { reason: reason, lastTaskIndex: currentTaskIndex }, duration);
      flush();
      clearInterval(flushTimer);
      clearSession();
      showComplete(true);
    },

    version: VERSION,
    getSessionId: function() { return sessionId; },
    getQueueLength: function() { return queue.length; }
  };

  global.UXTest = UXTest;
})(typeof window !== 'undefined' ? window : this);
