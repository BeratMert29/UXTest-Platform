/**
 * UXTest SDK - Privacy-first UX testing
 * Multi-task widget with progress tracking
 */
(function(global) {
  'use strict';

  var VERSION = '1.0.0';
  var STORAGE_KEY = 'uxtest_offline_queue';
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

  // Utility functions
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function now() { return Date.now(); }

  // AJAX
  function ajax(url, method, data) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = function() { reject(new Error('Network error')); };
      xhr.send(data ? JSON.stringify(data) : null);
    });
  }

  // Queue management
  function persistQueue() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch(e) {}
  }

  function recoverQueue() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) queue = JSON.parse(stored).concat(queue);
    } catch(e) {}
  }

  function clearQueue() {
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  }

  function flush() {
    if (queue.length === 0) return Promise.resolve();
    var events = queue.slice();
    queue = [];
    
    return ajax(config.endpoint + '/events', 'POST', { events: events })
      .then(function() { 
        clearQueue();
        console.log('[UXTest] Events sent successfully:', events.length);
      })
      .catch(function(err) { 
        queue = events.concat(queue); 
        persistQueue();
        console.warn('[UXTest] Failed to send events:', err.message);
        console.warn('[UXTest] Events queued for retry. If testing on HTTPS site, you need HTTPS backend or use ngrok.');
      });
  }

  function enqueue(type, payload, duration) {
    queue.push({
      sessionId: sessionId,
      projectId: config.projectId,
      testId: config.testId,
      variant: config.variant,
      type: type,
      payload: payload || null,
      timestamp: now(),
      duration: duration
    });
    persistQueue();
    if (queue.length >= 5) flush();
  }

  // Widget
  function createWidget() {
    if (widgetElement) return;

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
        '<span class="ux-logo">◈ UXTest</span>' +
        '<span class="ux-progress">' + (currentTaskIndex + 1) + '/' + tasks.length + '</span>' +
      '</div>' +
      '<div class="ux-progress-bar"><div class="ux-progress-fill" style="width:' + progress + '%"></div></div>' +
      '<div class="ux-content">' +
        '<div class="ux-task-num">Task ' + (currentTaskIndex + 1) + '</div>' +
        '<h3 class="ux-task-title">' + escapeHtml(currentTask ? currentTask.title : 'Complete the test') + '</h3>' +
        '<p class="ux-task-desc">' + escapeHtml(currentTask ? currentTask.description || '' : '') + '</p>' +
        '<div class="ux-timer" id="ux-timer">00:00</div>' +
        '<div class="ux-buttons">' +
          '<button id="ux-done" class="ux-btn ux-btn-done">✓ ' + (currentTaskIndex < tasks.length - 1 ? 'Next Task' : 'Finish') + '</button>' +
          '<button id="ux-skip" class="ux-btn ux-btn-skip">Skip</button>' +
        '</div>' +
        '<button id="ux-abandon" class="ux-btn-abandon">Can\'t complete test</button>' +
      '</div>';
    
    // Bind events
    widgetElement.querySelector('#ux-done').onclick = completeTask;
    widgetElement.querySelector('#ux-skip').onclick = skipTask;
    widgetElement.querySelector('#ux-abandon').onclick = function() { UXTest.abandon('user_abandoned'); };
  }

  function completeTask() {
    var tasks = testConfig.tasks || [];
    var taskDuration = now() - taskStartTime;
    
    enqueue('task_step_completed', {
      taskIndex: currentTaskIndex,
      taskTitle: tasks[currentTaskIndex]?.title
    }, taskDuration);
    
    if (currentTaskIndex < tasks.length - 1) {
      currentTaskIndex++;
      taskStartTime = now();
      renderWidget();
    } else {
      UXTest.success();
    }
  }

  function skipTask() {
    var tasks = testConfig.tasks || [];
    
    enqueue('task_step_skipped', {
      taskIndex: currentTaskIndex,
      taskTitle: tasks[currentTaskIndex]?.title
    });
    
    if (currentTaskIndex < tasks.length - 1) {
      currentTaskIndex++;
      taskStartTime = now();
      renderWidget();
    } else {
      UXTest.abandon('all_tasks_skipped');
    }
  }

  function showComplete(abandoned) {
    if (!widgetElement) return;
    var totalTime = Math.floor((now() - startTime) / 1000);
    var min = Math.floor(totalTime / 60);
    var sec = totalTime % 60;
    
    widgetElement.innerHTML = '' +
      '<div class="ux-complete">' +
        '<div class="ux-complete-icon">' + (abandoned ? '🚫' : '✅') + '</div>' +
        '<h3>' + (abandoned ? 'Test Ended' : 'All Tasks Complete!') + '</h3>' +
        '<p>' + (abandoned ? 'Thanks for participating' : 'Completed in ' + min + 'm ' + sec + 's') + '</p>' +
      '</div>';
    
    setTimeout(function() {
      if (widgetElement && widgetElement.parentNode) {
        widgetElement.parentNode.removeChild(widgetElement);
        widgetElement = null;
      }
    }, 3000);
  }

  function updateTimer() {
    if (!widgetElement) return;
    var timer = widgetElement.querySelector('#ux-timer');
    if (!timer) return;
    
    var elapsed = Math.floor((now() - taskStartTime) / 1000);
    var min = Math.floor(elapsed / 60);
    var sec = elapsed % 60;
    timer.textContent = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function getCSS() {
    return '#uxtest-widget{position:fixed;bottom:20px;right:20px;width:300px;background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.4);font-family:-apple-system,sans-serif;color:#fff;z-index:2147483647;overflow:hidden}' +
      '.ux-header{display:flex;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.1)}' +
      '.ux-logo{font-weight:600;font-size:13px;color:#60a5fa}' +
      '.ux-progress{font-size:12px;color:#94a3b8}' +
      '.ux-progress-bar{height:3px;background:rgba(255,255,255,0.1)}' +
      '.ux-progress-fill{height:100%;background:linear-gradient(90deg,#10b981,#60a5fa);transition:width 0.3s}' +
      '.ux-content{padding:16px}' +
      '.ux-task-num{font-size:10px;font-weight:600;letter-spacing:0.1em;color:#f59e0b;margin-bottom:4px}' +
      '.ux-task-title{font-size:16px;font-weight:600;margin:0 0 6px;color:#f1f5f9}' +
      '.ux-task-desc{font-size:13px;color:#94a3b8;margin:0 0 12px;line-height:1.4}' +
      '.ux-timer{text-align:center;font-size:24px;font-weight:700;font-family:monospace;color:#60a5fa;margin-bottom:14px;padding:10px;background:rgba(96,165,250,0.1);border-radius:6px}' +
      '.ux-buttons{display:flex;gap:8px;margin-bottom:10px}' +
      '.ux-btn{flex:1;padding:10px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}' +
      '.ux-btn-done{background:linear-gradient(135deg,#10b981,#059669);color:#fff}' +
      '.ux-btn-done:hover{transform:translateY(-1px)}' +
      '.ux-btn-skip{background:rgba(255,255,255,0.1);color:#94a3b8}' +
      '.ux-btn-skip:hover{background:rgba(255,255,255,0.15)}' +
      '.ux-btn-abandon{width:100%;padding:8px;background:none;border:1px solid rgba(239,68,68,0.3);border-radius:6px;color:#f87171;font-size:12px;cursor:pointer}' +
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
        console.warn('[UXTest] Could not fetch test:', err);
        testConfig = { tasks: [{ title: 'Complete the task', description: '' }] };
      });
  }

  // Public API
  var UXTest = {
    init: function(options) {
      if (isInitialized) return Promise.resolve();
      if (!options || !options.projectId || !options.testId) {
        throw new Error('projectId and testId required');
      }

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

      flushTimer = setInterval(flush, 10000);
      window.addEventListener('beforeunload', function() { flush(); });

      return fetchTestConfig().then(function() {
        createWidget();
        setInterval(updateTimer, 1000);
        console.log('[UXTest] Ready -', testConfig.tasks.length, 'tasks');
      });
    },

    logEvent: function(type, payload) {
      if (!isInitialized) return;
      enqueue(type, payload);
    },

    success: function(metadata) {
      if (!isInitialized) return;
      var duration = now() - startTime;
      enqueue('test_completed', metadata, duration);
      flush();
      clearInterval(flushTimer);
      showComplete(false);
    },

    abandon: function(reason) {
      if (!isInitialized) return;
      var duration = now() - startTime;
      enqueue('test_abandoned', { reason: reason, lastTaskIndex: currentTaskIndex }, duration);
      flush();
      clearInterval(flushTimer);
      showComplete(true);
    },

    version: VERSION,
    getSessionId: function() { return sessionId; }
  };

  global.UXTest = UXTest;
})(typeof window !== 'undefined' ? window : this);
