import { useState } from 'react';
import { Info, ChevronDown, ChevronRight, ExternalLink, Check, X, AlertTriangle, Lock, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialProjection, Incentive } from '@/types/chargeRank';
import type { UserRole } from '@/hooks/useProfile';
import FinancialDisclaimer from './FinancialDisclaimer';

interface Props {
  financials: FinancialProjection;
  incentives: Incentive[];
  stalls: number;
  kwhPerStallPerDay: number;
  onStallsChange?: (stalls: number) => void;
  onUtilizationChange?: (kwh: number) => void;
  userRole?: UserRole | null;
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const pct = (n: number) => {
  if (!isFinite(n)) return '∞';
  return `${n.toFixed(1)}%`;
};

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="ml-1.5 inline-flex text-muted-foreground hover:text-primary transition-colors">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-sm leading-relaxed">{text}</TooltipContent>
  </Tooltip>
);

const LAYER_LABELS: Record<string, string> = { federal: 'Federal', state: 'State', utility: 'Utility' };
const LAYER_ORDER: string[] = ['federal', 'state', 'utility'];

const EligibilityBadge = ({ eligible }: { eligible: boolean | null }) => {
  if (eligible === false) return <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase text-destructive"><X className="h-3 w-3" />No</span>;
  if (eligible === null) return <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-amber-600"><AlertTriangle className="h-3 w-3" />Verify</span>;
  return <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase text-success"><Check className="h-3 w-3" />Yes</span>;
};

const IncentiveRow = ({ inc, isAlt }: { inc: Incentive; isAlt: boolean }) => {
  const ineligible = inc.eligible === false;
  const isNrel = inc.id.startsWith('nrel-');
  const nrelId = isNrel ? inc.id.replace('nrel-', '') : null;
  const linkUrl = inc.sourceUrl || (isNrel && nrelId ? `https://afdc.energy.gov/laws/${nrelId}` : null);
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${ineligible ? 'opacity-50' : isAlt ? 'bg-muted/20' : 'bg-success/5'}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <EligibilityBadge eligible={inc.eligible} />
        <span className={`text-sm truncate ${ineligible ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {isAlt && !ineligible ? `or: ${inc.name}` : inc.name}
        </span>
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 flex-shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {inc.details && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/40 cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-sm leading-relaxed">{inc.details}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className={`font-mono text-sm font-bold whitespace-nowrap ${ineligible ? 'text-muted-foreground line-through' : isAlt ? 'text-muted-foreground' : 'text-success'}`}>
        {ineligible ? '$0' : inc.amount}
      </span>
    </div>
  );
};

const Row = ({ label, value, valueClass = 'text-foreground', tip, indent = false }: { label: string; value: string; valueClass?: string; tip?: string; indent?: boolean }) => (
  <div className={`flex items-center justify-between py-1 ${indent ? 'ml-4' : ''}`}>
    <span className={`text-sm text-muted-foreground flex items-center`}>
      {indent && <span className="mr-1.5 text-muted-foreground/40">└</span>}
      {label}
      {tip && <InfoTip text={tip} />}
    </span>
    <span className={`font-mono text-sm font-bold ${valueClass}`}>{value}</span>
  </div>
);

/** Format CoC / IRR when net investment is $0 (fully incentivized) */
function formatReturnMetric(value: number | null | undefined, netInvestment: number): { display: string; className: string; tip?: string } {
  if (netInvestment <= 0) {
    return { display: '∞', className: 'text-success', tip: 'Fully incentivized — $0 out-of-pocket means infinite return on investment' };
  }
  if (value == null) return { display: '—', className: 'text-muted-foreground' };
  if (!isFinite(value)) return { display: '∞', className: 'text-success' };
  const color = value >= 15 ? 'text-success' : value >= 10 ? 'text-amber-500' : 'text-destructive';
  return { display: `${value.toFixed(1)}%`, className: color };
}

const UpgradeHint = ({ feature }: { feature: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-center justify-center">
    <Lock className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">{feature} — <a href="/pricing" className="text-primary underline font-medium">Upgrade to Plus</a></span>
  </div>
);

const InvestmentSummary = ({ financials, incentives, stalls, userRole }: Props) => {
  const [showIncentives, setShowIncentives] = useState(false);
  const [showYear1, setShowYear1] = useState(false);
  const [showYearByYear, setShowYearByYear] = useState(false);

  const netProfit = financials.annualNetRevenue;
  const outOfPocket = financials.netInvestment;
  const isFullyIncentivized = outOfPocket <= 0;
  const isFree = !userRole || userRole === 'free';
  const isPlus = userRole === 'plus';

  const eligiblePrimary = incentives.filter(i => !i.isAlternative && i.eligible !== false);
  const eligibleAlternatives = incentives.filter(i => i.isAlternative && i.eligible !== false);
  const ineligible = incentives.filter(i => i.eligible === false);
  const allEligible = [...eligiblePrimary, ...eligibleAlternatives];
  const eligibleByLayer = LAYER_ORDER.map(layer => ({
    layer, label: LAYER_LABELS[layer],
    items: allEligible.filter(i => i.category === layer),
  })).filter(g => g.items.length > 0);

  // Sum of all eligible incentives BEFORE cap (for display)
  const rawIncentiveTotal = incentives
    .filter(i => i.eligible !== false && !i.isAlternative)
    .reduce((sum, i) => sum + (i.computedAmount ?? 0), 0);

  const cocMetric = formatReturnMetric(financials.cashOnCashReturn, financials.netInvestment);
  const irr5Metric = formatReturnMetric(financials.irr5Year, financials.netInvestment);
  const irr10Metric = formatReturnMetric(financials.irr10Year, financials.netInvestment);

  return (
    <div className="glass-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
          Investment Summary
        </h2>
      </div>

      <div className="px-5 py-4">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Hero: For free users, show simplified NOI. For plus+, show Owner/MS split */}
            {isFree ? (
              <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
                <div className="text-center">
                  <p className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Annual Net Operating Income</p>
                  <p className={`font-mono text-4xl font-bold tracking-tight mt-1 ${financials.annualNoi >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fmt(financials.annualNoi)}<span className="text-base font-semibold text-muted-foreground">/yr</span>
                  </p>
                </div>
                {isFullyIncentivized && (
                  <div className="mt-3 pt-2 border-t border-border/50 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      <Zap className="h-3 w-3" /> Fully Incentivized — $0 Out-of-Pocket
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-medium">Owner Monthly</p>
                    <p className={`font-mono text-3xl font-bold tracking-tight ${financials.ownerMonthly >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {fmt(financials.ownerMonthly)}<span className="text-sm font-semibold text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-medium">MS Monthly</p>
                    <p className={`font-mono text-3xl font-bold tracking-tight ${financials.msMonthly >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {fmt(financials.msMonthly)}<span className="text-sm font-semibold text-muted-foreground">/mo</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Annual NOI</span>
                  <span className={`font-mono text-lg font-bold ${financials.annualNoi >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fmt(financials.annualNoi)}/yr
                  </span>
                </div>
                {isFullyIncentivized && (
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      <Zap className="h-3 w-3" /> Fully Incentivized — $0 Out-of-Pocket
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Out-of-Pocket</p>
                <p className={`font-mono text-lg font-bold mt-1 ${outOfPocket <= 0 ? 'text-success' : 'text-foreground'}`}>
                  {isFullyIncentivized ? '$0' : fmt(outOfPocket)}
                </p>
                {isFullyIncentivized && (
                  <p className="text-[9px] text-success font-medium">Fully covered</p>
                )}
              </div>
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payback</p>
                <p className="font-mono text-lg font-bold text-foreground mt-1">
                  {isFullyIncentivized
                    ? 'Day 1'
                    : isFinite(financials.paybackYears) && financials.paybackYears < 100
                      ? `${financials.paybackYears}yr`
                      : 'N/A'}
                </p>
                {isFullyIncentivized && (
                  <p className="text-[9px] text-success font-medium">No investment</p>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-xl border border-border px-2 py-3 cursor-help">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">CoC Return</p>
                    <p className={`font-mono text-lg font-bold mt-1 ${cocMetric.className}`}>
                      {cocMetric.display}
                    </p>
                  </div>
                </TooltipTrigger>
                {cocMetric.tip && <TooltipContent className="max-w-xs text-sm">{cocMetric.tip}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-xl border border-border px-2 py-3 cursor-help">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">5-Year IRR</p>
                    <p className={`font-mono text-lg font-bold mt-1 ${irr5Metric.className}`}>
                      {irr5Metric.display}
                    </p>
                  </div>
                </TooltipTrigger>
                {irr5Metric.tip && <TooltipContent className="max-w-xs text-sm">{irr5Metric.tip}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-xl border border-border px-2 py-3 cursor-help">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">10-Year IRR</p>
                    <p className={`font-mono text-lg font-bold mt-1 ${irr10Metric.className}`}>
                      {irr10Metric.display}
                    </p>
                  </div>
                </TooltipTrigger>
                {irr10Metric.tip && <TooltipContent className="max-w-xs text-sm">{irr10Metric.tip}</TooltipContent>}
              </Tooltip>
              <div className="rounded-xl border border-border px-2 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margin/kWh</p>
                <p className={`font-mono text-lg font-bold mt-1 ${financials.marginPerKwh > 0 ? 'text-success' : 'text-destructive'}`}>
                  ${financials.marginPerKwh.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Incentives — collapsible */}
            <button
              className="flex w-full items-center justify-between rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm transition-colors hover:bg-success/10"
              onClick={() => setShowIncentives(!showIncentives)}
            >
              <span className="flex items-center gap-1.5 font-semibold text-success">
                {showIncentives ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Incentives & Credits
              </span>
              <span className="font-mono text-sm font-bold text-success">−{fmt(financials.estimatedIncentives)}</span>
            </button>

            {showIncentives && (
              <div className="space-y-2 pl-1">
                {/* Incentive cap explanation */}
                {rawIncentiveTotal > financials.totalProjectCost && (
                  <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-success">Good news:</span> Total eligible incentives ({fmt(rawIncentiveTotal)}) exceed your project cost ({fmt(financials.totalProjectCost)}), so your out-of-pocket is <span className="font-bold text-success">$0</span>. Incentives are capped at project cost.
                  </div>
                )}
                {isFree ? (
                  <>
                    {/* Free users: teaser only — count + total, no program names */}
                    <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-center space-y-2">
                      <p className="text-sm text-foreground">
                        <span className="font-bold text-success">{allEligible.length} program{allEligible.length !== 1 ? 's' : ''}</span> available — est. <span className="font-bold text-success">{fmt(financials.estimatedIncentives)}</span> in incentives
                      </p>
                      {isFullyIncentivized && (
                        <p className="text-xs text-success font-semibold">This site could be fully incentivized — $0 out-of-pocket!</p>
                      )}
                    </div>
                    <UpgradeHint feature="See program names, amounts & how to apply" />
                  </>
                ) : (
                  <>
                    {eligibleByLayer.map(({ layer, label, items }) => (
                      <div key={layer} className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground/50 ml-2 font-medium">{label}</p>
                        {items.map(inc => (
                          <IncentiveRow key={inc.id} inc={inc} isAlt={!!inc.isAlternative} />
                        ))}
                      </div>
                    ))}
                    {ineligible.length > 0 && (
                      <div className="space-y-1 border-t border-border/50 pt-2">
                        <p className="text-xs uppercase tracking-wider text-destructive/60 ml-2 font-medium">Not eligible</p>
                        {ineligible.map(inc => (
                          <IncentiveRow key={inc.id} inc={inc} isAlt={false} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Costs + Year 1 P&L + Year-by-Year */}
          <div className="space-y-4">
            {/* Project Cost Breakdown */}
            <div className="rounded-xl border border-border bg-muted/10 px-5 py-4 space-y-1">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Project Costs</h3>
              <Row label="Total Project Cost" value={fmt(financials.totalProjectCost)} tip="Cost to buy and install all charging equipment before any incentives." />
              <Row label={`Hardware (${Math.ceil(stalls / 4)} set${Math.ceil(stalls / 4) > 1 ? 's' : ''} × 4 stalls)`} value={fmt(financials.totalHardwareCost)} indent tip="$250,000 per set of 4 (includes V4 posts, V3.5 cabinet, Starlink/LTE, site controller, and commissioning by Tesla)." />
              <Row label="Installation" value={fmt(financials.totalInstallationCost)} indent tip="Site prep, trenching, electrical work. Installation is a separate expense — Tesla provides a construction manager to support your team. Estimated at $15,000/stall." />
              {financials.electricalUpgradeNeeded && (
                <Row label="Electrical Upgrade" value={fmt(financials.electricalUpgradeCost[0])} indent
                  tip={`Your electrical service may need upgrading for ${stalls} stalls. Estimate: ${fmt(financials.electricalUpgradeCost[0])}–${fmt(financials.electricalUpgradeCost[1])}. Set your electrical service in Property Inputs to refine this.`} />
              )}
            </div>

            {/* Year 1 P&L — collapsible (plus+ only) */}
            {isFree ? (
              <UpgradeHint feature="Year 1 P&L breakdown" />
            ) : (
              <>
                <button
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  onClick={() => setShowYear1(!showYear1)}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                    {showYear1 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Year 1 P&L Breakdown
                  </span>
                  <span className={`font-mono text-sm font-bold ${financials.annualNoi >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fmt(financials.annualNoi)}/yr NOI
                  </span>
                </button>

                {showYear1 && (
                  <div className="rounded-xl border border-border bg-muted/10 px-5 py-4 space-y-1">
                    <Row label="Charging Revenue" value={`${fmt(financials.annualRevenue)}/yr`} valueClass="text-success"
                      tip={`Based on ${Math.round(financials.dailyKwhDcfc)} kWh/day at your retail price.`} />
                    <Row label="Less: Electricity" value={`(${fmt(financials.monthlyElectricityCost * 12)})/yr`} valueClass="text-destructive"
                      tip="Levelized rate — includes demand charges, TOU pricing, and surcharges." />
                    {financials.chargingModel === 'tesla' && financials.teslaServiceFeeAnnual > 0 && (
                      <Row label="Less: Tesla Fee" value={`(${fmt(financials.teslaServiceFeeAnnual)})/yr`} valueClass="text-destructive"
                        tip="$0.10/kWh for network management. Increases 3% per year." />
                    )}
                    {financials.chargingModel !== 'tesla' && (
                      <>
                        {financials.monthlyDemandCharge > 0 && (
                          <Row label="Less: Demand" value={`(${fmt(financials.monthlyDemandCharge * 12)})/yr`} valueClass="text-destructive" />
                        )}
                        {financials.monthlyNetworkingCost > 0 && (
                          <Row label="Less: Network" value={`(${fmt(financials.monthlyNetworkingCost * 12)})/yr`} valueClass="text-destructive" />
                        )}
                        {financials.annualMaintenance > 0 && (
                          <Row label="Less: Maintenance" value={`(${fmt(financials.annualMaintenance)})/yr`} valueClass="text-destructive" />
                        )}
                      </>
                    )}
                    <div className="border-t border-border pt-1.5">
                      <Row label="Net Revenue" value={`${fmt(netProfit)}/yr`} valueClass={netProfit >= 0 ? 'text-success' : 'text-destructive'} />
                    </div>
                    <Row label="Less: Insurance" value={`(${fmt(financials.yearByYear[0]?.insurance ?? 0)})/yr`} valueClass="text-destructive" />
                    <Row label="Less: Rent" value={`(${fmt(financials.yearByYear[0]?.rent ?? 0)})/yr`} valueClass="text-destructive" />
                    <div className="border-t border-border pt-1.5">
                      <Row label="NOI" value={`${fmt(financials.annualNoi)}/yr`} valueClass={financials.annualNoi >= 0 ? 'text-success' : 'text-destructive'}
                        tip="Net Operating Income = Revenue − Electricity − Tesla Fee − Insurance − Rent" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Year-by-Year Projection — pro only */}
            {isFree || isPlus ? (
              <UpgradeHint feature={isFree ? 'Distribution table & year-by-year projection' : 'Full year-by-year distribution table'} />
            ) : (
              <>
                <button
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  onClick={() => setShowYearByYear(!showYearByYear)}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                    {showYearByYear ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {financials.yearByYear.length}-Year Distribution Table
                  </span>
                </button>

                {showYearByYear && financials.yearByYear.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/10 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Year</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">NOI</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Owner</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">MS</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cum. Owner</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">CoC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financials.yearByYear.map((row) => (
                          <tr key={row.year} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-1.5 font-mono font-semibold text-foreground">Y{row.year}</td>
                            <td className={`px-3 py-1.5 font-mono text-right ${row.noi >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(row.noi)}</td>
                            <td className={`px-3 py-1.5 font-mono text-right ${row.ownerDist >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(row.ownerDist)}</td>
                            <td className="px-3 py-1.5 font-mono text-right text-primary">{fmt(row.msDist)}</td>
                            <td className={`px-3 py-1.5 font-mono text-right ${row.cumOwner >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(row.cumOwner)}</td>
                            <td className="px-3 py-1.5 font-mono text-right text-foreground">{pct(row.coc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="px-5 pb-4">
          <FinancialDisclaimer compact />
        </div>
      </div>
    </div>
  );
};

export default InvestmentSummary;
