import { AlertTriangle, Zap, Battery, Lightbulb } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DemandChargeAnalysis } from '@/types/chargeRank';

interface Props {
  analysis: DemandChargeAnalysis;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

const DemandChargeAnalyzer = ({ analysis }: Props) => {
  const donutData = [
    { name: 'Demand Charges', value: Math.round(analysis.monthlyDemandCharge) },
    { name: 'Energy Charges', value: Math.round(analysis.monthlyEnergyCost) },
  ];

  const COLORS = ['#fbbf24', '#00d4aa'];

  return (
    <div className="glass-card-dark">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Zap className="h-4 w-4 text-amber" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Demand Charge Analyzer</h2>
        {analysis.demandChargePercent > 40 && (
          <AlertTriangle className="h-4 w-4 text-amber pulse-warning" />
        )}
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {/* Stats + Donut */}
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                strokeWidth={0}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [fmt(value), '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Peak Demand</p>
              <p className="font-mono text-lg font-bold text-foreground">{Math.round(analysis.peakDemandKw)} kW</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Demand Charge</p>
              <p className="font-mono text-lg font-bold text-amber">{fmt(analysis.monthlyDemandCharge)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">% of Electricity Bill</p>
              <p className="font-mono text-sm font-semibold text-foreground">{Math.round(analysis.demandChargePercent)}%</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommendations</p>
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-white/5 p-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemandChargeAnalyzer;
