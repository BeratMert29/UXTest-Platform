import { useState, useEffect } from 'react';
import { getTests, getTest } from '../api/client';

// Configure this to your deployed backend URL
const DEFAULT_BACKEND = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : window.UXTEST_BACKEND || 'https://uxtest-backend.onrender.com';

function TesterPortal() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [variant, setVariant] = useState('A');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);

  useEffect(() => {
    getTests().then(data => {
      setTests(data.filter(t => t.isActive));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleStart = async (test) => {
    setSelectedTest(test);
    setVariant(test.variants.includes('B') && Math.random() > 0.5 ? 'B' : 'A');
    try {
      const testData = await getTest(test.id);
      setTasks(testData.tasks || []);
    } catch (e) {
      setTasks([]);
    }
  };

  const getBookmarkletCode = () => {
    if (!selectedTest) return '';
    return `javascript:(function(){var s=document.createElement('script');s.src='${backendUrl}/sdk/uxtest.min.js';s.onload=function(){UXTest.init({projectId:'demo-project',testId:'${selectedTest.id}',variant:'${variant}',endpoint:'${backendUrl}'});};document.head.appendChild(s);})();`;
  };

  const copyCode = () => {
    const code = getBookmarkletCode().replace('javascript:', '');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="portal">
      <div className="portal-header">
        <div className="portal-logo">
          <span className="portal-logo-mark"></span>
          UXTest
        </div>
        <h1>Tester Portal</h1>
        <p>Help us improve by testing our website</p>
      </div>

      {loading ? (
        <div className="portal-loading"><div className="portal-spinner" /></div>
      ) : !selectedTest ? (
        <div className="portal-test-list">
          <h2 className="portal-section-title">Available Tests</h2>
          {tests.length === 0 ? (
            <p className="portal-empty">No tests available right now. Check back later!</p>
          ) : tests.map(test => (
            <div key={test.id} className="portal-test-card" onClick={() => handleStart(test)}>
              <div className="portal-test-info">
                <h3>{test.name}</h3>
                <p>{test.description}</p>
                {test.targetUrl && (
                  <span className="portal-test-site">{new URL(test.targetUrl).hostname}</span>
                )}
              </div>
              <button className="portal-start-btn">
                Start Test
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="portal-instructions">
          <div className="portal-instruction-card">
            <div className="portal-card-badge">Test Instructions</div>
            <h2>{selectedTest.name}</h2>
            {selectedTest.variants.includes('B') && (
              <span className="portal-variant-badge">Variant {variant}</span>
            )}

            {tasks.length > 0 && (
              <div className="portal-tasks-box">
                <h4>Your Tasks</h4>
                <ol>
                  {tasks.map((task, i) => (
                    <li key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{task.description}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="portal-steps-box">
              <h4>How to Start</h4>
              <div className="portal-step">
                <div className="portal-step-num">1</div>
                <div className="portal-step-content">
                  <strong>Drag this button to your bookmarks bar:</strong>
                  <a
                    href={getBookmarkletCode()}
                    className="portal-bookmarklet-btn"
                    onClick={(e) => e.preventDefault()}
                    draggable="true"
                  >
                    Start UX Test
                  </a>
                  <span className="portal-hint">Can't drag? <button onClick={copyCode} className="portal-link-btn">{copied ? '✓ Copied!' : 'Copy code instead'}</button></span>
                </div>
              </div>

              <div className="portal-step">
                <div className="portal-step-num">2</div>
                <div className="portal-step-content">
                  <strong>Open the test website:</strong>
                  <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer" className="portal-website-link">
                    {selectedTest.targetUrl}
                    <span>↗</span>
                  </a>
                </div>
              </div>

              <div className="portal-step">
                <div className="portal-step-num">3</div>
                <div className="portal-step-content">
                  <strong>Click the bookmark you just created</strong>
                  <p>A test widget will appear on the page. Follow the tasks and click "Done" when complete!</p>
                </div>
              </div>
            </div>

            <div className="portal-csp-warning">
              <strong>Note about some websites:</strong> Some sites have strict Content Security Policy (CSP) headers that may block the bookmarklet from loading the test widget. If the widget does not appear after clicking the bookmarklet, try using the <strong>UXTest Chrome Extension</strong> instead, which can bypass most CSP restrictions.
            </div>

            <div className="portal-action-buttons">
              <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer" className="portal-primary-btn">
                Open Test Website →
              </a>
              <button onClick={() => { setSelectedTest(null); setTasks([]); }} className="portal-back-btn">
                ← Choose Different Test
              </button>
            </div>

            <details className="portal-advanced-options">
              <summary>Advanced Options</summary>
              <div className="portal-option-content">
                <label>Backend URL:</label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://your-backend.onrender.com"
                />
                <p className="portal-option-hint">Change this if using a custom backend deployment</p>
              </div>
            </details>
          </div>
        </div>
      )}

      <style>{`
        .portal {
          min-height: 100vh;
          background: var(--bg, #0C0C0C);
          padding: 2rem;
          color: var(--text, #EFEFEF);
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }

        .portal-header {
          text-align: center;
          margin-bottom: 3rem;
          padding-top: 1rem;
        }
        .portal-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text, #EFEFEF);
          margin-bottom: 1rem;
        }
        .portal-logo-mark {
          width: 22px;
          height: 22px;
          background: #FF4500;
          border-radius: 4px;
          display: block;
          flex-shrink: 0;
        }
        .portal-header h1 {
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 2rem;
          font-weight: 700;
          margin: 0.25rem 0;
          letter-spacing: -0.03em;
          color: var(--text, #EFEFEF);
        }
        .portal-header p {
          color: var(--text-2, #888888);
          font-size: 0.95rem;
          margin-top: 0.25rem;
        }

        .portal-loading {
          display: flex;
          justify-content: center;
          padding: 4rem;
        }
        .portal-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border, #1E1E1E);
          border-top-color: var(--text-3, #444444);
          border-radius: 50%;
          animation: portalSpin 0.8s linear infinite;
        }
        @keyframes portalSpin { to { transform: rotate(360deg); } }

        .portal-test-list {
          max-width: 640px;
          margin: 0 auto;
        }
        .portal-section-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-3, #444444);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 1.25rem;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-empty {
          text-align: center;
          color: var(--text-3, #444444);
          padding: 3rem;
          background: var(--bg-raised, #111111);
          border-radius: 10px;
          border: 1px dashed var(--border, #1E1E1E);
          font-size: 0.875rem;
        }

        .portal-test-card {
          background: var(--bg-raised, #111111);
          border: 1px solid var(--border, #1E1E1E);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .portal-test-card:hover {
          border-color: var(--border-focus, #333333);
          background: var(--bg-hover, #161616);
        }
        .portal-test-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.375rem;
          color: var(--text, #EFEFEF);
        }
        .portal-test-info p {
          color: var(--text-2, #888888);
          margin: 0 0 0.625rem;
          font-size: 0.875rem;
        }
        .portal-test-site {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--text-3, #444444);
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
        }

        .portal-start-btn {
          background: #FF4500;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          white-space: nowrap;
          font-family: var(--font-body, 'DM Sans', sans-serif);
          transition: opacity 0.15s;
        }
        .portal-start-btn:hover { opacity: 0.88; }

        .portal-instructions {
          max-width: 600px;
          margin: 0 auto;
        }
        .portal-instruction-card {
          background: var(--bg-raised, #111111);
          border: 1px solid var(--border, #1E1E1E);
          border-radius: 10px;
          padding: 2rem;
        }
        .portal-card-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-2, #888888);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border, #1E1E1E);
          padding: 0.3rem 0.7rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-instruction-card h2 {
          font-family: var(--font-display, 'Syne', sans-serif);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 0.5rem;
          color: var(--text, #EFEFEF);
        }
        .portal-variant-badge {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--text-2, #888888);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border, #1E1E1E);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
        }

        .portal-tasks-box {
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.15);
          border-radius: 6px;
          padding: 1.25rem;
          margin: 1.5rem 0;
        }
        .portal-tasks-box h4 {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #22C55E;
          margin: 0 0 1rem;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-tasks-box ol {
          margin: 0;
          padding-left: 1.25rem;
        }
        .portal-tasks-box li {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        .portal-tasks-box li strong {
          display: block;
          color: var(--text, #EFEFEF);
          font-size: 0.875rem;
        }
        .portal-tasks-box li span {
          font-size: 0.8rem;
          color: var(--text-2, #888888);
        }

        .portal-steps-box {
          margin: 1.5rem 0;
        }
        .portal-steps-box h4 {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-3, #444444);
          margin: 0 0 1.25rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }

        .portal-step {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .portal-step-num {
          width: 24px;
          height: 24px;
          border: 1px solid var(--border, #1E1E1E);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
          color: var(--text-2, #888888);
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
        }
        .portal-step-content {
          flex: 1;
        }
        .portal-step-content strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: var(--text, #EFEFEF);
        }
        .portal-step-content p {
          color: var(--text-2, #888888);
          margin: 0;
          font-size: 0.875rem;
        }

        .portal-bookmarklet-btn {
          display: inline-block;
          background: #FF4500;
          color: white;
          font-weight: 600;
          padding: 0.625rem 1.125rem;
          border-radius: 6px;
          text-decoration: none;
          cursor: grab;
          margin: 0.5rem 0;
          font-size: 0.875rem;
          font-family: var(--font-body, 'DM Sans', sans-serif);
          transition: opacity 0.15s;
        }
        .portal-bookmarklet-btn:hover { opacity: 0.88; color: white; }
        .portal-bookmarklet-btn:active { cursor: grabbing; }

        .portal-hint {
          display: block;
          font-size: 0.8rem;
          color: var(--text-3, #444444);
          margin-top: 0.5rem;
        }
        .portal-link-btn {
          background: none;
          border: none;
          color: var(--text-2, #888888);
          cursor: pointer;
          font-size: 0.8rem;
          text-decoration: underline;
          padding: 0;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-link-btn:hover { color: var(--text, #EFEFEF); }

        .portal-website-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--text-2, #888888);
          text-decoration: none;
          border: 1px solid var(--border, #1E1E1E);
          border-radius: 6px;
          padding: 0.375rem 0.75rem;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          word-break: break-all;
          transition: border-color 0.15s;
        }
        .portal-website-link:hover {
          border-color: var(--border-focus, #333333);
          color: var(--text, #EFEFEF);
        }

        .portal-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 2rem;
        }
        .portal-primary-btn {
          background: #FF4500;
          color: white;
          text-decoration: none;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          text-align: center;
          font-size: 0.875rem;
          transition: opacity 0.15s;
          font-family: var(--font-body, 'DM Sans', sans-serif);
          display: block;
        }
        .portal-primary-btn:hover { opacity: 0.88; color: white; }
        .portal-back-btn {
          background: transparent;
          border: 1px solid var(--border, #1E1E1E);
          color: var(--text-2, #888888);
          padding: 0.625rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: border-color 0.15s;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-back-btn:hover {
          border-color: var(--border-focus, #333333);
          color: var(--text, #EFEFEF);
        }

        .portal-csp-warning {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: #D97706;
          line-height: 1.6;
        }
        .portal-csp-warning strong {
          color: #F59E0B;
        }

        .portal-advanced-options {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border, #1E1E1E);
        }
        .portal-advanced-options summary {
          cursor: pointer;
          color: var(--text-3, #444444);
          font-size: 0.8rem;
          user-select: none;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-advanced-options summary:hover { color: var(--text-2, #888888); }
        .portal-option-content {
          margin-top: 1rem;
        }
        .portal-option-content label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-2, #888888);
          margin-bottom: 0.375rem;
          font-family: var(--font-body, 'DM Sans', sans-serif);
        }
        .portal-option-content input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: var(--bg, #0C0C0C);
          border: 1px solid var(--border, #1E1E1E);
          border-radius: 6px;
          color: var(--text, #EFEFEF);
          font-size: 0.875rem;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          transition: border-color 0.15s;
        }
        .portal-option-content input:focus {
          outline: none;
          border-color: var(--border-focus, #333333);
        }
        .portal-option-hint {
          font-size: 0.75rem;
          color: var(--text-3, #444444);
          margin-top: 0.375rem;
        }
      `}</style>
    </div>
  );
}

export default TesterPortal;
