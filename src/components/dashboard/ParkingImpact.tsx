import { Car, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ParkingAnalysis } from '@/types/chargeScore';

interface Props {
  analysis: ParkingAnalysis;
}

const ParkingImpact = ({ analysis }: Props) => {
  const totalW = analysis.totalSpaces;
  const peakPct = totalW > 0 ? (analysis.peakUsed / totalW) * 100 : 0;
  const stallPct = totalW > 0 ? (analysis.requestedChargers / totalW) * 100 : 0;
  const spotsAfterPeak = analysis.available;
  const exceedsAvailable = analysis.requestedChargers > spotsAfterPeak;

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Car className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Parking Impact</h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-3 w-3 text-muted-foreground/50" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            Shows how your requested charger stalls affect available parking during peak hours. Tesla requires dedicated, signed spots for Supercharger stalls.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-4 p-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-mono text-lg font-bold text-foreground">{analysis.totalSpaces}</p>
            <p className="text-[10px] text-muted-foreground">Total Spots</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-foreground">{analysis.peakUsed}</p>
            <p className="text-[10px] text-muted-foreground">Peak Used ({Math.round(peakPct)}%)</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-primary">{spotsAfterPeak}</p>
            <p className="text-[10px] text-muted-foreground">Available Off-Peak</p>
          </div>
        </div>

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
              className="flex items-center justify-center bg-primary/50 text-[10px] font-medium text-white"
              style={{ width: `${stallPct}%` }}
            >
              {analysis.requestedChargers > 0 && `${analysis.requestedChargers} EV`}
            </div>
            <div
              className="flex items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground"
              style={{ width: `${Math.max(0, 100 - peakPct - stallPct)}%` }}
            >
              {spotsAfterPeak - analysis.requestedChargers > 0 && 'remaining'}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{analysis.totalSpaces} total</span>
          </div>
        </div>

        {/* Stall consumption as % of total */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your {analysis.requestedChargers} stalls consume</span>
          <span className="font-mono font-semibold text-foreground">{stallPct.toFixed(1)}% of total parking</span>
        </div>

        {/* Tesla requirement note */}
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Tesla requirement:</strong> Each Supercharger stall requires a dedicated, signed parking space. Minimum 8 stalls per site recommended. ADA-compliant spaces required per local code.
        </div>

        {/* Warning only if stalls exceed available-after-peak — straightforward math */}
        {exceedsAvailable && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              Your {analysis.requestedChargers} stalls exceed the {spotsAfterPeak} spots available after peak parking.
              This may impact tenant parking during busy hours.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingImpact;
