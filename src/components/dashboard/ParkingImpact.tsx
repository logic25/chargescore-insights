import { Car, AlertTriangle } from 'lucide-react';
import type { ParkingAnalysis } from '@/types/chargeScore';

interface Props {
  analysis: ParkingAnalysis;
}

const ParkingImpact = ({ analysis }: Props) => {
  const totalW = analysis.totalSpaces;
  const peakPct = totalW > 0 ? (analysis.peakUsed / totalW) * 100 : 0;
  const availPct = totalW > 0 ? (analysis.available / totalW) * 100 : 0;
  const evPct = totalW > 0 ? (analysis.recommendedEv / totalW) * 100 : 0;

  return (
    <div className="glass-card-dark">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Car className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Parking Impact Analysis</h2>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          You have <span className="font-semibold text-foreground">{analysis.totalSpaces}</span> total spaces.
          At <span className="font-semibold text-foreground">{Math.round(peakPct)}%</span> peak utilization,{' '}
          <span className="font-semibold text-primary">{analysis.available}</span> spaces are available for conversion.
        </p>

        {/* Bar Visualization */}
        <div className="space-y-2">
          <div className="flex h-8 w-full overflow-hidden rounded-lg">
            <div
              className="flex items-center justify-center bg-destructive/70 text-[10px] font-medium text-white"
              style={{ width: `${peakPct}%` }}
            >
              {analysis.peakUsed > 0 && `${analysis.peakUsed} used`}
            </div>
            <div
              className="flex items-center justify-center bg-primary/40 text-[10px] font-medium text-white"
              style={{ width: `${evPct}%` }}
            >
              {analysis.recommendedEv > 0 && `${analysis.recommendedEv} EV`}
            </div>
            <div
              className="flex items-center justify-center bg-white/10 text-[10px] font-medium text-muted-foreground"
              style={{ width: `${Math.max(0, availPct - evPct)}%` }}
            >
              buffer
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{analysis.totalSpaces} total</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Recommended max EV charger spots</span>
          <span className="font-mono font-semibold text-primary">{analysis.recommendedEv}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your requested chargers</span>
          <span className="font-mono font-semibold text-foreground">{analysis.requestedChargers}</span>
        </div>

        {analysis.exceedsAvailable && (
          <div className="flex items-center gap-2 rounded-lg bg-amber/10 p-3 text-xs text-amber">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              Adding {analysis.requestedChargers} chargers may impact tenant parking during peak hours.
              Consider reducing to {analysis.recommendedEv} or fewer.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingImpact;
