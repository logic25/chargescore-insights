import { useState } from 'react';
import { TrendingUp, AlertTriangle, Info, DollarSign, Award, Zap, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialProjection as FP, Incentive, SiteAnalysis } from '@/types/chargeScore';
import type { NrelIncentive } from '@/lib/api/incentives';

interface Props {
  financials: FP;
  incentives: Incentive[];
  site: SiteAnalysis;
  nrelIncentives?: NrelIncentive[];
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const FinancialProjection = ({ financials, incentives, site, nrelIncentives = [] }: Props) => {
  const [incentiveExpanded, setIncentiveExpanded] = useState<string | null>(null);
  const [showNrelPrograms, setShowNrelPrograms] = useState(false);
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
          {isTesla ? 'Tesla Supercharger for Business — Financial Projection' : 'Financial Projection'}
        </h2>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {/* Revenue */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> Revenue
          </h3>
          <div className="space-y-2">
            {isTesla ? (
              <>
                <Row label={`Daily kWh (${site.teslaStalls} stalls)`} value={`${Math.round(financials.dailyKwhDcfc)} kWh`} />
                <Row label="Daily Gross Revenue" value={fmt(financials.dailyRevenue)} />
                <Row label="Monthly Gross Revenue" value={fmt(financials.monthlyRevenue)} highlight />
                <Row label="Annual Gross Revenue" value={fmt(financials.annualRevenue)} highlight />
              </>
            ) : (
              <>
                <Row label="Daily kWh (L2)" value={`${Math.round(financials.dailyKwhL2)} kWh`} />
                <Row label="Daily kWh (DCFC)" value={`${Math.round(financials.dailyKwhDcfc)} kWh`} />
                <Row label="Daily Revenue" value={fmt(financials.dailyRevenue)} />
                <Row label="Monthly Revenue" value={fmt(financials.monthlyRevenue)} highlight />
                <Row label="Annual Revenue" value={fmt(financials.annualRevenue)} highlight />
              </>
            )}
          </div>
        </div>

        {/* Costs */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
            <DollarSign className="h-3.5 w-3.5" /> Costs
          </h3>
          <div className="space-y-2">
            {isTesla ? (
              <>
                <Row label={`Supercharger Hardware (${site.teslaStalls}×)`} value={fmt(financials.totalHardwareCost)} />
                <Row label="Site Prep & Installation" value={fmt(financials.totalInstallationCost)} />
                {financials.electricalUpgradeNeeded && (
                  <div className="flex items-center gap-1 rounded bg-amber/10 p-1.5 text-xs text-amber">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>Likely transformer upgrade: {fmt(financials.electricalUpgradeCost[0])}–{fmt(financials.electricalUpgradeCost[1])}</span>
                  </div>
                )}
                <Row label="Monthly Electricity" value={fmt(financials.monthlyElectricityCost)} />
                <div className="flex items-center gap-1">
                  <Row label="Monthly Demand Charge" value={fmt(financials.monthlyDemandCharge)} />
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-primary" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Tesla's built-in load management reduces peak demand by ~45%, significantly lowering demand charges compared to unmanaged chargers.
                    </TooltipContent>
                  </UITooltip>
                </div>
                <Row label="Tesla Service Fee (Annual)" value={fmt(financials.teslaServiceFeeAnnual)} />
                <div className="mt-1 rounded bg-primary/10 p-1.5 text-[10px] text-primary">
                  ✓ Maintenance & networking included by Tesla
                </div>
              </>
            ) : (
              <>
                <Row label={`L2 Hardware (${site.l2Chargers}×)`} value={fmt(financials.hardwareCostL2)} />
                <Row label={`DCFC Hardware (${site.dcfcChargers}×)`} value={fmt(financials.hardwareCostDcfc)} />
                <Row label="Installation (L2)" value={fmt(financials.installationCostL2)} />
                <Row label="Installation (DCFC)" value={fmt(financials.installationCostDcfc)} />
                {financials.electricalUpgradeNeeded && (
                  <div className="flex items-center gap-1 rounded bg-amber/10 p-1.5 text-xs text-amber">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>Likely transformer upgrade: {fmt(financials.electricalUpgradeCost[0])}–{fmt(financials.electricalUpgradeCost[1])}</span>
                  </div>
                )}
                <Row label="Monthly Electricity" value={fmt(financials.monthlyElectricityCost)} />
                <div className="flex items-center gap-1">
                  <Row label="Monthly Demand Charge" value={fmt(financials.monthlyDemandCharge)} />
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-amber pulse-warning" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Demand charges can represent 30-70% of your electricity bill. This is the #1 hidden cost of EV charging.
                    </TooltipContent>
                  </UITooltip>
                </div>
                <Row label="Monthly Networking" value={fmt(financials.monthlyNetworkingCost)} />
                <Row label="Annual Maintenance" value={fmt(financials.annualMaintenance)} />
              </>
            )}
          </div>
        </div>

        {/* Incentives */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success">
            <Award className="h-3.5 w-3.5" /> Incentives
          </h3>
          <div className="space-y-2">
            {incentives.map((inc) => (
              <div
                key={inc.id}
                className="cursor-pointer rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
                onClick={() => setIncentiveExpanded(incentiveExpanded === inc.id ? null : inc.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {inc.eligible === true && <span className="text-success">✓</span>}
                    {inc.eligible === false && <span className="text-destructive">✗</span>}
                    {inc.eligible === null && <span className="text-muted-foreground">?</span>}
                    <span className="text-xs font-medium">{inc.name}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-primary">{inc.amount}</span>
                </div>
                {incentiveExpanded === inc.id && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{inc.details}</p>
                )}
              </div>
            ))}
            {nrelIncentives.length > 0 && (
              <div className="mt-3">
                <button
                  className="flex w-full items-center gap-1 rounded-lg border border-border bg-muted/50 p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  onClick={() => setShowNrelPrograms(!showNrelPrograms)}
                >
                  {showNrelPrograms ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Additional Programs ({nrelIncentives.length})
                </button>
                {showNrelPrograms && (
                  <div className="mt-2 space-y-1.5 pl-1">
                    {nrelIncentives.map((nrel) => (
                      <div key={nrel.id} className="rounded border border-border bg-muted/30 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-medium text-foreground/80">{nrel.title}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{nrel.type}</p>
                          </div>
                          <a
                            href={`https://afdc.energy.gov/laws/${nrel.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="border-t border-border p-4">
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">15-Year Cumulative Cash Flow</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <ResponsiveContainer width="100%" height={220}>
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
    </div>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-mono text-xs ${highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{value}</span>
  </div>
);



export default FinancialProjection;
