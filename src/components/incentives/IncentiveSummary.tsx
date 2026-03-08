import { DollarSign, Lock } from 'lucide-react';
import type { IncentiveResult } from '@/lib/incentiveCalc';

interface Props {
  result: IncentiveResult;
  grossProjectCost: number;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtK = (n: number) => n >= 1000 ? `$${Math.round(n / 1000).toLocaleString()}K` : fmt(n);

const IncentiveSummary = ({ result, grossProjectCost }: Props) => {
  const activePrograms = result.programs.filter(p => p.programStatus !== 'expired');
  if (activePrograms.length === 0) return null;

  const incentiveHigh = result.confirmedTotal + result.likelyTotal;
  const incentiveLow = result.confirmedTotal;

  return (
    <div className="rounded-xl border border-success/20 bg-success/5 px-5 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 flex-shrink-0">
          <DollarSign className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {activePrograms.length} incentive program{activePrograms.length !== 1 ? 's' : ''} available — est.{' '}
            <span className="text-success">{fmtK(incentiveLow)} – {fmtK(incentiveHigh)}</span>
          </p>
        </div>
      </div>

      {/* Program names only */}
      <div className="flex flex-wrap gap-1.5 ml-[52px]">
        {activePrograms.map(p => (
          <span key={p.id} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground border border-border">
            {p.programName}
          </span>
        ))}
      </div>

      {/* OOP range */}
      <div className="ml-[52px] rounded-lg bg-muted/30 px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          Estimated out-of-pocket:{' '}
          <span className="font-bold text-foreground">
            {result.fullCoveragePossible ? '$0' : fmtK(result.oopFloor)} – {fmtK(result.oopCeiling)}
          </span>
        </p>
        {result.fullCoveragePossible && (
          <p className="text-xs text-success mt-1">
            Incentive coverage may fully offset project costs if all Likely programs are approved.
          </p>
        )}
      </div>

      {/* Upgrade CTA */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-center justify-center ml-[52px]">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Full incentive breakdown, per-program amounts, confidence ratings & application links —{' '}
          <a href="/pricing" className="text-primary underline font-medium">Upgrade to Plus</a>
        </span>
      </div>
    </div>
  );
};

export default IncentiveSummary;
