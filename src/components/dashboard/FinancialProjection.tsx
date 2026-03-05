import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap } from 'lucide-react';
import type { FinancialProjection as FP } from '@/types/chargeScore';

interface Props {
  financials: FP;
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const FinancialProjection = ({ financials }: Props) => {
  const isTesla = financials.chargingModel === 'tesla';

  const chartData = financials.cumulativeCashFlow.map((val, i) => ({
    year: `Y${i + 1}`,
    value: Math.round(val),
  }));

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        {isTesla && <Zap className="h-4 w-4 text-primary" />}
        <h2 className="font-heading text-sm font-semibold text-foreground">
          15-Year Cumulative Cash Flow
        </h2>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <ResponsiveContainer width="100%" height={200}>
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

        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
          <p><strong>What is NPV?</strong> Net Present Value shows your total 15-year profit in today's dollars. Future earnings are worth less than money today — we discount at 8% annually, reflecting the opportunity cost of capital (i.e., what you'd likely earn investing elsewhere). A positive NPV means this charging station outperforms a typical market investment.</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialProjection;
