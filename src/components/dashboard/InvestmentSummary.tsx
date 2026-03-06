import { useState } from 'react';
import { Info, ChevronDown, ChevronRight, ExternalLink, Check, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialProjection, Incentive } from '@/types/chargeScore';

interface Props {
  financials: FinancialProjection;
  incentives: Incentive[];
  stalls: number;
  kwhPerStallPerDay: number;
  onStallsChange?: (stalls: number) => void;
  onUtilizationChange?: (kwh: number) => void;
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="ml-1 inline-flex text-muted-foreground hover:text-primary transition-colors">
        <Info className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
  </Tooltip>
);

const LAYER_LABELS: Record<string, string> = { federal: 'Federal', state: 'State', utility: 'Utility' };
const LAYER_ORDER: string[] = ['federal', 'state', 'utility'];

const EligibilityBadge = ({ eligible }: { eligible: boolean | null }) => {
  if (eligible === false) return <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-destructive"><X className="h-2 w-2" />No</span>;
  if (eligible === null) return <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-amber-600"><AlertTriangle className="h-2 w-2" />Verify</span>;
  return <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-success"><Check className="h-2 w-2" />Yes</span>;
};

const IncentiveRow = ({ inc, isAlt }: { inc: Incentive; isAlt: boolean }) => {
  const ineligible = inc.eligible === false;
  const isNrel = inc.id.startsWith('nrel-');
  const nrelId = isNrel ? inc.id.replace('nrel-', '') : null;
  const linkUrl = inc.sourceUrl || (isNrel && nrelId ? `https://afdc.energy.gov/laws/${nrelId}` : null);
  return (
    <div className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${ineligible ? 'opacity-50' : isAlt ? 'bg-muted/20' : 'bg-success/5'}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <EligibilityBadge eligible={inc.eligible} />
        <span className={`text-[11px] truncate ${ineligible ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {isAlt && !ineligible ? `or: ${inc.name}` : inc.name}
        </span>
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 flex-shrink-0">
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {inc.details && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-2.5 w-2.5 text-muted-foreground/40 cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-xs leading-relaxed">{inc.details}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className={`font-mono text-[11px] font-semibold whitespace-nowrap ${ineligible ? 'text-muted-foreground line-through' : isAlt ? 'text-muted-foreground' : 'text-success'}`}>
        {ineligible ? '$0' : inc.amount}
      </span>
    </div>
  );
};

const Row = ({ label, value, valueClass = 'text-foreground', tip, indent = false }: { label: string; value: string; valueClass?: string; tip?: string; indent?: boolean }) => (
  <div className={`flex items-center justify-between ${indent ? 'ml-3' : ''}`}>
    <span className={`${indent ? 'text-[11px]' : 'text-xs'} text-muted-foreground flex items-center`}>
      {label}
      {tip && <InfoTip text={tip} />}
    </span>
    <span className={`font-mono text-xs font-semibold ${valueClass}`}>{value}</span>
  </div>
);

const InvestmentSummary = ({ financials, incentives, stalls }: Props) => {
  const [showIncentives, setShowIncentives] = useState(false);
  const [showYear1, setShowYear1] = useState(false);

  const netProfit = financials.annualNetRevenue;
  const monthlyProfit = netProfit / 12;
  const outOfPocket = financials.netInvestment;

  const eligiblePrimary = incentives.filter(i => !i.isAlternative && i.eligible !== false);
  const eligibleAlternatives = incentives.filter(i => i.isAlternative && i.eligible !== false);
  const ineligible = incentives.filter(i => i.eligible === false);
  const allEligible = [...eligiblePrimary, ...eligibleAlternatives];
  const eligibleByLayer = LAYER_ORDER.map(layer => ({
    layer, label: LAYER_LABELS[layer],
    items: allEligible.filter(i => i.category === layer),
  })).filter(g => g.items.length > 0);

  return (
    <div className="glass-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          Investment Summary
        </h2>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {/* Hero: Monthly Profit */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Profit</p>
            <p className={`font-mono text-2xl font-bold ${monthlyProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(monthlyProfit)}<span className="text-sm font-semibold text-muted-foreground">/mo</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual</p>
            <p className={`font-mono text-sm font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(netProfit)}/yr
            </p>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border p-2">
            <p className="text-[9px] uppercase text-muted-foreground">Out-of-Pocket</p>
            <p className={`font-mono text-sm font-bold ${outOfPocket <= 0 ? 'text-success' : 'text-foreground'}`}>
              {fmt(outOfPocket)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="text-[9px] uppercase text-muted-foreground">Payback</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {isFinite(financials.paybackYears) && financials.paybackYears < 100
                ? `${financials.paybackYears}yr`
                : 'N/A'}
            </p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="text-[9px] uppercase text-muted-foreground">15yr NPV</p>
            <p className={`font-mono text-sm font-bold ${financials.npv15Year > 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(financials.npv15Year)}
            </p>
          </div>
        </div>

        {/* Project Cost Breakdown */}
        <div className="space-y-1">
          <Row label="Total Project Cost" value={fmt(financials.totalProjectCost)} tip="Cost to buy and install all charging equipment before any incentives." />
          <Row label={`Hardware (${stalls} stalls)`} value={fmt(financials.totalHardwareCost)} indent tip="Tesla V4 Supercharger posts at $50,000 each." />
          <Row label="Installation" value={fmt(financials.totalInstallationCost)} indent tip="Site prep, trenching, electrical work. Tesla High Cost estimate." />
          {financials.electricalUpgradeNeeded && (
            <Row label="Electrical Upgrade" value={fmt(financials.electricalUpgradeCost[0])} indent
              tip={`Your electrical service may need upgrading for ${stalls} stalls. Estimate: ${fmt(financials.electricalUpgradeCost[0])}–${fmt(financials.electricalUpgradeCost[1])}. Set your electrical service in Property Inputs to refine this.`} />
          )}
        </div>

        {/* Incentives — collapsible */}
        <button
          className="flex w-full items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs transition-colors hover:bg-success/10"
          onClick={() => setShowIncentives(!showIncentives)}
        >
          <span className="flex items-center gap-1 font-medium text-success">
            {showIncentives ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Incentives & Credits
          </span>
          <span className="font-mono font-bold text-success">−{fmt(financials.estimatedIncentives)}</span>
        </button>

        {showIncentives && (
          <div className="space-y-1.5 pl-1">
            {eligibleByLayer.map(({ layer, label, items }) => (
              <div key={layer} className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 ml-1">{label}</p>
                {items.map(inc => (
                  <IncentiveRow key={inc.id} inc={inc} isAlt={!!inc.isAlternative} />
                ))}
              </div>
            ))}
            {ineligible.length > 0 && (
              <div className="space-y-0.5 border-t border-border/50 pt-1">
                <p className="text-[9px] uppercase tracking-wider text-destructive/60 ml-1">Not eligible</p>
                {ineligible.map(inc => (
                  <IncentiveRow key={inc.id} inc={inc} isAlt={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Year 1 P&L — collapsible */}
        <button
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs transition-colors hover:bg-muted/50"
          onClick={() => setShowYear1(!showYear1)}
        >
          <span className="flex items-center gap-1 text-muted-foreground">
            {showYear1 ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Year 1 P&L Breakdown
          </span>
          <span className={`font-mono font-semibold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {fmt(netProfit)}/yr
          </span>
        </button>

        {showYear1 && (
          <div className="space-y-1 pl-1">
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
            <div className="border-t border-border pt-1">
              <Row label="Net Profit" value={`${fmt(netProfit)}/yr`} valueClass={netProfit >= 0 ? 'text-success' : 'text-destructive'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentSummary;
