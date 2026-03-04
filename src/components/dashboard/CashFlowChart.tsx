import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { FinancialProjection } from '@/types/chargeScore';

interface Props {
  financials: FinancialProjection;
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const CashFlowChart = ({ financials }: Props) => {
  const chartData = financials.cumulativeCashFlow.map((val, i) => ({
    year: `Y${i + 1}`,
    value: Math.round(val),
  }));

  return (
    <div className="glass-card-dark">
      <div className="border-b border-white/10 p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          15-Year Cumulative Cash Flow
        </h2>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[500px]">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => {
                if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                return `$${(v / 1000).toFixed(0)}k`;
              }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f8fafc' }}
                formatter={(value: number) => [fmt(value), 'Cash Flow']}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.value >= 0 ? '#00d4aa' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CashFlowChart;
