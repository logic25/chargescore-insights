import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  grossCost: number;
  confirmedTotal: number;
  likelyTotal: number;
  uncertainTotal: number;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

const OOPRangeBar = ({ grossCost, confirmedTotal, likelyTotal, uncertainTotal }: Props) => {
  if (grossCost <= 0) return null;

  const total = grossCost;
  const confirmedPct = Math.min((confirmedTotal / total) * 100, 100);
  const likelyPct = Math.min((likelyTotal / total) * 100, 100 - confirmedPct);
  const uncertainPct = Math.min((uncertainTotal / total) * 100, 100 - confirmedPct - likelyPct);
  const oopPct = Math.max(0, 100 - confirmedPct - likelyPct);

  // Clamp for display
  const coveredPct = confirmedPct + likelyPct;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Cost Coverage Breakdown</p>

      {/* Bar */}
      <div className="h-8 w-full rounded-full overflow-hidden flex bg-muted/30 border border-border">
        {confirmedPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full bg-success transition-all duration-500 flex items-center justify-center"
                style={{ width: `${confirmedPct}%` }}
              >
                {confirmedPct > 12 && <span className="text-[10px] font-bold text-success-foreground">Confirmed</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Confirmed incentives: {fmt(confirmedTotal)}
            </TooltipContent>
          </Tooltip>
        )}
        {likelyPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full bg-accent transition-all duration-500 flex items-center justify-center"
                style={{ width: `${likelyPct}%` }}
              >
                {likelyPct > 10 && <span className="text-[10px] font-bold text-accent-foreground">Likely</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Likely incentives: {fmt(likelyTotal)}
            </TooltipContent>
          </Tooltip>
        )}
        {uncertainPct > 2 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full bg-muted transition-all duration-500 flex items-center justify-center border-l border-border"
                style={{ width: `${uncertainPct}%` }}
              >
                {uncertainPct > 10 && <span className="text-[10px] font-medium text-muted-foreground">Uncertain</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Uncertain incentives: {fmt(uncertainTotal)} (not included in OOP estimate)
            </TooltipContent>
          </Tooltip>
        )}
        {oopPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full bg-destructive/15 transition-all duration-500 flex items-center justify-center border-l border-border"
                style={{ width: `${oopPct}%` }}
              >
                {oopPct > 12 && <span className="text-[10px] font-bold text-destructive">You Pay</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Estimated out-of-pocket: {fmt(Math.max(0, grossCost - confirmedTotal - likelyTotal))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-success" />
          <span className="text-muted-foreground">Confirmed <span className="font-mono font-bold text-foreground">{fmt(confirmedTotal)}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-muted-foreground">Likely <span className="font-mono font-bold text-foreground">{fmt(likelyTotal)}</span></span>
        </div>
        {uncertainTotal > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-muted border border-border" />
            <span className="text-muted-foreground">Uncertain <span className="font-mono font-bold text-foreground">{fmt(uncertainTotal)}</span></span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/30" />
          <span className="text-muted-foreground">Out-of-Pocket <span className="font-mono font-bold text-foreground">{fmt(Math.max(0, grossCost - confirmedTotal - likelyTotal))}</span></span>
        </div>
      </div>
    </div>
  );
};

export default OOPRangeBar;
