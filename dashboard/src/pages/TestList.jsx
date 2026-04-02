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
            <div key={test.id} className="test-card" onClick={() => navigate(`/test/${test.id}`)}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">{test.name}</h3>
                  <p className="card-description">{test.description}</p>
                </div>
                <span className={`status-badge ${test.isActive ? 'active' : 'inactive'}`}>
                  <span className="status-dot"></span>
                  {test.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              {test.targetUrl && (
                <div className="test-url">
                  {test.targetUrl}
                </div>
              )}

              <div className="variants">
                {test.variants.map(v => (
                  <span key={v} className="variant-badge">
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
                    color: test.completionRate >= 70 ? 'var(--success)' :
                           test.completionRate >= 40 ? 'var(--warning)' :
                           test.totalSessions === 0 ? 'var(--text-3)' : 'var(--danger)'
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
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-2);
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
          font-family: var(--font-body);
          transition: border-color 0.15s;
        }
        .btn-refresh:hover {
          border-color: var(--border-focus);
          color: var(--text);
        }

        .btn-create {
          padding: 0.375rem 0.875rem;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          display: inline-block;
          font-family: var(--font-body);
          transition: opacity 0.15s;
        }
        .btn-create:hover {
          color: white;
          opacity: 0.88;
        }

        .test-url {
          margin-top: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-3);
          font-family: var(--font-mono);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

export default TestList;
