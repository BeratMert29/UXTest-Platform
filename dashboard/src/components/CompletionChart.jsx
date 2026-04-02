import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function CompletionChart({ variants, activeVariant }) {
  const data = Object.entries(variants).map(([name, stats]) => ({
    name: `Variant ${name}`,
    variant: name,
    completionRate: stats.completionRate,
    abandonRate: stats.abandonRate,
  }));
  
  return (
    <div className="chart-card">
      <h3 className="chart-title">
        Completion vs Abandon Rate
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" barGap={8}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="var(--text-3)"
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            stroke="var(--text-3)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-active)',
              border: '1px solid var(--border-focus)',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
            formatter={(value) => [`${value}%`]}
          />
          <Bar 
            dataKey="completionRate" 
            name="Completed"
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-completion-${index}`}
                fill={entry.variant === activeVariant ? '#10b981' : '#10b98180'}
              />
            ))}
          </Bar>
          <Bar 
            dataKey="abandonRate" 
            name="Abandoned"
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-abandon-${index}`}
                fill={entry.variant === activeVariant ? '#f43f5e' : '#f43f5e80'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CompletionChart;
