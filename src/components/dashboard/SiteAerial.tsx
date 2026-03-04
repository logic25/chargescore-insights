import { useState, useEffect, useMemo } from 'react';
import { Info, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSatelliteImageUrl, estimateParkingSpots } from '@/lib/api/googleMaps';
import { PROPERTY_TYPE_LABELS } from '@/types/chargeScore';
import type { PropertyType } from '@/types/chargeScore';
import ParkingLotMeasure from './ParkingLotMeasure';

interface SiteAerialProps {
  lat: number;
  lng: number;
  propertyType: PropertyType;
  onPropertyTypeChange: (type: PropertyType) => void;
  onParkingEstimate: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

const SiteAerial = ({ lat, lng, propertyType, onPropertyTypeChange, onParkingEstimate }: SiteAerialProps) => {
  const [lotSqFt, setLotSqFt] = useState(12000);
  const [drawnLotSqFt, setDrawnLotSqFt] = useState<number | null>(null);
  const [showDrawTool, setShowDrawTool] = useState(false);

  const satelliteUrl = useMemo(() => getSatelliteImageUrl(lat, lng), [lat, lng]);
  const effectiveLotSqFt = drawnLotSqFt ?? lotSqFt;
  const parking = useMemo(() => estimateParkingSpots(effectiveLotSqFt), [effectiveLotSqFt]);

  useEffect(() => {
    onParkingEstimate({
      lotSqFt: effectiveLotSqFt,
      totalSpots: parking.total,
      availableForChargers: parking.availableForChargers,
    });
  }, [effectiveLotSqFt, parking.total, parking.availableForChargers, onParkingEstimate]);

  const handleDrawMeasured = (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => {
    setDrawnLotSqFt(data.lotSqFt);
    setLotSqFt(data.lotSqFt);
    onParkingEstimate(data);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Satellite Image */}
      <div className="relative">
        {satelliteUrl ? (
          <img
            src={satelliteUrl}
            alt={`Satellite view at ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
            className="h-[240px] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[240px] w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Set VITE_GOOGLE_MAPS_KEY to see satellite view</p>
          </div>
        )}
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
          {/* Property Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Property Type</Label>
            <Select value={propertyType} onValueChange={(v) => onPropertyTypeChange(v as PropertyType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lot Size (manual override) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Lot Size (sq ft) {drawnLotSqFt && <span className="text-primary text-[10px]">— measured</span>}
            </Label>
            <Input
              type="number"
              className="h-9 font-mono text-sm"
              value={effectiveLotSqFt}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setLotSqFt(val);
                setDrawnLotSqFt(null); // manual override clears drawn
              }}
            />
          </div>
        </div>

        {/* Draw-to-Measure Toggle */}
        <button
          type="button"
          onClick={() => setShowDrawTool(!showDrawTool)}
          className="text-xs text-primary hover:text-primary/80 underline transition-colors"
        >
          {showDrawTool ? 'Hide drawing tool' : '📐 Draw on map to measure lot'}
        </button>

        {showDrawTool && (
          <ParkingLotMeasure lat={lat} lng={lng} onMeasured={handleDrawMeasured} />
        )}

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
                <TooltipContent className="max-w-[280px] text-xs">
                  Industry standard: 1 parking spot per 340 sq ft (including drive lanes). We recommend no more than 33% of spots for EV chargers to avoid impacting regular parking. Tesla requires minimum 8 dedicated spaces.
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
