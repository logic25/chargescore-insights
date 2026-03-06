import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SiteAnalysis, PropertyType, ElectricalService } from '@/types/chargeScore';
import { PROPERTY_TYPE_LABELS, ELECTRICAL_SERVICE_LABELS } from '@/types/chargeScore';
import { estimateParkingSpots } from '@/lib/api/googleMaps';
import type { AadtResult } from '@/lib/api/traffic';
import type { ParcelResult } from '@/lib/api/parcel';

export type TrafficLevel = 'highway' | 'main' | 'side' | 'residential';

export const TRAFFIC_LEVEL_LABELS: Record<TrafficLevel, string> = {
  highway: 'Highway / Major Road (25K+ VPD)',
  main: 'Main Road (10-25K VPD)',
  side: 'Side Street (5-10K VPD)',
  residential: 'Residential (<5K VPD)',
};

export const TRAFFIC_LEVEL_VPD: Record<TrafficLevel, number> = {
  highway: 30000,
  main: 15000,
  side: 7500,
  residential: 3000,
};

interface PropertyInputsProps {
  site: SiteAnalysis;
  onChange: (site: SiteAnalysis | ((prev: SiteAnalysis) => SiteAnalysis)) => void;
  trafficLevel: TrafficLevel;
  onTrafficLevelChange: (level: TrafficLevel) => void;
  confirmedSpotCount?: number | null;
  aadtData?: AadtResult;
  parcelData?: ParcelResult;
  onParkingEstimate?: (data: { lotSqFt: number; totalSpots: number }) => void;
  defaultExpanded?: boolean;
}

const PropertyInputs = ({ site, onChange, trafficLevel, onTrafficLevelChange, confirmedSpotCount, aadtData, parcelData, onParkingEstimate, defaultExpanded = false }: PropertyInputsProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [lotSqFt, setLotSqFt] = useState(50000);
  const [drawnLotSqFt, setDrawnLotSqFt] = useState<number | null>(null);
  const [manualSpotCount, setManualSpotCount] = useState<number | null>(null);

  // Sync lot area from parcel data (MapPLUTO, Nassau County GIS, or NYS Tax Parcels)
  useEffect(() => {
    if (parcelData?.lotArea && parcelData.lotArea > 0) {
      setLotSqFt(parcelData.lotArea);
    }
  }, [parcelData?.lotArea]);

  // Sync confirmed spot count from satellite map
  useEffect(() => {
    if (confirmedSpotCount != null && confirmedSpotCount > 0) {
      setManualSpotCount(confirmedSpotCount);
    }
  }, [confirmedSpotCount]);

  const effectiveLotSqFt = drawnLotSqFt ?? lotSqFt;
  const estimatedParking = useMemo(() => estimateParkingSpots(effectiveLotSqFt), [effectiveLotSqFt]);

  // Use manual count if set, otherwise use estimate
  const totalSpots = manualSpotCount ?? estimatedParking.total;

  useEffect(() => {
    onParkingEstimate?.({
      lotSqFt: effectiveLotSqFt,
      totalSpots,
    });
  }, [effectiveLotSqFt, totalSpots, onParkingEstimate]);

  const update = (partial: Partial<SiteAnalysis>) => {
    onChange({ ...site, ...partial });
  };

  // Parcel source label
  const parcelSourceLabel = parcelData?.source === 'mappluto'
    ? 'NYC MapPLUTO'
    : parcelData?.source === 'nys_parcels'
      ? 'County GIS'
      : null;

  return (
    <div className="glass-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <h2 className="font-heading text-sm font-semibold text-foreground">Property & Charging Inputs</h2>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!expanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{PROPERTY_TYPE_LABELS[site.propertyType]}</span>
            <span>•</span>
            <span>{totalSpots} spots{manualSpotCount !== null ? ' (manual)' : ''}</span>
            <span>•</span>
            <span>{site.teslaStalls} Tesla stalls</span>
            <span>•</span>
            <span>${site.pricePerKwh}/kWh</span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-border p-4">
          {/* Row 1: Property Type | Lot Size | Parking Spots */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Property Type</Label>
              <Select value={site.propertyType} onValueChange={(v) => update({ propertyType: v as PropertyType })}>
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Lot Size (sq ft)
                {parcelData?.lotArea && parcelSourceLabel ? (
                  <span className="text-primary text-[11px]"> — {parcelSourceLabel}</span>
                ) : drawnLotSqFt ? (
                  <span className="text-primary text-[11px]"> — measured</span>
                ) : null}
              </Label>
              <Input
                type="number"
                className="h-9 font-mono text-sm"
                value={effectiveLotSqFt}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setLotSqFt(val);
                  setDrawnLotSqFt(null);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Total Spots
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    Estimated at 1 spot per 340 sq ft. Use the Count Spots tool or enter your actual count.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                className="h-9 font-mono text-sm border-dashed"
                value={manualSpotCount ?? estimatedParking.total}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!val || val === estimatedParking.total) {
                    setManualSpotCount(null);
                  } else {
                    setManualSpotCount(val);
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground/60">
                {manualSpotCount !== null ? '✏️ Manual' : `Est. ${effectiveLotSqFt.toLocaleString()} sqft`}
              </p>
            </div>
          </div>

          {/* Row 2: Traffic Level + Peak Utilization */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Traffic Level
                {aadtData?.aadt && (
                  <span className="text-primary text-[11px]">
                    — {aadtData.aadt.toLocaleString()} VPD
                  </span>
                )}
              </Label>
              {aadtData?.aadt ? (
                <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-primary">{aadtData.aadt.toLocaleString()} VPD</span>
                  <span className="text-[11px] text-muted-foreground">HPMS</span>
                </div>
              ) : (
                <Select value={trafficLevel} onValueChange={(v) => onTrafficLevelChange(v as TrafficLevel)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAFFIC_LEVEL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Peak Parking Utilization</Label>
                <span className="font-mono text-xs text-accent">{site.peakUtilization}%</span>
              </div>
              <Slider
                value={[site.peakUtilization]}
                onValueChange={([v]) => update({ peakUtilization: v })}
                min={0} max={100} step={5}
                className="py-1"
              />
            </div>
          </div>

          {/* Row 3: Electrical Service + State + Stalls */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Electrical Service</Label>
              <Select value={site.electricalService} onValueChange={(v) => update({ electricalService: v as ElectricalService })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ELECTRICAL_SERVICE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                className="h-9 font-mono text-sm"
                value={site.state}
                onChange={(e) => update({ state: e.target.value.toUpperCase().slice(0, 2) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Supercharger Stalls</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[site.teslaStalls]}
                  onValueChange={([v]) => update({ teslaStalls: v })}
                  min={4} max={24} step={4}
                  className="flex-1 py-1"
                />
                <span className="w-6 text-center font-mono text-sm font-bold text-primary">{site.teslaStalls}</span>
              </div>
            </div>
          </div>

          {/* Row 3b: Charging Utilization */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Charging Utilization
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    Average kWh dispensed per stall per day. 150 = low traffic, 250 = medium (Tesla default), 400+ = high-traffic corridor. Directly scales revenue.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="font-mono text-xs text-primary font-bold">{site.kwhPerStallPerDay} kWh/stall/day</span>
            </div>
            <Slider
              value={[site.kwhPerStallPerDay]}
              onValueChange={([v]) => update({ kwhPerStallPerDay: v })}
              min={50} max={500} step={25}
              className="py-1"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground/60">
              <span>Low (50)</span>
              <span>Medium (250)</span>
              <span>High (500)</span>
            </div>
          </div>

          {/* Row 4: Retail Price + Electricity Cost + Tesla Fee */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Retail $/kWh
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">Price you charge EV drivers per kWh.</TooltipContent>
                </Tooltip>
              </Label>
              <Input type="number" step="0.01" className="h-9 font-mono text-sm"
                value={site.pricePerKwh}
                onChange={(e) => update({ pricePerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Elec. Cost $/kWh
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">All-in electricity cost including demand charges and fees.</TooltipContent>
                </Tooltip>
              </Label>
              <Input type="number" step="0.01" className="h-9 font-mono text-sm"
                value={site.electricityCostPerKwh}
                onChange={(e) => update({ electricityCostPerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Tesla Fee
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">$0.10/kWh for network management. Set by Tesla — not editable.</TooltipContent>
                </Tooltip>
              </Label>
              <div className="h-9 flex items-center rounded-md border border-border bg-muted/30 px-3">
                <span className="font-mono text-sm text-muted-foreground">${site.teslaServiceFeePerKwh}/kWh</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyInputs;
