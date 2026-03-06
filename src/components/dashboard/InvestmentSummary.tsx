import { useState } from 'react';
import { Info, ChevronDown, ChevronRight, ExternalLink, Check, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
  </Tooltip>
);

const LAYER_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
  utility: 'Utility',
};

const LAYER_ORDER: string[] = ['federal', 'state', 'utility'];

const EligibilityBadge = ({ eligible }: { eligible: boolean | null }) => {
  if (eligible === false) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive">
        <X className="h-2.5 w-2.5" /> Not Eligible
      </span>
    );
  }
  if (eligible === null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">
        <AlertTriangle className="h-2.5 w-2.5" /> Verify
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-success">
      <Check className="h-2.5 w-2.5" /> Eligible
    </span>
  );
};

const StatusBadge = ({ status, verified, expiresAt }: { status?: string; verified?: string; expiresAt?: string }) => {
  if (!status && !verified) return null;
  const colors: Record<string, string> = {
    accepting: 'bg-success/10 text-success',
    active: 'bg-success/10 text-success',
    waitlist: 'bg-amber-500/10 text-amber-600',
    closed: 'bg-destructive/10 text-destructive',
    expired: 'bg-destructive/10 text-destructive',
  };
  const labels: Record<string, string> = {
    accepting: 'Accepting',
    active: 'Active',
    waitlist: 'Waitlist',
    closed: 'Closed',
    expired: 'Expired',
  };
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {status && (
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${colors[status] || 'bg-muted text-muted-foreground'}`}>
          {labels[status] || status}
        </span>
      )}
      {expiresAt && expiresAt !== 'ongoing' && (
        <span className="text-[8px] text-muted-foreground/60">exp {expiresAt}</span>
      )}
      {verified && (
        <span className="text-[8px] text-muted-foreground/40">✓ {verified}</span>
      )}
    </div>
  );
};

const IncentiveRow = ({ inc, isAlt }: { inc: Incentive; isAlt: boolean }) => {
  const ineligible = inc.eligible === false;
  const isNrel = inc.id.startsWith('nrel-');
  const nrelId = isNrel ? inc.id.replace('nrel-', '') : null;
  const linkUrl = inc.sourceUrl || (isNrel && nrelId ? `https://afdc.energy.gov/laws/${nrelId}` : null);
  return (
    <div className={`flex items-start justify-between gap-2 rounded-md px-2 py-1.5 ${
      ineligible ? 'bg-muted/30 opacity-60' : isAlt ? 'bg-muted/20' : 'bg-success/5'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-medium ${ineligible ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {isAlt && !ineligible ? `or: ${inc.name}` : inc.name}
          </span>
          <EligibilityBadge eligible={inc.eligible} />
          {linkUrl && (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" title="View program details">
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        <StatusBadge status={inc.programStatus} verified={inc.verified} expiresAt={inc.expiresAt} />
        {inc.details && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 cursor-help leading-relaxed">
                {inc.description}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-xs leading-relaxed">{inc.details}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className={`font-mono text-xs font-semibold whitespace-nowrap mt-0.5 ${
        ineligible ? 'text-muted-foreground line-through' : isAlt ? 'text-muted-foreground' : 'text-success'
      }`}>
        {ineligible ? '$0' : inc.amount}
      </span>
    </div>
  );
};

const InvestmentSummary = ({ financials, incentives, stalls, kwhPerStallPerDay, onStallsChange, onUtilizationChange }: Props) => {
  const [showYear1, setShowYear1] = useState(false);
  const outOfPocket = financials.netInvestment;
  const outOfPocketColor = outOfPocket <= 0
    ? 'text-success'
    : outOfPocket <= 50000
      ? 'text-success'
      : outOfPocket <= 150000
        ? 'text-amber'
        : 'text-destructive';

  const netProfit = financials.annualNetRevenue;
  const monthlyProfit = netProfit / 12;

  // Split incentives: eligible (primary + alternatives), ineligible
  const eligiblePrimary = incentives.filter(i => !i.isAlternative && i.eligible !== false);
  const eligibleAlternatives = incentives.filter(i => i.isAlternative && i.eligible !== false);
  const ineligible = incentives.filter(i => i.eligible === false);

  // Group ALL eligible (primary + alternatives) by layer for display
  const allEligible = [...eligiblePrimary, ...eligibleAlternatives];
  const eligibleByLayer = LAYER_ORDER.map(layer => ({
    layer,
    label: LAYER_LABELS[layer],
    items: allEligible.filter(i => i.category === layer),
  })).filter(g => g.items.length > 0);

  return (
    <div className="glass-card">
      <div className="border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          Investment Summary
        </h2>
      </div>

      <div className="p-4 space-y-3">
        {/* Stalls Slider */}
        {onStallsChange && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center">
                Number of Stalls
                <InfoTip text="How many Tesla V4 Supercharger posts to install. Each stall costs ~$100K (hardware + installation). Minimum 4 for Tesla program." />
              </Label>
              <span className="font-mono text-sm font-bold text-primary">{stalls}</span>
            </div>
            <Slider
              value={[stalls]}
              onValueChange={([v]) => onStallsChange(v)}
              min={4} max={24} step={1}
              className="py-2"
            />
            <p className="text-[10px] text-muted-foreground/60">Drag to adjust — all financials update instantly</p>
          </div>
        )}


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

        {/* ===== INCENTIVES SECTION ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-success flex items-center">
              Less: Incentives
              <InfoTip text="Only eligible, non-overlapping programs are summed. Ineligible and alternative programs are shown separately and NOT included in the total." />
            </span>
            <span className="font-mono text-sm font-bold text-success">({fmt(financials.estimatedIncentives)})</span>
          </div>

          {/* Eligible incentives — these count toward total */}
          {eligibleByLayer.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-success/80 font-semibold">
                ✓ Applied to your project
              </p>
              {eligibleByLayer.map(({ layer, label, items }) => (
                <div key={layer} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 ml-1">{label}</p>
                  {items.map(inc => (
                    <IncentiveRow key={inc.id} inc={inc} isAlt={!!inc.isAlternative} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Ineligible incentives — clearly separated */}
          {ineligible.length > 0 && (
            <div className="space-y-1 border-t border-border/50 pt-2">
              <p className="text-[10px] uppercase tracking-wider text-destructive/70 font-semibold">
                ✗ Not eligible at this site
              </p>
              {ineligible.map(inc => (
                <IncentiveRow key={inc.id} inc={inc} isAlt={false} />
              ))}
            </div>
          )}

        </div>


        {/* Divider */}
        <div className="border-t border-border" />

        {/* Monthly Revenue — HERO NUMBER */}
        <div className="text-center py-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            Estimated Monthly Revenue
            <InfoTip text="Your projected net monthly profit from EV charging after electricity and service fees. Based on your ChargeScore utilization estimate." />
          </span>
          <p className={`font-mono text-4xl font-bold mt-1 ${monthlyProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {fmt(monthlyProfit)}<span className="text-lg font-semibold text-muted-foreground">/mo</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(netProfit)}/yr net profit
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Out-of-Pocket */}
        <div className="text-center py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            Your Out-of-Pocket
            <InfoTip text="What you actually pay after all incentives, credits, and utility programs. This is your real investment." />
          </span>
          <p className={`font-mono text-2xl font-bold mt-1 ${outOfPocketColor}`}>
            {fmt(outOfPocket)}
          </p>
          {outOfPocket <= 0 && (
            <p className="text-xs text-success mt-1">Incentives cover 100% of your project cost.</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Year 1 Revenue & Costs (collapsible) */}
        <button
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 p-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          onClick={() => setShowYear1(!showYear1)}
        >
          <span className="flex items-center gap-1">
            {showYear1 ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Year 1 Revenue & Costs
          </span>
          <span className={`font-mono font-semibold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {fmt(netProfit)}/yr
          </span>
        </button>

        {showYear1 && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center">
                Charging Revenue
                <InfoTip text={`Based on ${Math.round(financials.dailyKwhDcfc)} kWh/day at your retail price. Assumes medium utilization (250 kWh/stall/day).`} />
              </span>
              <span className="font-mono text-sm font-semibold text-success">{fmt(financials.annualRevenue)}/yr</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center">
                  Less: Electricity
                  <InfoTip text="Your utility bill for power consumed. This is a LEVELIZED rate — it already includes demand charges, TOU pricing, and surcharges." />
                </span>
                <span className="font-mono text-sm text-destructive">({fmt(financials.monthlyElectricityCost * 12)})/yr</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 ml-4 mt-0.5">Levelized rate, includes demand charges</p>
            </div>

            {financials.chargingModel === 'tesla' && financials.teslaServiceFeeAnnual > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center">
                  Less: Tesla Service Fee
                  <InfoTip text="Tesla charges $0.10/kWh for network management, payment processing, monitoring, and maintenance. Increases 3% per year." />
                </span>
                <span className="font-mono text-sm text-destructive">({fmt(financials.teslaServiceFeeAnnual)})/yr</span>
              </div>
            )}

            {financials.chargingModel !== 'tesla' && (
              <>
                {financials.monthlyDemandCharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Less: Demand Charges</span>
                    <span className="font-mono text-sm text-destructive">({fmt(financials.monthlyDemandCharge * 12)})/yr</span>
                  </div>
                )}
                {financials.monthlyNetworkingCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Less: Networking</span>
                    <span className="font-mono text-sm text-destructive">({fmt(financials.monthlyNetworkingCost * 12)})/yr</span>
                  </div>
                )}
                {financials.annualMaintenance > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Less: Maintenance</span>
                    <span className="font-mono text-sm text-destructive">({fmt(financials.annualMaintenance)})/yr</span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Net Profit</span>
              <span className={`font-mono text-sm font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netProfit)}/yr</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly to You: <span className="font-mono font-semibold text-foreground">{fmt(monthlyProfit)}/mo</span>
            </p>
          </div>
        )}

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
