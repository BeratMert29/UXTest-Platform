import { useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalytics, getTest } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import MetricsGrid from '../components/MetricsGrid';
import TimeDistributionChart from '../components/TimeDistributionChart';
import CompletionChart from '../components/CompletionChart';
import ErrorsChart from '../components/ErrorsChart';

const VARIANT_KEY = 'uxtest_active_variant';

function TestDetail() {
  const { testId } = useParams();

  // Restore activeVariant from localStorage, default to 'A'
  const [activeVariant, setActiveVariant] = useState(() => {
    try {
      const stored = localStorage.getItem(VARIANT_KEY);
      if (stored === 'A' || stored === 'B') return stored;
    } catch(e) {}
    return 'A';
  });

  // Persist activeVariant changes
  const handleSetActiveVariant = useCallback((v) => {
    setActiveVariant(v);
    try { localStorage.setItem(VARIANT_KEY, v); } catch(e) {}
  }, []);

  const fetchData = useCallback(async () => {
    const [analytics, test] = await Promise.all([
      getAnalytics(testId),
      getTest(testId, { skipCache: true })
    ]);
    return { analytics, test };
  }, [testId]);

  const { data, loading, error, refresh } = usePolling(fetchData, { interval: 10000 });

  const analytics = data?.analytics;
  const test = data?.test;
  const variants = analytics ? Object.keys(analytics.variants) : [];
  const currentVariant = analytics?.variants[activeVariant] || analytics?.variants['A'];

  const sessionCode = test?.sessionCode || null;
  const [codeCopied, setCodeCopied] = useState(false);
  const copyCodeTimeout = useRef(null);

  const handleCopyCode = useCallback(() => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode).then(() => {
      setCodeCopied(true);
      if (copyCodeTimeout.current) clearTimeout(copyCodeTimeout.current);
      copyCodeTimeout.current = setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => {});
  }, [sessionCode]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !analytics || !test) {
    return (
      <div>
        <Link to="/" className="back-link">← Back</Link>
        <div className="error-state">
          <p>{error || 'Test not found'}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="back-link">← Back to Tests</Link>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{test.name}</h1>
            <p className="page-subtitle">{test.description}</p>
          </div>
          <button onClick={refresh} className="btn-refresh">↻ Refresh</button>
        </div>
      </div>

      {sessionCode && (
        <div className="session-code-bar">
          <div className="session-code-label">Session Code</div>
          <div className="session-code-row">
            <span className="session-code-value">{sessionCode}</span>
            <button className="session-code-copy" onClick={handleCopyCode}>
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="session-code-hint">Paste this code into the browser extension to start a test session.</p>
        </div>
      )}

      {variants.length > 1 && (
        <div className="variant-tabs">
          {variants.map(v => (
            <button
              key={v}
              className={`variant-tab ${activeVariant === v ? 'active' : ''}`}
              onClick={() => handleSetActiveVariant(v)}
            >
              Variant {v}
            </button>
          ))}
        </div>
      )}

      {currentVariant && (
        <>
          <MetricsGrid variant={currentVariant} />

          <div className="charts-section">
            <CompletionChart variants={analytics.variants} activeVariant={activeVariant} />
            <TimeDistributionChart distribution={currentVariant.timeDistribution} />
          </div>

          <div className="charts-section">
            <ErrorsChart errors={currentVariant.errors} />
            <div className="chart-card">
              <h3 className="chart-title">Session Details</h3>
              <div>
                <p style={{ lineHeight: 2, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>Total:</strong> {currentVariant.sessions} &nbsp;
                  <strong style={{ color: 'var(--text)' }}>Completed:</strong> {currentVariant.completed} &nbsp;
                  <strong style={{ color: 'var(--text)' }}>Abandoned:</strong> {currentVariant.abandoned}
                </p>
                <p style={{ lineHeight: 2, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text)' }}>Time Range:</strong> {formatTime(currentVariant.minCompletionTimeMs)} – {formatTime(currentVariant.maxCompletionTimeMs)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .btn-refresh {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-2);
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
          font-family: var(--font-body);
          transition: border-color 0.15s;
        }
        .btn-refresh:hover {
          border-color: var(--border-focus);
          color: var(--text);
        }

        .session-code-bar {
          background: var(--surface-2, rgba(255,255,255,0.04));
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          margin-bottom: 1.5rem;
        }
        .session-code-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-3);
          margin-bottom: 0.4rem;
        }
        .session-code-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .session-code-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: var(--accent);
        }
        .session-code-copy {
          padding: 0.25rem 0.625rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm, 4px);
          color: var(--text-2);
          font-size: 0.75rem;
          cursor: pointer;
          font-family: var(--font-body);
          transition: border-color 0.15s, color 0.15s;
        }
        .session-code-copy:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .session-code-hint {
          font-size: 0.75rem;
          color: var(--text-3);
          margin-top: 0.4rem;
        }

        .variant-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}

function formatTime(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default TestDetail;
