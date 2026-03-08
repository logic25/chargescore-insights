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

  useEffect(() => {
    if (parcelData?.lotArea && parcelData.lotArea > 0) {
      setLotSqFt(parcelData.lotArea);
    }
  }, [parcelData?.lotArea]);

  useEffect(() => {
    if (confirmedSpotCount != null && confirmedSpotCount > 0) {
      setManualSpotCount(confirmedSpotCount);
    }
  }, [confirmedSpotCount]);

  const effectiveLotSqFt = drawnLotSqFt ?? lotSqFt;
  const estimatedParking = useMemo(() => estimateParkingSpots(effectiveLotSqFt), [effectiveLotSqFt]);

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

  const parcelSourceLabel = parcelData?.source === 'mappluto'
    ? 'NYC MapPLUTO'
    : parcelData?.source === 'nys_parcels'
      ? 'County GIS'
      : null;

  return (
    <div className="glass-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <h2 className="font-heading text-base font-bold text-foreground">Property & Charging Inputs</h2>
        {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {!expanded && (
        <div className="border-t border-border px-5 py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
        <div className="space-y-4 border-t border-border px-5 py-4">
          {/* Row 1: Property Type | Lot Size | Parking Spots */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Property Type</Label>
              <Select value={site.propertyType} onValueChange={(v) => update({ propertyType: v as PropertyType })}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Lot Size (sq ft)</Label>
              <Input
                type="number"
                className="h-10 font-mono text-sm"
                value={effectiveLotSqFt}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setLotSqFt(val);
                  setDrawnLotSqFt(null);
                }}
              />
              <p className="text-xs text-muted-foreground/60">
                {parcelData?.lotArea && parcelSourceLabel
                  ? `📍 ${parcelSourceLabel}`
                  : drawnLotSqFt
                    ? '📐 Measured'
                    : `Est. ${effectiveLotSqFt.toLocaleString()} sqft`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Total Spots
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">
                    Estimated at 1 spot per 340 sq ft. Use the Count Spots tool or enter your actual count.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                className="h-10 font-mono text-sm border-dashed"
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
              <p className="text-xs text-muted-foreground/60">
                {manualSpotCount !== null ? '✏️ Manual' : `Est. ${effectiveLotSqFt.toLocaleString()} sqft`}
              </p>
            </div>
          </div>

          {/* Row 2: Traffic Level + Peak Utilization */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Traffic Level
                {aadtData?.aadt && (
                  <span className="text-primary text-xs">
                    — {aadtData.aadt.toLocaleString()} VPD
                  </span>
                )}
              </Label>
              {aadtData?.aadt ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-primary">{aadtData.aadt.toLocaleString()} VPD</span>
                  <span className="text-xs text-muted-foreground">HPMS</span>
                </div>
              ) : (
                <Select value={trafficLevel} onValueChange={(v) => onTrafficLevelChange(v as TrafficLevel)}>
                  <SelectTrigger className="h-10 text-sm">
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  Peak Parking Utilization
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-sm">
                      How full the parking lot gets during peak hours. Higher utilization means fewer spots available for EV chargers. Retail centers typically peak at 70-85% on weekends.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <span className="font-mono text-sm font-bold text-accent">{site.peakUtilization}%</span>
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
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Electrical Service
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Setting this to your actual service type helps estimate electrical upgrade costs. Known-insufficient service (200A or 400A at 208V) adds $75K–$150K for 5+ stalls.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={site.electricalService} onValueChange={(v) => update({ electricalService: v as ElectricalService })}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ELECTRICAL_SERVICE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {site.electricalService === 'unknown' && site.teslaStalls > 4 && (
                <p className="text-[10px] text-amber-600">⚠ Unknown service — upgrade cost not included. Set this to get accurate project costs.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">State</Label>
              <Input
                className="h-10 font-mono text-sm"
                value={site.state}
                onChange={(e) => update({ state: e.target.value.toUpperCase().slice(0, 2) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Supercharger Stalls</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[site.teslaStalls]}
                  onValueChange={([v]) => update({ teslaStalls: v })}
                  min={4} max={24} step={4}
                  className="flex-1 py-1"
                />
                <span className="w-7 text-center font-mono text-base font-bold text-primary">{site.teslaStalls}</span>
              </div>
            </div>
          </div>

          {/* Row 3b: Charging Utilization */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Charging Utilization
                <Tooltip>
                  <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">
                    Average kWh dispensed per stall per day. 150 = low traffic, 250 = medium (Tesla default), 400+ = high-traffic corridor. Directly scales revenue.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="font-mono text-sm text-primary font-bold">{site.kwhPerStallPerDay} kWh/stall/day</span>
            </div>
            <Slider
              value={[site.kwhPerStallPerDay]}
              onValueChange={([v]) => update({ kwhPerStallPerDay: v })}
              min={50} max={500} step={25}
              className="py-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span>Low (50)</span>
              <span>Medium (250)</span>
              <span>High (500)</span>
            </div>
          </div>

          {/* Row 4: Retail Price + Electricity Cost + Tesla Fee */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Retail $/kWh
                <Tooltip>
                  <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">Price you charge EV drivers per kWh.</TooltipContent>
                </Tooltip>
              </Label>
              <Input type="number" step="0.01" className="h-10 font-mono text-sm"
                value={site.pricePerKwh}
                onChange={(e) => update({ pricePerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Elec. Cost $/kWh
                <Tooltip>
                  <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">All-in electricity cost including demand charges and fees.</TooltipContent>
                </Tooltip>
              </Label>
              <Input type="number" step="0.01" className="h-10 font-mono text-sm"
                value={site.electricityCostPerKwh}
                onChange={(e) => update({ electricityCostPerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                Tesla Fee
                <Tooltip>
                  <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">$0.10/kWh for network management. Set by Tesla — not editable.</TooltipContent>
                </Tooltip>
              </Label>
              <div className="h-10 flex items-center rounded-md border border-border bg-muted/30 px-3">
                <span className="font-mono text-sm text-muted-foreground">${site.teslaServiceFeePerKwh.toFixed(2)}/kWh</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PropertyInputs;
