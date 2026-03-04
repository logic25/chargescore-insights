import { useMemo } from 'react';
import { Zap, Wrench, DollarSign, Clock, Settings, Crown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SiteAnalysis, Incentive, TurnkeyProjection } from '@/types/chargeScore';
import { calculateFinancials } from '@/lib/calculations';

interface Props {
  site: SiteAnalysis;
  incentives: Incentive[];
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

function getTurnkeyProjection(site: SiteAnalysis): TurnkeyProjection {
  const stalls = Math.max(4, site.teslaStalls);
  const monthlyLease = stalls <= 4 ? 500 : stalls <= 8 ? 750 : 1000;
  return {
    monthlyLease,
    annualRevenue: monthlyLease * 12,
    investmentRequired: 0,
    maintenanceBy: 'Operator',
    contractYears: 10,
    paybackYears: 0,
    controlsPricing: 'Operator',
  };
}

interface RowData {
  label: string;
  tooltip: string;
  icon: React.ReactNode;
  tesla: string;
  ownerOp: string;
  turnkey: string;
  best: 'tesla' | 'ownerOp' | 'turnkey' | null;
}

const NetworkComparison = ({ site, incentives }: Props) => {
  const teslaSite = useMemo(() => ({ ...site, chargingModel: 'tesla' as const }), [site]);
  const teslaFinancials = useMemo(() => calculateFinancials(teslaSite, incentives), [teslaSite, incentives]);

  const genericSite = useMemo(() => ({ ...site, chargingModel: 'generic' as const }), [site]);
  const genericFinancials = useMemo(() => calculateFinancials(genericSite, incentives), [genericSite, incentives]);

  const turnkey = useMemo(() => getTurnkeyProjection(site), [site]);

  const teslaAnnualNoi = teslaFinancials.annualNetRevenue;
  const genericAnnualNoi = genericFinancials.annualNetRevenue;
  const turnkeyAnnualNoi = turnkey.annualRevenue;

  const incentiveCoverPct = teslaFinancials.totalProjectCost > 0
    ? teslaFinancials.estimatedIncentives / teslaFinancials.totalProjectCost
    : 0;

  const rows: RowData[] = [
    {
      label: 'Hardware / Stall',
      tooltip: 'Cost of the charging hardware per stall before installation. Tesla V4 posts are $50K; ChargePoint/Blink DCFC units run $85–100K; Turnkey operators own the hardware.',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: '$50,000',
      ownerOp: '$85,000–$100,000',
      turnkey: '$0 (operator owns)',
      best: 'turnkey',
    },
    {
      label: 'Install / Stall',
      tooltip: 'Site prep, trenching, electrical, transformer, and labor per stall. Varies widely by site conditions.',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: '$50,000',
      ownerOp: '$40,000–$150,000',
      turnkey: '$0 (operator pays)',
      best: 'turnkey',
    },
    {
      label: 'Who Owns Equipment',
      tooltip: 'Ownership determines who benefits from the asset on your balance sheet and who controls its future.',
      icon: <Settings className="h-3.5 w-3.5" />,
      tesla: 'You own it',
      ownerOp: 'You own it',
      turnkey: 'Operator owns it',
      best: null,
    },
    {
      label: 'Revenue Model',
      tooltip: 'How you earn money. Tesla takes a service fee per kWh; Owner-Operated keeps 100%; Turnkey pays you a fixed lease.',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: 'You keep revenue minus $0.10/kWh Tesla fee',
      ownerOp: 'You keep 100% of revenue',
      turnkey: `Fixed lease: $500–$1,000/mo per stall`,
      best: 'ownerOp',
    },
    {
      label: 'Maintenance',
      tooltip: 'Who handles repairs, uptime monitoring, and part replacement. Tesla includes this; owner-operated is on you (~$1,500/yr per unit).',
      icon: <Wrench className="h-3.5 w-3.5" />,
      tesla: 'Tesla handles ($0 to you)',
      ownerOp: 'You pay ~$1,500/yr per unit',
      turnkey: 'Operator handles',
      best: 'tesla',
    },
    {
      label: 'You Control Pricing?',
      tooltip: 'Whether you set the retail $/kWh price drivers pay. Critical for maximizing revenue in high-demand areas.',
      icon: <Settings className="h-3.5 w-3.5" />,
      tesla: 'Yes — you set the price',
      ownerOp: 'Yes — full control',
      turnkey: 'No — operator sets price',
      best: 'ownerOp',
    },
    {
      label: 'Contract Length',
      tooltip: 'How long you\'re committed. Tesla is 10 years with renewal options; ChargePoint has no lock-in; Turnkey typically 10–15 years.',
      icon: <Clock className="h-3.5 w-3.5" />,
      tesla: '10 years (two 5-yr renewals)',
      ownerOp: 'No lock-in',
      turnkey: '10–15 years',
      best: 'ownerOp',
    },
    {
      label: 'Typical Utilization',
      tooltip: 'How often chargers are in use. Tesla\'s network effect drives higher utilization due to brand recognition and in-car navigation.',
      icon: <Zap className="h-3.5 w-3.5" />,
      tesla: '18–30%',
      ownerOp: '8–20%',
      turnkey: '15–25%',
      best: 'tesla',
    },
    {
      label: 'Incentive Eligible?',
      tooltip: 'Whether you can claim federal/state/utility incentives. Turnkey operators usually claim incentives themselves since they own the equipment.',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: 'Yes — all programs',
      ownerOp: 'Yes — all programs',
      turnkey: 'Usually no (operator claims)',
      best: null,
    },
    {
      label: 'Best For',
      tooltip: 'The ideal use case for each model based on your risk tolerance, capital, and traffic.',
      icon: <Crown className="h-3.5 w-3.5" />,
      tesla: 'Passive income, lowest risk',
      ownerOp: 'Max revenue if high traffic',
      turnkey: 'Zero investment, guaranteed income',
      best: null,
    },
  ];

  // Recommendation logic
  const recommendation = useMemo(() => {
    if (incentiveCoverPct >= 0.8) {
      return {
        text: 'Tesla Supercharger recommended: lowest risk, near-$0 out of pocket with available incentives, highest utilization from Tesla network.',
        highlight: 'tesla' as const,
      };
    }
    if (incentiveCoverPct < 0.5) {
      return {
        text: 'Consider Turnkey Operator if you want zero upfront investment, or Tesla if you can cover the gap. Incentives currently cover less than 50% of project cost.',
        highlight: 'turnkey' as const,
      };
    }
    return {
      text: 'Tesla Supercharger is a strong option with moderate incentive coverage. Owner-Operated (ChargePoint) could maximize revenue if you\'re willing to manage the equipment and have high traffic.',
      highlight: 'tesla' as const,
    };
  }, [incentiveCoverPct]);

  return (
    <div className="glass-card-dark">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Crown className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">Network Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground w-[180px]">Metric</th>
              <th className="p-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Tesla Supercharger</span>
                  <span className="text-[10px] text-muted-foreground">for Business</span>
                </div>
              </th>
              <th className="p-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Owner-Operated</span>
                  <span className="text-[10px] text-muted-foreground">ChargePoint</span>
                </div>
              </th>
              <th className="p-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Settings className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-foreground">Turnkey Operator</span>
                  <span className="text-[10px] text-muted-foreground">EVgo / Blink</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                <td className="p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {row.icon}
                    <span>{row.label}</span>
                    <InfoTip text={row.tooltip} />
                  </div>
                </td>
                <td className={`p-3 text-center text-xs ${row.best === 'tesla' ? 'bg-success/10 font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.tesla}
                </td>
                <td className={`p-3 text-center text-xs ${row.best === 'ownerOp' ? 'bg-success/10 font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.ownerOp}
                </td>
                <td className={`p-3 text-center text-xs ${row.best === 'turnkey' ? 'bg-success/10 font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.turnkey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary mb-1">💡 Recommendation</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{recommendation.text}</p>
        </div>
      </div>
    </div>
  );
};

export default NetworkComparison;
