import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialProjection, Incentive } from '@/types/chargeScore';

interface Props {
  financials: FinancialProjection;
  incentives: Incentive[];
  stalls: number;
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="ml-1 inline-flex text-muted-foreground hover:text-primary transition-colors">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
  </Tooltip>
);

const InvestmentSummary = ({ financials, incentives, stalls }: Props) => {
  const outOfPocket = financials.netInvestment;
  const outOfPocketColor = outOfPocket <= 0
    ? 'text-success'
    : outOfPocket <= 50000
      ? 'text-success'
      : outOfPocket <= 150000
        ? 'text-amber'
        : 'text-destructive';

  const eligibleIncentives = incentives.filter(i => i.eligible);

  return (
    <div className="glass-card-dark">
      <div className="border-b border-white/10 p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          Investment Summary
        </h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Total Project Cost */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              Total Project Cost
              <InfoTip text="Cost to buy and install all charging equipment before any incentives." />
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">{fmt(financials.totalProjectCost)}</span>
          </div>
          <div className="ml-4 mt-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/80 flex items-center">
                ├─ Hardware ({stalls} stalls)
                <InfoTip text="Tesla V4 Supercharger posts at $50,000 each. Includes cabinet, connectivity, and commissioning." />
              </span>
              <span className="font-mono text-xs text-muted-foreground">{fmt(financials.totalHardwareCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/80 flex items-center">
                └─ Installation
                <InfoTip text="Site prep, trenching, electrical work, transformer, and labor. Based on Tesla's High Cost estimate." />
              </span>
              <span className="font-mono text-xs text-muted-foreground">{fmt(financials.totalInstallationCost)}</span>
            </div>
          </div>
        </div>

        {/* Incentives */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-success flex items-center">
              Less: Incentives
              <InfoTip text="Federal, state, and utility programs that reduce your project cost. Eligibility verified per program." />
            </span>
            <span className="font-mono text-sm font-semibold text-success">({fmt(financials.estimatedIncentives)})</span>
          </div>
          {eligibleIncentives.length > 0 && (
            <div className="ml-4 mt-1 space-y-0.5">
              {eligibleIncentives.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/70">├─ {inc.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">{inc.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/20" />

        {/* Out-of-Pocket — HERO NUMBER */}
        <div className="text-center py-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            Your Out-of-Pocket
            <InfoTip text="What you actually pay after all incentives, credits, and utility programs. This is your real investment." />
          </span>
          <p className={`font-mono text-4xl font-bold mt-1 ${outOfPocketColor}`}>
            {fmt(outOfPocket)}
          </p>
          {outOfPocket <= 0 && (
            <p className="text-xs text-success mt-1">Incentives cover 100% of your project cost.</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Bottom metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted-foreground flex items-center">
              Payback Period
              <InfoTip text="Years until cumulative profits exceed your out-of-pocket cost. After this, every dollar is profit." />
            </span>
            <p className="font-mono text-lg font-bold text-foreground mt-0.5">
              {isFinite(financials.paybackYears) && financials.paybackYears < 100
                ? `${financials.paybackYears} year${financials.paybackYears !== 1 ? 's' : ''}`
                : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground flex items-center justify-end">
              15-Year NPV
              <InfoTip text="Total value of all future profits, discounted at 8% per year. Positive = beats an 8% annual return." />
            </span>
            <p className={`font-mono text-lg font-bold mt-0.5 ${financials.npv15Year > 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(financials.npv15Year)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentSummary;
