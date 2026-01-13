import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalytics, getTest } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import MetricsGrid from '../components/MetricsGrid';
import TimeDistributionChart from '../components/TimeDistributionChart';
import CompletionChart from '../components/CompletionChart';
import ErrorsChart from '../components/ErrorsChart';

function TestDetail() {
  const { testId } = useParams();
  const [activeVariant, setActiveVariant] = useState('A');
  
  const fetchData = useCallback(async () => {
    const [analytics, test] = await Promise.all([
      getAnalytics(testId),
      getTest(testId)
    ]);
    return { analytics, test };
  }, [testId]);
  
  const { data, loading, error, refresh } = usePolling(fetchData, { interval: 15000 });
  
  const analytics = data?.analytics;
  const test = data?.test;
  const variants = analytics ? Object.keys(analytics.variants) : [];
  const currentVariant = analytics?.variants[activeVariant] || analytics?.variants['A'];
  
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
      
      {variants.length > 1 && (
        <div className="variant-tabs">
          {variants.map(v => (
            <button
              key={v}
              className={`variant-tab ${v === 'B' ? 'variant-b' : ''} ${activeVariant === v ? 'active' : ''}`}
              onClick={() => setActiveVariant(v)}
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
              <h3 className="chart-title">
                <span className="chart-title-icon">📋</span>
                Session Details
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <p><strong>Total:</strong> {currentVariant.sessions} | <strong>Completed:</strong> {currentVariant.completed} | <strong>Abandoned:</strong> {currentVariant.abandoned}</p>
                <p><strong>Time Range:</strong> {formatTime(currentVariant.minCompletionTimeMs)} - {formatTime(currentVariant.maxCompletionTimeMs)}</p>
              </div>
            </div>
          </div>
        </>
      )}
      
      <style>{`
        .btn-refresh {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
        }
        .btn-refresh:hover { background: var(--bg-hover); }
        
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
