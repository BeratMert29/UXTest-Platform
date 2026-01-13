import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function TimeDistributionChart({ distribution }) {
  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e'];
  
  const hasData = distribution.some(d => d.count > 0);
  
  if (!hasData) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">
          <span className="chart-title-icon">⏱️</span>
          Completion Time Distribution
        </h3>
        <div style={{ 
          height: 250, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          No completion data yet
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-card">
      <h3 className="chart-title">
        <span className="chart-title-icon">⏱️</span>
        Completion Time Distribution
      </h3>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={distribution}>
          <XAxis 
            dataKey="bucket" 
            stroke="var(--text-muted)"
            fontSize={12}
          />
          <YAxis 
            stroke="var(--text-muted)"
            fontSize={12}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
            formatter={(value) => [value, 'Sessions']}
          />
          <Bar 
            dataKey="count" 
            radius={[4, 4, 0, 0]}
          >
            {distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TimeDistributionChart;
