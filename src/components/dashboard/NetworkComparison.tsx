import { useMemo } from 'react';
import { Zap, Wrench, DollarSign, Clock, Settings, Crown } from 'lucide-react';
import type { FinancialProjection, SiteAnalysis, Incentive, TurnkeyProjection } from '@/types/chargeScore';
import { calculateFinancials } from '@/lib/calculations';

interface Props {
  site: SiteAnalysis;
  incentives: Incentive[];
}

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

function getTurnkeyProjection(site: SiteAnalysis): TurnkeyProjection {
  const stalls = Math.max(4, site.teslaStalls);
  // Turnkey operators typically pay $500-$1,000/month per site as a lease/license fee
  const monthlyLease = stalls <= 4 ? 500 : stalls <= 8 ? 750 : 1000;
  return {
    monthlyLease,
    annualRevenue: monthlyLease * 12,
    investmentRequired: 0,
    maintenanceBy: 'Operator',
    contractYears: 10,
    paybackYears: 0, // immediate — no investment
    controlsPricing: 'Operator',
  };
}

interface RowData {
  label: string;
  icon: React.ReactNode;
  tesla: string;
  ownerOp: string;
  turnkey: string;
  best: 'tesla' | 'ownerOp' | 'turnkey' | null;
}

const NetworkComparison = ({ site, incentives }: Props) => {
  // Calculate Tesla financials
  const teslaSite = useMemo(() => ({ ...site, chargingModel: 'tesla' as const }), [site]);
  const teslaFinancials = useMemo(() => calculateFinancials(teslaSite, incentives), [teslaSite, incentives]);

  // Calculate owner-operated (generic) financials
  const genericSite = useMemo(() => ({ ...site, chargingModel: 'generic' as const }), [site]);
  const genericFinancials = useMemo(() => calculateFinancials(genericSite, incentives), [genericSite, incentives]);

  // Calculate turnkey
  const turnkey = useMemo(() => getTurnkeyProjection(site), [site]);

  const teslaAnnualNoi = teslaFinancials.annualNetRevenue;
  const genericAnnualNoi = genericFinancials.annualNetRevenue;
  const turnkeyAnnualNoi = turnkey.annualRevenue; // pure profit, no costs

  const rows: RowData[] = [
    {
      label: 'Investment Required',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: fmt(teslaFinancials.netInvestment),
      ownerOp: fmt(genericFinancials.netInvestment),
      turnkey: '$0',
      best: 'turnkey',
    },
    {
      label: 'Who Handles Maintenance',
      icon: <Wrench className="h-3.5 w-3.5" />,
      tesla: 'Tesla',
      ownerOp: 'You',
      turnkey: 'Operator',
      best: 'tesla',
    },
    {
      label: 'Monthly Revenue to Owner',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: fmt(teslaFinancials.monthlyRevenue - teslaFinancials.totalAnnualOperatingCost / 12),
      ownerOp: fmt(genericFinancials.monthlyRevenue - genericFinancials.totalAnnualOperatingCost / 12),
      turnkey: fmt(turnkey.monthlyLease),
      best: (() => {
        const tM = teslaFinancials.monthlyRevenue - teslaFinancials.totalAnnualOperatingCost / 12;
        const gM = genericFinancials.monthlyRevenue - genericFinancials.totalAnnualOperatingCost / 12;
        const tkM = turnkey.monthlyLease;
        if (tM >= gM && tM >= tkM) return 'tesla';
        if (gM >= tM && gM >= tkM) return 'ownerOp';
        return 'turnkey';
      })(),
    },
    {
      label: 'Annual NOI to Owner',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      tesla: fmt(teslaAnnualNoi),
      ownerOp: fmt(genericAnnualNoi),
      turnkey: fmt(turnkeyAnnualNoi),
      best: (() => {
        if (teslaAnnualNoi >= genericAnnualNoi && teslaAnnualNoi >= turnkeyAnnualNoi) return 'tesla';
        if (genericAnnualNoi >= teslaAnnualNoi && genericAnnualNoi >= turnkeyAnnualNoi) return 'ownerOp';
        return 'turnkey';
      })(),
    },
    {
      label: 'Contract Length',
      icon: <Clock className="h-3.5 w-3.5" />,
      tesla: '10 years',
      ownerOp: 'None (you own)',
      turnkey: `${turnkey.contractYears} years`,
      best: 'ownerOp',
    },
    {
      label: 'Payback Period',
      icon: <Clock className="h-3.5 w-3.5" />,
      tesla: isFinite(teslaFinancials.paybackYears) ? `${teslaFinancials.paybackYears} years` : 'N/A',
      ownerOp: isFinite(genericFinancials.paybackYears) ? `${genericFinancials.paybackYears} years` : 'N/A',
      turnkey: 'Immediate',
      best: 'turnkey',
    },
    {
      label: 'Who Controls Pricing',
      icon: <Settings className="h-3.5 w-3.5" />,
      tesla: 'Tesla',
      ownerOp: 'You',
      turnkey: 'Operator',
      best: 'ownerOp',
    },
  ];

  return (
    <div className="glass-card-dark">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Crown className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Network Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground" />
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
                  <span className="text-[10px] text-muted-foreground">ChargePoint / Blink</span>
                </div>
              </th>
              <th className="p-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Settings className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-foreground">Turnkey Operator</span>
                  <span className="text-[10px] text-muted-foreground">$0 investment</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                <td className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {row.icon}
                    {row.label}
                  </div>
                </td>
                <td className={`p-3 text-center font-mono text-xs ${row.best === 'tesla' ? 'font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.tesla}
                </td>
                <td className={`p-3 text-center font-mono text-xs ${row.best === 'ownerOp' ? 'font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.ownerOp}
                </td>
                <td className={`p-3 text-center font-mono text-xs ${row.best === 'turnkey' ? 'font-semibold text-success' : 'text-foreground/80'}`}>
                  {row.turnkey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/10 p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Turnkey operators (e.g., Volta, EV Connect) install and manage chargers at no cost to the property owner in exchange for a long-term site license. Monthly lease payments vary by location and traffic. Owner-operated assumes you purchase and manage ChargePoint or Blink hardware directly.
        </p>
      </div>
    </div>
  );
};

export default NetworkComparison;
