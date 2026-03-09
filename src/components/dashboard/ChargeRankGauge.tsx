import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, CheckCircle2, Zap, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ChargeRankResult, ScoreFactor } from '@/lib/scoring';

export interface SiteInsights {
  floodZone: string | null;
  isHighRisk: boolean;
  highwayDistance: number | null;
  highwayName: string | null;
  utilityName: string | null;
  isDAC: boolean;
  isOnCorridor: boolean;
}

export interface IncentiveTeaser {
  programCount: number;
  totalEstimate: number;
  outOfPocket: number;
}

interface ChargeRankGaugeProps {
  score: ChargeRankResult;
  siteInsights?: SiteInsights;
  incentiveTeaser?: IncentiveTeaser;
}

const fmt = (n: number) => n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;

const ChargeScoreGauge = ({ score, siteInsights, incentiveTeaser }: ChargeScoreGaugeProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    setDisplayScore(0);
    let frame: number;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score.totalScore));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score.totalScore]);

  const circumference = 2 * Math.PI * 70;
  const progress = (displayScore / 100) * circumference * 0.75;
  const scoreColor =
    displayScore >= 70 ? 'hsl(163, 100%, 42%)' :
    displayScore >= 45 ? 'hsl(45, 97%, 56%)' :
    'hsl(0, 84%, 60%)';

  const barColor = (val: number) =>
    val >= 70 ? 'bg-primary' : val >= 40 ? 'bg-accent' : 'bg-destructive';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <h2 className="font-heading text-base font-bold text-foreground">ChargeScore™</h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm">
            ChargeScore rates this location from 0-100 based on 9 factors: traffic, EV density, competition, dwell time, amenities, parking, grid capacity, incentive eligibility, and demand overflow. Higher is better.
          </TooltipContent>
        </Tooltip>
        {score.grade && (
          <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-base font-bold text-primary">
            {score.grade}
          </span>
        )}
      </div>

      <div className="flex items-start gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="150" height="150" viewBox="0 0 160 160">
            <circle
              cx="80" cy="80" r="70" fill="none" stroke="currentColor"
              className="text-border" strokeWidth="10"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              strokeLinecap="round" transform="rotate(135 80 80)"
            />
            <circle
              cx="80" cy="80" r="70" fill="none" stroke={scoreColor}
              strokeWidth="10"
              strokeDasharray={`${progress} ${circumference - progress}`}
              strokeLinecap="round" transform="rotate(135 80 80)"
              style={{ transition: 'stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold" style={{ color: scoreColor }}>
              {displayScore}
            </span>
            <span className="text-xs text-muted-foreground">out of 100</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="flex-1 space-y-1.5">
          {score.factors.map((factor: ScoreFactor) => (
            <div key={factor.name} className="group flex items-center gap-2">
              <div className="flex w-[180px] items-center gap-1 flex-shrink-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{factor.name}</span>
                <span className="text-xs text-muted-foreground/60">({Math.round(factor.weight * 100)}%)</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[300px] text-sm">
                    <p className="font-medium mb-1">{factor.name}</p>
                    <p className="text-muted-foreground">{factor.tooltip}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Data: {factor.dataSource}</p>
                    <p className="text-xs text-primary">{factor.rawValue}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-2 w-[120px] flex-shrink-0 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(factor.score)}`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <span className="w-7 text-right font-mono text-xs font-semibold text-muted-foreground">{factor.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Site Insights badges */}
      {siteInsights && (
        <div className="mt-5 flex flex-wrap gap-2">
          {siteInsights.floodZone && (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              siteInsights.isHighRisk 
                ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {siteInsights.isHighRisk ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              Flood Zone {siteInsights.floodZone}
            </span>
          )}
          {siteInsights.highwayDistance !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border border-border">
              <MapPin className="h-3 w-3" />
              {siteInsights.highwayDistance} mi to {siteInsights.highwayName || 'highway'}
            </span>
          )}
          {siteInsights.utilityName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border border-border">
              <Zap className="h-3 w-3" />
              {siteInsights.utilityName}
            </span>
          )}
          {siteInsights.isDAC && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 text-accent-foreground px-3 py-1 text-xs font-medium border border-accent/30">
              <CheckCircle2 className="h-3 w-3" />
              Disadvantaged Community
            </span>
          )}
          {siteInsights.isOnCorridor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium border border-primary/20">
              <CheckCircle2 className="h-3 w-3" />
              NEVI Corridor
            </span>
          )}
        </div>
      )}

      {/* Incentive Teaser */}
      {incentiveTeaser && incentiveTeaser.programCount > 0 && (
        <div className="mt-5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 flex-shrink-0">
            <Zap className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {incentiveTeaser.programCount} incentive program{incentiveTeaser.programCount !== 1 ? 's' : ''} available
            </p>
            <p className="text-xs text-muted-foreground">
              Est. <span className="font-bold text-success">{fmt(incentiveTeaser.totalEstimate)}</span> in incentives
              {incentiveTeaser.outOfPocket <= 0 && (
                <span> — <span className="font-bold text-success">$0 out-of-pocket</span></span>
              )}
            </p>
          </div>
        </div>
      )}

      <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{score.recommendation}</p>
    </motion.div>
  );
};

export default ChargeScoreGauge;
