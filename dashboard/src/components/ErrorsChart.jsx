import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function ErrorsChart({ errors }) {
  const errorTypes = {
    validation_error: { name: 'Validation', color: '#f59e0b' },
    api_error: { name: 'API Error', color: '#f43f5e' },
    error: { name: 'Other', color: '#8b5cf6' }
  };
  
  const data = Object.entries(errors || {}).map(([type, count]) => ({
    name: errorTypes[type]?.name || type,
    value: count,
    color: errorTypes[type]?.color || '#64748b'
  }));
  
  const hasErrors = data.length > 0 && data.some(d => d.value > 0);
  
  if (!hasErrors) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">⚠️</span>
          Error Distribution
        </h3>
        <div style={{ 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--accent-emerald)',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '2rem' }}>✓</span>
          <span>No errors recorded</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-card">
      <h3 className="chart-title">
        <span className="chart-title-icon">⚠️</span>
        Error Distribution
      </h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          />
          <Legend 
            verticalAlign="bottom"
            formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ErrorsChart;
