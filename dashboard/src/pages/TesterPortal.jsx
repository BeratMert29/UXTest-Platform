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
        <div className="logo">◈ UXTest</div>
        <h1>Tester Portal</h1>
        <p>Help us improve by testing our website</p>
      </div>
      
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !selectedTest ? (
        <div className="test-list">
          <h2 className="section-title">Available Tests</h2>
          {tests.length === 0 ? (
            <p className="empty">No tests available right now. Check back later!</p>
          ) : tests.map(test => (
            <div key={test.id} className="test-card" onClick={() => handleStart(test)}>
              <div className="test-info">
                <h3>{test.name}</h3>
                <p>{test.description}</p>
                {test.targetUrl && (
                  <span className="test-site">{new URL(test.targetUrl).hostname}</span>
                )}
              </div>
              <button className="start-btn">
                Start Test
                <span className="arrow">→</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="test-instructions">
          <div className="instruction-card">
            <div className="card-badge">Test Instructions</div>
            <h2>{selectedTest.name}</h2>
            {selectedTest.variants.includes('B') && (
              <span className="variant-badge">Variant {variant}</span>
            )}
            
            {tasks.length > 0 && (
              <div className="tasks-box">
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
            
            <div className="steps-box">
              <h4>How to Start</h4>
              <div className="step">
                <div className="step-num">1</div>
                <div className="step-content">
                  <strong>Drag this button to your bookmarks bar:</strong>
                  <a 
                    href={getBookmarkletCode()} 
                    className="bookmarklet-btn"
                    onClick={(e) => e.preventDefault()}
                    draggable="true"
                  >
                    🧪 Start UX Test
                  </a>
                  <span className="hint">Can't drag? <button onClick={copyCode} className="link-btn">{copied ? '✓ Copied!' : 'Copy code instead'}</button></span>
                </div>
              </div>
              
              <div className="step">
                <div className="step-num">2</div>
                <div className="step-content">
                  <strong>Open the test website:</strong>
                  <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer" className="website-link">
                    {selectedTest.targetUrl}
                    <span className="external-icon">↗</span>
                  </a>
                </div>
              </div>
              
              <div className="step">
                <div className="step-num">3</div>
                <div className="step-content">
                  <strong>Click the bookmark you just created</strong>
                  <p>A test widget will appear on the page. Follow the tasks and click "Done" when complete!</p>
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer" className="primary-btn">
                Open Test Website →
              </a>
              <button onClick={() => { setSelectedTest(null); setTasks([]); }} className="back-btn">
                ← Choose Different Test
              </button>
            </div>
            
            <details className="advanced-options">
              <summary>Advanced Options</summary>
              <div className="option-content">
                <label>Backend URL:</label>
                <input 
                  type="text" 
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://your-backend.onrender.com"
                />
                <p className="option-hint">Change this if using a custom backend deployment</p>
              </div>
            </details>
          </div>
        </div>
      )}
      
      <style>{`
        .portal {
          min-height: 100vh;
          background: linear-gradient(145deg, #0c0c14 0%, #1a1a2e 50%, #16213e 100%);
          padding: 2rem;
          color: #fff;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        
        .portal-header {
          text-align: center;
          margin-bottom: 3rem;
          padding-top: 1rem;
        }
        .logo {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .portal-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0.5rem 0;
          letter-spacing: -0.02em;
        }
        .portal-header p { color: #94a3b8; font-size: 1.1rem; }
        
        .loading { display: flex; justify-content: center; padding: 4rem; }
        .spinner {
          width: 48px; height: 48px;
          border: 4px solid rgba(96,165,250,0.2);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .test-list {
          max-width: 640px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }
        .empty {
          text-align: center;
          color: #64748b;
          padding: 3rem;
          background: rgba(255,255,255,0.02);
          border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.1);
        }
        
        .test-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .test-card:hover {
          border-color: rgba(96,165,250,0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(96,165,250,0.1);
        }
        .test-info h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }
        .test-info p {
          color: #94a3b8;
          margin: 0 0 0.75rem;
          font-size: 0.95rem;
        }
        .test-site {
          display: inline-block;
          font-size: 0.8rem;
          color: #60a5fa;
          background: rgba(96,165,250,0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }
        
        .start-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s;
        }
        .start-btn:hover { transform: scale(1.05); }
        .start-btn .arrow { font-size: 1.2rem; }
        
        .test-instructions {
          max-width: 600px;
          margin: 0 auto;
        }
        .instruction-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 2rem;
        }
        .card-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f59e0b;
          background: rgba(245,158,11,0.1);
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .instruction-card h2 {
          font-size: 1.75rem;
          margin: 0 0 0.5rem;
        }
        .variant-badge {
          display: inline-block;
          font-size: 0.75rem;
          color: #a78bfa;
          background: rgba(167,139,250,0.15);
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
        }
        
        .tasks-box {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 12px;
          padding: 1.25rem;
          margin: 1.5rem 0;
        }
        .tasks-box h4 {
          font-size: 0.9rem;
          color: #10b981;
          margin: 0 0 1rem;
        }
        .tasks-box ol {
          margin: 0;
          padding-left: 1.25rem;
        }
        .tasks-box li {
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }
        .tasks-box li strong {
          display: block;
          color: #fff;
        }
        .tasks-box li span {
          font-size: 0.9rem;
          color: #94a3b8;
        }
        
        .steps-box {
          margin: 1.5rem 0;
        }
        .steps-box h4 {
          font-size: 0.9rem;
          color: #94a3b8;
          margin: 0 0 1.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .step {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .step-num {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .step-content {
          flex: 1;
        }
        .step-content strong {
          display: block;
          margin-bottom: 0.5rem;
        }
        .step-content p {
          color: #94a3b8;
          margin: 0;
          font-size: 0.9rem;
        }
        
        .bookmarklet-btn {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #000;
          font-weight: 700;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          text-decoration: none;
          cursor: grab;
          margin: 0.5rem 0;
          font-size: 0.95rem;
          box-shadow: 0 4px 15px rgba(245,158,11,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .bookmarklet-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(245,158,11,0.4);
        }
        .bookmarklet-btn:active { cursor: grabbing; }
        
        .hint {
          display: block;
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.5rem;
        }
        .link-btn {
          background: none;
          border: none;
          color: #60a5fa;
          cursor: pointer;
          font-size: 0.8rem;
          text-decoration: underline;
          padding: 0;
        }
        
        .website-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #60a5fa;
          text-decoration: none;
          background: rgba(96,165,250,0.1);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          margin-top: 0.5rem;
          font-size: 0.9rem;
          word-break: break-all;
        }
        .website-link:hover { background: rgba(96,165,250,0.2); }
        .external-icon { font-size: 0.8rem; }
        
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 2rem;
        }
        .primary-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          text-decoration: none;
          padding: 1rem;
          border-radius: 10px;
          font-weight: 600;
          text-align: center;
          font-size: 1rem;
          transition: transform 0.2s;
        }
        .primary-btn:hover { transform: translateY(-2px); }
        .back-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: #94a3b8;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .back-btn:hover {
          border-color: rgba(255,255,255,0.3);
          color: #fff;
        }
        
        .advanced-options {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .advanced-options summary {
          cursor: pointer;
          color: #64748b;
          font-size: 0.85rem;
        }
        .advanced-options summary:hover { color: #94a3b8; }
        .option-content {
          margin-top: 1rem;
        }
        .option-content label {
          display: block;
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }
        .option-content input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 6px;
          color: #fff;
          font-size: 0.9rem;
        }
        .option-content input:focus {
          outline: none;
          border-color: #60a5fa;
        }
        .option-hint {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}

export default TesterPortal;
