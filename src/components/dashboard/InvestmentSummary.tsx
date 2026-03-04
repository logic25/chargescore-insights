import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { FinancialProjection, Incentive } from '@/types/chargeScore';

interface Props {
  financials: FinancialProjection;
  incentives: Incentive[];
  stalls: number;
  onStallsChange?: (stalls: number) => void;
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

const InvestmentSummary = ({ financials, incentives, stalls, onStallsChange }: Props) => {
  const outOfPocket = financials.netInvestment;
  const outOfPocketColor = outOfPocket <= 0
    ? 'text-success'
    : outOfPocket <= 50000
      ? 'text-success'
      : outOfPocket <= 150000
        ? 'text-amber'
        : 'text-destructive';

  // Group incentives by layer
  const incentivesByLayer = LAYER_ORDER.map(layer => ({
    layer,
    label: LAYER_LABELS[layer],
    items: incentives.filter(i => i.category === layer),
  })).filter(g => g.items.length > 0);

  return (
    <div className="glass-card">
      <div className="border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          Investment Summary
        </h2>
      </div>

      <div className="p-5 space-y-4">
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
              min={4} max={12} step={1}
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

        {/* Incentives by Layer */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-success flex items-center">
              Less: Incentives
              <InfoTip text="Federal, state, and utility programs that reduce your project cost. Programs stack — in states like NY and CA, incentives can cover 100% of costs." />
            </span>
            <span className="font-mono text-sm font-semibold text-success">({fmt(financials.estimatedIncentives)})</span>
          </div>
          <div className="ml-4 mt-2 space-y-2">
            {incentivesByLayer.map(({ layer, label, items }) => (
              <div key={layer}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{label}</p>
                {items.map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-muted-foreground/70 flex items-center">
                      ├─ {inc.name}
                      {inc.eligible === null && <span className="ml-1 text-[9px] text-amber">(verify)</span>}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground/70">{inc.amount}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

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
        <div className="border-t border-border" />

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
