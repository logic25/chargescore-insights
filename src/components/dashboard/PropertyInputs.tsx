import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SiteAnalysis, PropertyType, ElectricalService } from '@/types/chargeScore';
import { PROPERTY_TYPE_LABELS, ELECTRICAL_SERVICE_LABELS } from '@/types/chargeScore';
import { estimateParkingSpots } from '@/lib/api/googleMaps';

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
  availableForChargers?: number;
  onParkingEstimate?: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

const PropertyInputs = ({ site, onChange, trafficLevel, onTrafficLevelChange, availableForChargers = 0, onParkingEstimate }: PropertyInputsProps) => {
  const [expanded, setExpanded] = useState(false);
  const [lotSqFt, setLotSqFt] = useState(50000);
  const [drawnLotSqFt, setDrawnLotSqFt] = useState<number | null>(null);
  const [manualSpotCount, setManualSpotCount] = useState<number | null>(null);

  const effectiveLotSqFt = drawnLotSqFt ?? lotSqFt;
  const estimatedParking = useMemo(() => estimateParkingSpots(effectiveLotSqFt), [effectiveLotSqFt]);

  // Use manual count if set, otherwise use estimate
  const totalSpots = manualSpotCount ?? estimatedParking.total;
  const chargerSpots = Math.floor(totalSpots * 0.33);

  useEffect(() => {
    onParkingEstimate?.({
      lotSqFt: effectiveLotSqFt,
      totalSpots,
      availableForChargers: chargerSpots,
    });
  }, [effectiveLotSqFt, totalSpots, chargerSpots, onParkingEstimate]);

  const update = (partial: Partial<SiteAnalysis>) => {
    onChange({ ...site, ...partial });
  };

  const isTesla = site.chargingModel === 'tesla';

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
            <span>{isTesla ? `${site.teslaStalls} Tesla stalls` : `${site.l2Chargers} L2 + ${site.dcfcChargers} DCFC`}</span>
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
                Lot Size (sq ft) {drawnLotSqFt && <span className="text-primary text-[10px]">— measured from map</span>}
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
          </div>

          {/* Parking Estimates with Manual Override */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground">Total Parking Spots</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-xs">
                    Estimated at 1 spot per 340 sq ft. If this doesn't match your actual count, enter the real number below.
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
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground">Available for Chargers</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-xs">
                    We recommend no more than 33% of spots for EV chargers to avoid impacting regular parking.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-mono text-xl font-bold text-primary mt-1">{chargerSpots}</p>
              <p className="text-[9px] text-muted-foreground/60">33% of {totalSpots} spots</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70">
            💡 Use the <strong>Measure Lot</strong> button on the satellite map above to draw your lot outline, or type your actual spot count.
          </p>

          {/* Charging Model Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Charging Model</Label>
            <div className="flex gap-2">
              <button
                onClick={() => update({ chargingModel: 'tesla' })}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all ${
                  isTesla
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                ⚡ Tesla Supercharger
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">for Business</span>
              </button>
              <button
                onClick={() => update({ chargingModel: 'generic' })}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all ${
                  !isTesla
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                🔌 Generic / Other
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">L2 + DCFC</span>
              </button>
            </div>
          </div>

          {/* Traffic Level */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Traffic Level <span className="text-[10px] text-muted-foreground/60">(nearest road)</span>
            </Label>
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
          </div>

          {/* Utilization + Electrical + State */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Peak Parking Utilization</Label>
              <span className="font-mono text-xs text-accent">{site.peakUtilization}%</span>
            </div>
            <Slider
              value={[site.peakUtilization]}
              onValueChange={([v]) => update({ peakUtilization: v })}
              min={0} max={100} step={5}
              className="py-2"
            />
          </div>

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

          {/* Charger Config */}
          {isTesla ? (
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
              <p className="text-[10px] text-muted-foreground/60">
                Based on {totalSpots} parking spots, we recommend {Math.min(24, Math.max(4, Math.round(totalSpots * 0.04)))}–{Math.min(24, Math.max(4, Math.round(totalSpots * 0.08)))} stalls
              </p>
              {availableForChargers > 0 && site.teslaStalls > availableForChargers && (
                <div className="flex items-center gap-1 rounded bg-accent/10 p-1.5 text-[10px] text-accent">
                  ⚠ Exceeds estimated available spots ({availableForChargers})
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Level 2 Chargers</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => update({ l2Chargers: Math.max(0, site.l2Chargers - 1) })}>−</Button>
                  <span className="w-10 text-center font-mono text-sm">{site.l2Chargers}</span>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => update({ l2Chargers: Math.min(50, site.l2Chargers + 1) })}>+</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">DC Fast Chargers</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => update({ dcfcChargers: Math.max(0, site.dcfcChargers - 1) })}>−</Button>
                  <span className="w-10 text-center font-mono text-sm">{site.dcfcChargers}</span>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => update({ dcfcChargers: Math.min(20, site.dcfcChargers + 1) })}>+</Button>
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className={`grid gap-4 ${isTesla ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Price/kWh ($)</Label>
              <Input type="number" step="0.01" className="amber-input h-9 font-mono text-sm"
                value={site.pricePerKwh}
                onChange={(e) => update({ pricePerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Electricity $/kWh</Label>
              <Input type="number" step="0.01" className="amber-input h-9 font-mono text-sm"
                value={site.electricityCostPerKwh}
                onChange={(e) => update({ electricityCostPerKwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Demand $/kW</Label>
              <Input type="number" step="1" className="amber-input h-9 font-mono text-sm"
                value={site.demandChargePerKw}
                onChange={(e) => update({ demandChargePerKw: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {isTesla && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tesla Fee $/kWh</Label>
                <Input type="number" step="0.01" className="amber-input h-9 font-mono text-sm"
                  value={site.teslaServiceFeePerKwh}
                  onChange={(e) => update({ teslaServiceFeePerKwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyInputs;
