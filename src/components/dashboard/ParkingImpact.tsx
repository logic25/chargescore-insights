import { Car, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { PropertyType } from '@/types/chargeScore';

interface Props {
  totalSpaces: number;
  stalls: number;
  propertyType: PropertyType;
  peakUtilization: number;
  onPeakUtilizationChange: (val: number) => void;
}

const PEAK_PRESETS: Record<string, { label: string; value: number }[]> = {
  'shopping-center': [
    { label: 'Normal', value: 55 },
    { label: 'Weekend', value: 75 },
    { label: 'Holiday', value: 92 },
  ],
  'strip-retail': [
    { label: 'Normal', value: 50 },
    { label: 'Weekend', value: 70 },
    { label: 'Holiday', value: 88 },
  ],
  'office-park': [
    { label: 'Normal', value: 80 },
    { label: 'Weekend', value: 20 },
    { label: 'Holiday', value: 15 },
  ],
  'multifamily': [
    { label: 'Daytime', value: 30 },
    { label: 'Evening', value: 85 },
    { label: 'Holiday', value: 70 },
  ],
  'restaurant': [
    { label: 'Normal', value: 50 },
    { label: 'Peak Hours', value: 85 },
    { label: 'Holiday', value: 90 },
  ],
  'hotel': [
    { label: 'Normal', value: 60 },
    { label: 'Weekend', value: 80 },
    { label: 'Holiday', value: 95 },
  ],
  'gas-station': [
    { label: 'Normal', value: 40 },
    { label: 'Rush Hour', value: 70 },
    { label: 'Holiday', value: 80 },
  ],
  'parking-garage': [
    { label: 'Normal', value: 65 },
    { label: 'Events', value: 90 },
    { label: 'Holiday', value: 95 },
  ],
  other: [
    { label: 'Normal', value: 50 },
    { label: 'Busy', value: 75 },
    { label: 'Peak', value: 90 },
  ],
};

const EQUIPMENT_OVERHEAD = 2;

const ParkingImpact = ({ totalSpaces, stalls, propertyType, peakUtilization, onPeakUtilizationChange }: Props) => {
  const chargerFootprint = stalls + EQUIPMENT_OVERHEAD;
  const presets = PEAK_PRESETS[propertyType] || PEAK_PRESETS.other;

  const normalRemaining = totalSpaces - chargerFootprint;

  const peakUsedByTenants = Math.round((totalSpaces - chargerFootprint) * (peakUtilization / 100));
  const peakRemaining = totalSpaces - chargerFootprint - peakUsedByTenants;
  const hasConflict = peakRemaining < 0;

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Car className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-base font-bold text-foreground">Parking Impact</h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground/50" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm leading-relaxed">
            You're dedicating {stalls} spots (plus ~2 for equipment) to chargers permanently. This card shows how many parking spots your tenants and customers still have on a normal day vs. a busy day like Black Friday. Use the slider to model different scenarios.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Charger Footprint */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground mb-1">Your charger footprint</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold text-foreground">{chargerFootprint}</span>
            <span className="text-sm text-muted-foreground">dedicated spots</span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {stalls} stalls + ~{EQUIPMENT_OVERHEAD} for cabinets/transformers
          </p>
        </div>

        {/* Normal vs Peak comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Normal Day</p>
            <p className="font-mono text-2xl font-bold text-success">{normalRemaining}</p>
            <p className="text-sm text-muted-foreground">spots remain</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              of {totalSpaces} total
            </p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${hasConflict ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-medium">Peak ({peakUtilization}%)</p>
            <p className={`font-mono text-2xl font-bold ${hasConflict ? 'text-destructive' : peakRemaining < 10 ? 'text-amber-500' : 'text-success'}`}>
              {Math.max(0, peakRemaining)}
            </p>
            <p className="text-sm text-muted-foreground">spots remain</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {peakUsedByTenants} used by tenants
            </p>
          </div>
        </div>

        {/* Peak Utilization Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Peak Parking Utilization</Label>
            <span className="font-mono text-sm font-bold text-accent">{peakUtilization}%</span>
          </div>
          <Slider
            value={[peakUtilization]}
            onValueChange={([v]) => onPeakUtilizationChange(v)}
            min={10} max={100} step={5}
            className="py-1"
          />
          {/* Preset buttons */}
          <div className="flex gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => onPeakUtilizationChange(p.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  peakUtilization === p.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {p.label} ({p.value}%)
              </button>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
          <strong>How to read this:</strong> Your {stalls} charger stalls + equipment take up {chargerFootprint} spots permanently. "Normal Day" shows spots left when nobody else is parked. "Peak" shows what happens when the lot is {peakUtilization}% full — like weekends or holidays. If the peak number is low or red, chargers may compete with tenant parking during busy times.
        </div>

        {/* Warning */}
        {hasConflict && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>
              At {peakUtilization}% peak utilization, your {chargerFootprint} dedicated charger spots
              exceed available parking by {Math.abs(peakRemaining)} spots. Consider reducing stalls or
              confirming this peak is rare (e.g., holiday-only).
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingImpact;
