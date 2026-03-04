import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SiteAnalysis, PropertyType, ElectricalService } from '@/types/chargeScore';
import { PROPERTY_TYPE_LABELS, ELECTRICAL_SERVICE_LABELS } from '@/types/chargeScore';

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
  onChange: (site: SiteAnalysis) => void;
  trafficLevel: TrafficLevel;
  onTrafficLevelChange: (level: TrafficLevel) => void;
  availableForChargers?: number;
}

const PropertyInputs = ({ site, onChange, trafficLevel, onTrafficLevelChange, availableForChargers = 0 }: PropertyInputsProps) => {
  const [expanded, setExpanded] = useState(true);

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
        <h2 className="font-heading text-sm font-semibold text-foreground">Property Inputs</h2>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
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
            <p className="text-[10px] text-muted-foreground/60">Exact AADT data coming soon — select the road type nearest your property</p>
          </div>

          {/* Utilization Slider */}
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

          {/* Row 2 */}
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
                  min={4} max={12} step={1}
                  className="flex-1 py-2"
                />
                <span className="w-8 text-center font-mono text-sm font-bold text-primary">{site.teslaStalls}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Based on {site.totalParkingSpaces} parking spots, we recommend {Math.min(12, Math.max(4, Math.round(site.totalParkingSpaces * 0.04)))}–{Math.min(12, Math.max(4, Math.round(site.totalParkingSpaces * 0.08)))} stalls
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
