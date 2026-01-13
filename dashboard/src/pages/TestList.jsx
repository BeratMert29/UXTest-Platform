import { useNavigate, Link } from 'react-router-dom';
import { getTests } from '../api/client';
import { usePolling } from '../hooks/usePolling';

function TestList() {
  const navigate = useNavigate();
  
  const { data: tests, loading, error, refresh } = usePolling(
    () => getTests(),
    { interval: 30000 }
  );
  
  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Usability Tests</h1>
            <p className="page-subtitle">Create and manage your usability experiments</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={refresh} className="btn-refresh">↻</button>
            <Link to="/create" className="btn-create">+ Create Test</Link>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
        </div>
      ) : error && !tests ? (
        <div className="error-state">
          <p>Failed to load: {error}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      ) : !tests?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">No tests yet</h3>
          <Link to="/create" className="btn-create" style={{ marginTop: '1rem' }}>+ Create Test</Link>
        </div>
      ) : (
        <div className="test-grid">
          {tests.map(test => (
            <div key={test.id} className="card test-card" onClick={() => navigate(`/test/${test.id}`)}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">{test.name}</h3>
                  <p className="card-description">{test.description}</p>
                </div>
                <span className={`status-badge ${test.isActive ? 'active' : 'inactive'}`}>
                  {test.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              
              {test.targetUrl && (
                <div className="test-url">
                  🌐 {test.targetUrl}
                </div>
              )}
              
              <div className="variants">
                {test.variants.map(v => (
                  <span key={v} className={`variant-badge ${v === 'B' ? 'variant-b' : ''}`}>
                    Variant {v}
                  </span>
                ))}
              </div>
              
              <div className="test-meta">
                <div className="test-stat">
                  <span className="test-stat-value">{test.totalSessions}</span>
                  <span className="test-stat-label">Sessions</span>
                </div>
                <div className="test-stat">
                  <span className="test-stat-value" style={{ 
                    color: test.completionRate >= 70 ? 'var(--accent-emerald)' : 
                           test.completionRate >= 40 ? 'var(--accent-amber)' : 
                           test.totalSessions === 0 ? 'var(--text-muted)' : 'var(--accent-rose)' 
                  }}>
                    {test.completionRate}%
                  </span>
                  <span className="test-stat-label">Completion</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .btn-refresh {
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1rem;
        }
        .btn-refresh:hover { background: var(--bg-hover); }
        
        .btn-create {
          padding: 0.5rem 1.25rem;
          background: var(--gradient-primary);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
        
        .test-url {
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(96, 165, 250, 0.1);
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--accent-blue);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

export default TestList;
