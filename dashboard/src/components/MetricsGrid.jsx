function MetricsGrid({ variant }) {
  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  const totalErrors = Object.values(variant.errors || {}).reduce((a, b) => a + b, 0);
  
  return (
    <div className="metrics-grid">
      <div className="metric-card success">
        <div className="metric-label">Completion Rate</div>
        <div className="metric-value">
          {variant.completionRate}
          <span className="metric-unit">%</span>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-label">Avg Completion Time</div>
        <div className="metric-value">
          {formatTime(variant.avgCompletionTimeMs)}
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-label">Median Time</div>
        <div className="metric-value">
          {formatTime(variant.medianCompletionTimeMs)}
        </div>
      </div>
      
      <div className="metric-card warning">
        <div className="metric-label">Abandon Rate</div>
        <div className="metric-value">
          {variant.abandonRate}
          <span className="metric-unit">%</span>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-label">Total Sessions</div>
        <div className="metric-value">{variant.sessions}</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-label">Total Errors</div>
        <div className="metric-value">{totalErrors}</div>
      </div>
    </div>
  );
}

export default MetricsGrid;
