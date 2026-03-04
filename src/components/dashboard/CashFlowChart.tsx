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
    <div className="glass-card">
      <div className="border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          15-Year Cumulative Cash Flow
        </h2>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[500px]">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => {
                if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                return `$${(v / 1000).toFixed(0)}k`;
              }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid hsl(214, 20%, 88%)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#1e293b' }}
                formatter={(value: number) => [fmt(value), 'Cash Flow']}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.value >= 0 ? 'hsl(152, 60%, 38%)' : 'hsl(4, 72%, 50%)'} />
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
