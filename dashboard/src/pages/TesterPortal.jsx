import { useState, useEffect } from 'react';
import { getTests } from '../api/client';

function TesterPortal() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [variant, setVariant] = useState('A');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getTests().then(data => {
      setTests(data.filter(t => t.isActive));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  
  const handleStart = (test) => {
    setSelectedTest(test);
    setVariant(test.variants.includes('B') && Math.random() > 0.5 ? 'B' : 'A');
  };
  
  const getCode = () => {
    if (!selectedTest) return '';
    return `(function(){var s=document.createElement('script');s.src='http://localhost:3001/sdk/uxtest.min.js';s.onload=function(){UXTest.init({projectId:'demo-project',testId:'${selectedTest.id}',variant:'${variant}',endpoint:'http://localhost:3001'});};document.head.appendChild(s);})();`;
  };
  
  const copy = () => {
    navigator.clipboard.writeText(getCode());
    alert('Copied!');
  };
  
  return (
    <div className="portal">
      <div className="portal-header">
        <div className="logo">◈ UXTest</div>
        <h1>Tester Portal</h1>
        <p>Select a test to participate</p>
      </div>
      
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !selectedTest ? (
        <div className="test-list">
              {tests.length === 0 ? (
            <p className="empty">No active tests available</p>
          ) : tests.map(test => (
            <div key={test.id} className="test-item" onClick={() => handleStart(test)}>
              <div>
                <h3>{test.name}</h3>
                <p>{test.description}</p>
                <div className="test-meta">
                  {test.targetUrl && <span className="url">{new URL(test.targetUrl).hostname}</span>}
                </div>
              </div>
              <button className="start-btn">Start →</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="instructions">
          <div className="card">
            <div className="card-header">
              <span className="label">YOUR TASK</span>
              <h2>{selectedTest.name}</h2>
              {selectedTest.variants.includes('B') && <span className="variant">Variant {variant}</span>}
            </div>
            
            <div className="card-body">
              <div className="section">
                <h4>📋 Task</h4>
                <p>{selectedTest.instructions || selectedTest.description}</p>
              </div>
              
              <div className="section">
                <h4>📝 Steps</h4>
                <ol>
                  <li>Open <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer">{selectedTest.targetUrl}</a></li>
                  <li>Open browser console (F12)</li>
                  <li>Paste this code:</li>
                </ol>
                <div className="code-box">
                  <code>{getCode()}</code>
                  <button onClick={copy}>Copy</button>
                </div>
              </div>
              
              <a href={selectedTest.targetUrl} target="_blank" rel="noopener noreferrer" className="open-btn">
                Open Website →
              </a>
            </div>
            
            <div className="card-footer">
              <button onClick={() => setSelectedTest(null)}>← Back</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .portal {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          padding: 2rem;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .portal-header { text-align: center; margin-bottom: 2rem; }
        .logo { font-size: 1.5rem; font-weight: 700; color: #60a5fa; margin-bottom: 0.5rem; }
        .portal-header h1 { font-size: 2rem; margin: 0.5rem 0; }
        .portal-header p { color: #94a3b8; }
        
        .loading { text-align: center; padding: 3rem; }
        .spinner {
          width: 40px; height: 40px; margin: 0 auto;
          border: 3px solid #333; border-top-color: #60a5fa;
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .test-list { max-width: 600px; margin: 0 auto; }
        .empty { text-align: center; color: #94a3b8; padding: 2rem; }
        
        .test-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .test-item:hover { border-color: #60a5fa; transform: translateY(-2px); }
        .test-item h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
        .test-item p { margin: 0 0 0.5rem; color: #94a3b8; font-size: 0.9rem; }
        .url { font-size: 0.75rem; color: #60a5fa; background: rgba(96,165,250,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; }
        
        .start-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; border: none; padding: 0.6rem 1.2rem;
          border-radius: 6px; font-weight: 600; cursor: pointer;
        }
        
        .instructions { max-width: 600px; margin: 0 auto; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
        .card-header { padding: 1.25rem; background: rgba(96,165,250,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; color: #f59e0b; }
        .card-header h2 { margin: 0.5rem 0 0; font-size: 1.25rem; }
        .variant { display: inline-block; margin-top: 0.5rem; padding: 0.2rem 0.6rem; background: rgba(139,92,246,0.2); color: #a78bfa; border-radius: 4px; font-size: 0.75rem; }
        
        .card-body { padding: 1.25rem; }
        .section { margin-bottom: 1.25rem; }
        .section h4 { margin: 0 0 0.5rem; font-size: 0.9rem; }
        .section p { color: #94a3b8; margin: 0; line-height: 1.5; }
        .section ol { padding-left: 1.25rem; color: #94a3b8; line-height: 1.8; }
        .section a { color: #60a5fa; }
        
        .code-box {
          position: relative;
          background: #0a0a0f;
          border-radius: 6px;
          padding: 0.75rem;
          margin-top: 0.5rem;
        }
        .code-box code { font-size: 0.7rem; color: #10b981; word-break: break-all; display: block; padding-right: 50px; }
        .code-box button {
          position: absolute; top: 0.5rem; right: 0.5rem;
          background: #3b82f6; color: white; border: none;
          padding: 0.25rem 0.5rem; border-radius: 4px;
          font-size: 0.7rem; cursor: pointer;
        }
        
        .open-btn {
          display: block;
          text-align: center;
          background: #10b981;
          color: white;
          text-decoration: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
        }
        
        .card-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.1); }
        .card-footer button {
          background: transparent; border: 1px solid rgba(255,255,255,0.2);
          color: #94a3b8; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;
        }
        .card-footer button:hover { border-color: #60a5fa; color: #60a5fa; }
      `}</style>
    </div>
  );
}

export default TesterPortal;
