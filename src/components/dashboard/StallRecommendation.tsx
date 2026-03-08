import { useMemo } from 'react';
import { Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { computeStallRecommendation, type LocationType } from '@/lib/waterfallCalc';

interface StallRecommendationProps {
  dailyTraffic: number;
  evAdoptionRate: number;
  totalParkingSpaces: number;
  lotSizeSqFt: number | null;
  nearbyL3Ports: number | null;
  chargeScore: number | null;
  state: string;
  locationType: LocationType;
  onUseRecommendation?: (stalls: number) => void;
}

export default function StallRecommendation({
  dailyTraffic,
  evAdoptionRate,
  totalParkingSpaces,
  lotSizeSqFt,
  nearbyL3Ports,
  chargeScore,
  state,
  locationType,
  onUseRecommendation,
}: StallRecommendationProps) {
  const recommendation = useMemo(() => computeStallRecommendation({
    siteName: '',
    address: '',
    lat: null,
    lng: null,
    state,
    totalParkingSpaces,
    lotSizeSqFt,
    dailyTraffic,
    evAdoptionRate,
    avgChargeTimeMin: 25,
    operatingHours: 16,
    locationType,
    evpinScore: null,
    chargeScore,
    nearbyL3Ports,
  }), [dailyTraffic, evAdoptionRate, totalParkingSpaces, lotSizeSqFt, nearbyL3Ports, chargeScore, state, locationType]);

  const tiers = [
    { label: 'Conservative', stalls: recommendation.conservative, pct: recommendation.parkingPctConservative, color: 'text-muted-foreground' },
    { label: 'Moderate', stalls: recommendation.base, pct: recommendation.parkingPctBase, color: 'text-primary' },
    { label: 'Aggressive', stalls: recommendation.aggressive, pct: recommendation.parkingPctAggressive, color: 'text-accent' },
  ];

  return (
    <div className="glass-card">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-primary" />
            Recommended Stalls
          </h3>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] text-xs">
              Based on daily traffic, EV adoption rate, nearby charging infrastructure, and location type. Rounded to nearest multiple of 4 for Tesla hardware.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tiers.map((tier) => (
            <button
              key={tier.label}
              onClick={() => onUseRecommendation?.(tier.stalls)}
              className="rounded-lg border border-border p-3 text-center hover:bg-muted/50 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{tier.label}</p>
              <p className={`font-mono text-2xl font-bold ${tier.color}`}>{tier.stalls}</p>
              <p className="text-[10px] text-muted-foreground">{tier.pct.toFixed(1)}% of lot</p>
            </button>
          ))}
        </div>

        {!spotsConfirmed && (
          <p className="mt-2 text-[10px] text-amber-500/80 italic">
            ⚠ Parking spots estimated from lot area — confirm via aerial or site visit for accuracy
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>~{Math.round(recommendation.dailySessions)} sessions/day</span>
          <span>250 kWh/stall/day baseline</span>
          <span className={`font-medium ${
            recommendation.confidence === 'High' ? 'text-primary' :
            recommendation.confidence === 'Medium' ? 'text-accent' : 'text-muted-foreground'
          }`}>
            {recommendation.confidence} confidence
          </span>
        </div>
      </div>
    </div>
  );
}
