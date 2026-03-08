import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { IncentiveResult, IncentiveProgram } from '@/lib/incentiveCalc';

interface Props {
  result: IncentiveResult;
  grossProjectCost: number;
  stallCount: number;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtK = (n: number) => n >= 1000 ? `$${Math.round(n / 1000).toLocaleString()}K` : fmt(n);

const CONFIDENCE_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  confirmed: { dot: '●', badge: 'bg-success/10 text-success border-success/20', label: 'Confirmed' },
  likely: { dot: '◐', badge: 'bg-accent/10 text-accent-foreground border-accent/30', label: 'Likely' },
  uncertain: { dot: '○', badge: 'bg-muted text-muted-foreground border-border', label: 'Uncertain' },
};

function isStaleLe(updatedAt: string): boolean {
  const age = Date.now() - new Date(updatedAt).getTime();
  return age > 90 * 24 * 60 * 60 * 1000;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatAmount(p: IncentiveProgram, stallCount: number): string {
  if (p.programStatus === 'expired') return '$0 (expired)';
  if (p.amountPerPort && p.amountFlat) {
    return `${fmt(p.computedAmount)} (${stallCount} × ${fmt(p.amountPerPort)}/port + ${fmt(p.amountFlat)} flat)`;
  }
  if (p.amountPerPort) {
    const capped = p.amountCap && p.amountPerPort * stallCount > p.amountCap;
    return `${fmt(p.computedAmount)} (${stallCount} ports × ${fmt(p.amountPerPort)}/port${capped ? ', capped' : ''})`;
  }
  if (p.amountFlat) {
    return `${fmt(p.computedAmount)} (flat estimate — varies by project)`;
  }
  if (p.amountCap) {
    return `up to ${fmt(p.amountCap)} (competitive, varies)`;
  }
  return fmt(p.computedAmount);
}

const ProgramCard = ({ program, stallCount }: { program: IncentiveProgram; stallCount: number }) => {
  const isExpired = program.programStatus === 'expired';
  const conf = CONFIDENCE_STYLES[program.confidence] || CONFIDENCE_STYLES.uncertain;
  const stale = !isExpired && isStaleLe(program.updatedAt);

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-1.5 ${isExpired ? 'border-destructive/20 bg-destructive/5 opacity-60' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${isExpired ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {program.programName}
        </span>
        {isExpired ? (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive border border-destructive/20">
            Expired
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${conf.badge}`}>
            <span className="text-[10px]">{conf.dot}</span> {conf.label}
          </span>
        )}
      </div>

      <p className={`font-mono text-sm font-bold ${isExpired ? 'line-through text-muted-foreground' : 'text-success'}`}>
        {formatAmount(program, stallCount)}
      </p>

      {program.notes && (
        <p className="text-xs text-muted-foreground leading-relaxed">{program.notes}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {program.administrator && (
          <span>Administrator: <span className="font-medium text-foreground">{program.administrator}</span></span>
        )}
        {stale ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-accent-foreground flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                Last verified: {formatDate(program.updatedAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Data may be outdated — last verified over 90 days ago</TooltipContent>
          </Tooltip>
        ) : (
          <span>Last verified: {formatDate(program.updatedAt)}</span>
        )}
      </div>

      {!isExpired && program.applicationUrl && (
        <a
          href={program.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Apply <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

const IncentiveBreakdown = ({ result, grossProjectCost, stallCount }: Props) => {
  const active = result.programs.filter(p => p.programStatus !== 'expired');
  const expired = result.programs.filter(p => p.programStatus === 'expired');

  return (
    <div className="space-y-3">
      {/* Program cards */}
      {active.map(p => (
        <ProgramCard key={p.id} program={p} stallCount={stallCount} />
      ))}

      {expired.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-xs uppercase tracking-wider text-destructive/60 font-medium">No longer available</p>
          {expired.map(p => (
            <ProgramCard key={p.id} program={p} stallCount={stallCount} />
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border border-border bg-muted/10 px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Confirmed + Likely</span>
          <span className="font-mono font-bold text-success">{fmt(result.confirmedTotal + result.likelyTotal)}</span>
        </div>
        {result.uncertainTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uncertain (not included in estimate)</span>
            <span className="font-mono font-bold text-muted-foreground">{fmtK(result.uncertainRange.low)} – {fmtK(result.uncertainRange.high)}</span>
          </div>
        )}
        <div className="border-t border-border/50 pt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Gross project cost</span>
          <span className="font-mono font-bold text-foreground">{fmt(grossProjectCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">Estimated out-of-pocket</span>
          <span className="font-mono font-bold text-foreground">
            {result.fullCoveragePossible ? '$0' : fmtK(result.oopFloor)} – {fmtK(result.oopCeiling)}
          </span>
        </div>
        {result.fullCoveragePossible && (
          <p className="text-xs text-success leading-relaxed">
            ⚠️ Incentive coverage may fully offset project costs if all Likely programs are approved. Actual amounts depend on application outcomes.
          </p>
        )}
      </div>
    </div>
  );
};

export default IncentiveBreakdown;
