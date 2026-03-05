import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, CheckCircle2, Zap, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ChargeScoreResult, ScoreFactor } from '@/lib/scoring';

export interface SiteInsights {
  floodZone: string | null;
  isHighRisk: boolean;
  highwayDistance: number | null;
  highwayName: string | null;
  utilityName: string | null;
  isDAC: boolean;
  isOnCorridor: boolean;
}

interface ChargeScoreGaugeProps {
  score: ChargeScoreResult;
  siteInsights?: SiteInsights;
}

const ChargeScoreGauge = ({ score, siteInsights }: ChargeScoreGaugeProps) => {
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
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">ChargeScore™</h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            ChargeScore rates this location from 0-100 based on 9 factors: traffic, EV density, competition, dwell time, amenities, parking, grid capacity, incentive eligibility, and demand overflow. Higher is better.
          </TooltipContent>
        </Tooltip>
        {score.grade && (
          <span className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-sm font-bold text-primary">
            {score.grade}
          </span>
        )}
      </div>

      <div className="flex items-start gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 160 160">
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
            <span className="font-mono text-3xl font-bold" style={{ color: scoreColor }}>
              {displayScore}
            </span>
            <span className="text-[10px] text-muted-foreground">out of 100</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="flex-1 space-y-1">
          {score.factors.map((factor: ScoreFactor) => (
            <div key={factor.name} className="group flex items-center gap-1.5">
              <div className="flex w-[120px] items-center gap-1 flex-shrink-0">
                <span className="truncate text-[11px] text-muted-foreground">{factor.name}</span>
                <span className="text-[9px] text-muted-foreground/60">({Math.round(factor.weight * 100)}%)</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[280px] text-xs">
                    <p className="font-medium mb-1">{factor.name}</p>
                    <p className="text-muted-foreground">{factor.tooltip}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">Data: {factor.dataSource}</p>
                    <p className="text-[10px] text-primary">{factor.rawValue}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(factor.score)}`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <span className="w-6 text-right font-mono text-[10px] text-muted-foreground">{factor.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Site Insights badges */}
      {siteInsights && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {siteInsights.floodZone && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              siteInsights.isHighRisk 
                ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {siteInsights.isHighRisk ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
              Flood Zone {siteInsights.floodZone}
            </span>
          )}
          {siteInsights.highwayDistance !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
              <MapPin className="h-2.5 w-2.5" />
              {siteInsights.highwayDistance} mi to {siteInsights.highwayName || 'highway'}
            </span>
          )}
          {siteInsights.utilityName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
              <Zap className="h-2.5 w-2.5" />
              {siteInsights.utilityName}
            </span>
          )}
          {siteInsights.isDAC && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 text-accent-foreground px-2 py-0.5 text-[10px] font-medium border border-accent/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Disadvantaged Community
            </span>
          )}
          {siteInsights.isOnCorridor && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium border border-primary/20">
              <CheckCircle2 className="h-2.5 w-2.5" />
              NEVI Corridor
            </span>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{score.recommendation}</p>
    </motion.div>
  );
};

export default ChargeScoreGauge;
