import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ChargeScoreBreakdown } from '@/types/chargeScore';

interface ChargeScoreGaugeProps {
  score: ChargeScoreBreakdown;
}

const ChargeScoreGauge = ({ score }: ChargeScoreGaugeProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    setDisplayScore(0);
    let frame: number;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score.total));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score.total]);

  const circumference = 2 * Math.PI * 70;
  const progress = (displayScore / 100) * circumference * 0.75; // 270 degrees
  const scoreColor =
    displayScore >= 70 ? 'hsl(163, 100%, 42%)' :
    displayScore >= 45 ? 'hsl(45, 97%, 56%)' :
    'hsl(0, 84%, 60%)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-dark p-6"
    >
      <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">ChargeScore™</h2>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background arc */}
            <circle
              cx="80" cy="80" r="70"
              fill="none"
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="10"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
            />
            {/* Score arc */}
            <circle
              cx="80" cy="80" r="70"
              fill="none"
              stroke={scoreColor}
              strokeWidth="10"
              strokeDasharray={`${progress} ${circumference - progress}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
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

        {/* Breakdown */}
        <div className="flex-1 space-y-1.5">
          {[
            { label: 'Competition Gap', value: score.competitionGap, weight: '30%' },
            { label: 'Traffic Indicator', value: score.trafficIndicator, weight: '25%' },
            { label: 'Electrical Feasibility', value: score.electricalFeasibility, weight: '20%' },
            { label: 'Incentive Availability', value: score.incentiveAvailability, weight: '15%' },
            { label: 'EV Adoption', value: score.evAdoption, weight: '10%' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-28 text-xs text-muted-foreground">{item.label}</span>
              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{score.verdict}</p>
    </motion.div>
  );
};

export default ChargeScoreGauge;
