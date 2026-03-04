import { useState, useEffect, useMemo } from 'react';
import { Info, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSatelliteImageUrl, estimateParkingSpots } from '@/lib/api/googleMaps';

export type LotPreset = 'pharmacy' | 'strip-mall' | 'shopping-center' | 'gas-station' | 'standalone-retail' | 'other';

const LOT_PRESETS: Record<LotPreset, { label: string; sqFt: number }> = {
  'pharmacy': { label: 'Former Pharmacy / Retail', sqFt: 12000 },
  'strip-mall': { label: 'Strip Mall', sqFt: 25000 },
  'shopping-center': { label: 'Shopping Center', sqFt: 80000 },
  'gas-station': { label: 'Gas Station', sqFt: 8000 },
  'standalone-retail': { label: 'Standalone Retail', sqFt: 15000 },
  'other': { label: 'Other (manual)', sqFt: 10000 },
};

interface SiteAerialProps {
  lat: number;
  lng: number;
  onParkingEstimate: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

const SiteAerial = ({ lat, lng, onParkingEstimate }: SiteAerialProps) => {
  const [lotPreset, setLotPreset] = useState<LotPreset>('pharmacy');
  const [lotSqFt, setLotSqFt] = useState(12000);

  const satelliteUrl = useMemo(() => getSatelliteImageUrl(lat, lng), [lat, lng]);
  const parking = useMemo(() => estimateParkingSpots(lotSqFt), [lotSqFt]);

  // Notify parent of parking changes
  useEffect(() => {
    onParkingEstimate({
      lotSqFt,
      totalSpots: parking.total,
      availableForChargers: parking.availableForChargers,
    });
  }, [lotSqFt, parking.total, parking.availableForChargers, onParkingEstimate]);

  const handlePresetChange = (preset: LotPreset) => {
    setLotPreset(preset);
    setLotSqFt(LOT_PRESETS[preset].sqFt);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Satellite Image */}
      <div className="relative">
        <img
          src={satelliteUrl}
          alt={`Satellite view at ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          className="h-[240px] w-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-white">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="space-y-4 p-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">Property Details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Property Type Preset */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Property Type</Label>
            <Select value={lotPreset} onValueChange={(v) => handlePresetChange(v as LotPreset)}>
              <SelectTrigger className="amber-input h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOT_PRESETS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lot Size */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lot Size (sq ft)</Label>
            <Input
              type="number"
              className="amber-input h-9 font-mono text-sm"
              value={lotSqFt}
              onChange={(e) => {
                setLotSqFt(parseInt(e.target.value) || 0);
                setLotPreset('other');
              }}
            />
          </div>
        </div>

        {/* Parking Estimates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-[10px] text-muted-foreground">Estimated Total Spots</p>
            <p className="font-mono text-xl font-bold text-foreground">{parking.total}</p>
            <p className="text-[9px] text-muted-foreground/60">1 spot per 340 sq ft</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground">Available for Chargers</p>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">
                  Industry standard: 1 parking spot per 340 sq ft. We recommend no more than 33% of spots for EV charging to avoid impacting regular parking.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="font-mono text-xl font-bold text-primary">{parking.availableForChargers}</p>
            <p className="text-[9px] text-muted-foreground/60">33% of total spots</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteAerial;
