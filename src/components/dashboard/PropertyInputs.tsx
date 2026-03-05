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
}

const PropertyInputs = ({ site, onChange, trafficLevel, onTrafficLevelChange, confirmedSpotCount, aadtData, parcelData, onParkingEstimate }: PropertyInputsProps) => {
  const [expanded, setExpanded] = useState(false);
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
        <div className="space-y-4 border-t border-border p-4">
          {/* Property Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Lot Size (sq ft)
                {parcelData?.lotArea && parcelSourceLabel ? (
                  <span className="text-primary text-[10px]"> — from {parcelSourceLabel}</span>
                ) : drawnLotSqFt ? (
                  <span className="text-primary text-[10px]"> — measured from map</span>
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
              {parcelData?.ownerName && (
                <p className="text-[9px] text-muted-foreground/60">
                  Owner: {parcelData.ownerName}
                </p>
              )}
            </div>
          </div>

          {/* Total Parking Spots — single box, no 33% cap */}
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground">Total Parking Spots</p>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">
                  Estimated at 1 spot per 340 sq ft. Use the Count Spots tool on the satellite map or enter your actual count.
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              className="mt-1 h-8 w-full font-mono text-lg font-bold border-dashed"
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
            <p className="text-[9px] text-muted-foreground/60 mt-1">
              {manualSpotCount !== null ? '✏️ Manual count' : `Est. from ${effectiveLotSqFt.toLocaleString()} sq ft`}
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground/70">
            💡 Use the <strong>Count Spots</strong> tool on the satellite map above to tap each parking spot, or type your actual count.
          </p>

          {/* Traffic Level */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">
                Traffic Level <span className="text-[10px] text-muted-foreground/60">(nearest road)</span>
                {aadtData?.aadt && (
                  <span className="text-primary text-[10px] ml-1">
                    — {aadtData.aadt.toLocaleString()} VPD from HPMS{aadtData.year ? ` (${aadtData.year})` : ''}
                  </span>
                )}
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">
                  VPD = Vehicles Per Day. Measured by FHWA's Highway Performance Monitoring System (HPMS). Higher traffic increases charger utilization and revenue potential.
                </TooltipContent>
              </Tooltip>
            </div>
            {aadtData?.aadt ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-primary">{aadtData.aadt.toLocaleString()} VPD</span>
                  <span className="text-[10px] text-muted-foreground">FHWA HPMS Data</span>
                </div>
                {aadtData.routeId && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">Route: {aadtData.routeId}</p>
                )}
              </div>
            ) : (
              <Select value={trafficLevel} onValueChange={(v) => onTrafficLevelChange(v as TrafficLevel)}>
                <SelectTrigger className="amber-input h-9 text-sm">
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

          {/* Peak Parking Utilization */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Peak Parking Utilization</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-xs">
                    How full your parking lot gets at its busiest time. Higher utilization means less room for dedicated charger spots. Ask your property manager or estimate from peak-hour observations.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-mono text-xs text-accent">{site.peakUtilization}%</span>
            </div>
            <Slider
              value={[site.peakUtilization]}
              onValueChange={([v]) => update({ peakUtilization: v })}
              min={0} max={100} step={5}
              className="py-2"
            />
          </div>

          {/* Electrical Service + State */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Electrical Service</Label>
              <Select value={site.electricalService} onValueChange={(v) => update({ electricalService: v as ElectricalService })}>
                <SelectTrigger className="amber-input h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ELECTRICAL_SERVICE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                className="amber-input h-9 font-mono text-sm"
                value={site.state}
                onChange={(e) => update({ state: e.target.value.toUpperCase().slice(0, 2) })}
              />
            </div>
          </div>

          {/* Tesla Supercharger Stalls */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Supercharger Stalls <span className="text-[10px] text-muted-foreground/70">(min 4)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[site.teslaStalls]}
                onValueChange={([v]) => update({ teslaStalls: v })}
                min={4} max={24} step={1}
                className="flex-1 py-2"
              />
              <span className="w-8 text-center font-mono text-sm font-bold text-primary">{site.teslaStalls}</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Your Retail Price/kWh ($)</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] text-xs">
                      The price you charge EV drivers per kWh. You set this — it's your revenue per unit of energy dispensed.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" step="0.01" className="amber-input h-9 font-mono text-sm"
                  value={site.pricePerKwh}
                  onChange={(e) => update({ pricePerKwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">Your Levelized Electricity Cost/kWh ($)</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] text-xs">
                      Your all-in electricity cost per kWh, including demand charges, TOU pricing, surcharges, and fees. Check your utility bill or ask your provider for a levelized commercial rate.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input type="number" step="0.01" className="amber-input h-9 font-mono text-sm"
                  value={site.electricityCostPerKwh}
                  onChange={(e) => update({ electricityCostPerKwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Tesla Service Fee — read-only display */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Tesla Service Fee</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-xs">
                    Tesla charges $0.10/kWh for network management, payment processing, monitoring, and maintenance. This fee escalates 3% per year. Set by Tesla — not editable.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-mono text-sm font-semibold text-muted-foreground">${site.teslaServiceFeePerKwh}/kWh</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyInputs;
