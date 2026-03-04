import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FinancialProjection } from '@/types/chargeScore';

interface Props {
  financials: FinancialProjection;
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

const RevenueCosts = ({ financials }: Props) => {
  const netProfit = financials.annualNetRevenue;
  const monthlyProfit = netProfit / 12;

  return (
    <div className="glass-card">
      <div className="border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
          Year 1 Revenue & Costs
        </h2>
      </div>

      <div className="p-4 space-y-2.5">
        {/* Revenue */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center">
            Charging Revenue
            <InfoTip text={`Based on ${Math.round(financials.dailyKwhDcfc)} kWh/day at your retail price. Assumes medium utilization (250 kWh/stall/day).`} />
          </span>
          <span className="font-mono text-sm font-semibold text-success">{fmt(financials.annualRevenue)}/yr</span>
        </div>

        {/* Electricity */}
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

        {/* Tesla Service Fee */}
        {financials.chargingModel === 'tesla' && financials.teslaServiceFeeAnnual > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              Less: Tesla Service Fee
              <InfoTip text="Tesla charges $0.10/kWh for network management, payment processing, monitoring, and maintenance. Increases 3% per year." />
            </span>
            <span className="font-mono text-sm text-destructive">({fmt(financials.teslaServiceFeeAnnual)})/yr</span>
          </div>
        )}

        {/* Generic model costs */}
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

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Net Profit — BIG */}
        <div className="text-center py-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Net Profit</span>
          <p className={`font-mono text-2xl font-bold mt-0.5 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {fmt(netProfit)}/yr
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly to You: <span className="font-mono font-semibold text-foreground">{fmt(monthlyProfit)}/mo</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueCosts;
