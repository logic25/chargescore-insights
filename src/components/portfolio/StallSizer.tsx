import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import ParkingGuidelines from "./ParkingGuidelines";
import QuickFinancialPreview from "./QuickFinancialPreview";
import type { StallSizerInputs, LocationType, SiteRow } from "@/lib/waterfallCalc";
import { computeStallRecommendation } from "@/lib/waterfallCalc";

interface Props {
  onAddToPortfolio: (site: Omit<SiteRow, 'id'>) => void;
}

const DEFAULT_INPUTS: StallSizerInputs = {
  siteName: "",
  totalParkingSpaces: null,
  lotSizeSqFt: null,
  dailyTraffic: 10000,
  evAdoptionRate: 0.05,
  avgChargeTimeMin: 25,
  operatingHours: 16,
  locationType: 'suburban_retail',
  evpinScore: null,
  nearbyL3Ports: null,
};

const LOCATION_LABELS: Record<LocationType, string> = {
  highway: "Highway Corridor",
  urban_retail: "Urban Retail",
  suburban_retail: "Suburban Retail",
  rural: "Rural",
};

export default function StallSizer({ onAddToPortfolio }: Props) {
  const [inputs, setInputs] = useState<StallSizerInputs>(DEFAULT_INPUTS);
  const set = <K extends keyof StallSizerInputs>(key: K, value: StallSizerInputs[K]) => setInputs(prev => ({ ...prev, [key]: value }));

  const recommendation = computeStallRecommendation(inputs);

  const handleAddToPortfolio = () => {
    const stalls = recommendation.base;
    const site: Omit<SiteRow, 'id'> = {
      name: inputs.siteName || "New Site",
      address: "",
      stalls,
      baseKwhPerStallPerDay: Math.round(recommendation.kwhPerStallPerDay) || 200,
      customerPrice: 0.45,
      electricityCost: 0.15,
      teslaFee: 0.10,
      bomPerStall: 62500,
      installPerStall: 25000,
      incentives: stalls * 35000,
      insurance: 5000,
      monthlyRent: 0,
    };
    onAddToPortfolio(site);
  };

  const parkingWarning = recommendation.parkingPctBase > 10 ? 'over' : recommendation.parkingPctBase < 2 ? 'under' : null;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Stall Sizer — Demand Estimation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Site Name</Label>
                <Input value={inputs.siteName} onChange={e => set('siteName', e.target.value)} className="h-8 text-sm bg-amber/10 text-primary" placeholder="Enter site name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Parking Spaces</Label>
                <Input type="number" value={inputs.totalParkingSpaces ?? ''} onChange={e => set('totalParkingSpaces', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" placeholder="Or estimate from lot size" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lot Size (sq ft) — optional</Label>
                <Input type="number" value={inputs.lotSizeSqFt ?? ''} onChange={e => set('lotSizeSqFt', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" placeholder="Auto-estimate spaces at 350 sqft/space" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Daily Traffic Count</Label>
                <Input type="number" value={inputs.dailyTraffic} onChange={e => set('dailyTraffic', parseInt(e.target.value) || 0)} className="h-8 text-sm bg-amber/10 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">EV Adoption Rate (%)</Label>
                <Input type="number" step={0.5} value={(inputs.evAdoptionRate * 100).toFixed(1)} onChange={e => set('evAdoptionRate', (parseFloat(e.target.value) || 0) / 100)} className="h-8 text-sm bg-amber/10 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avg Charge Time (min)</Label>
                <Input type="number" value={inputs.avgChargeTimeMin} onChange={e => set('avgChargeTimeMin', parseInt(e.target.value) || 25)} className="h-8 text-sm bg-amber/10 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Operating Hours/Day</Label>
                <Input type="number" value={inputs.operatingHours} onChange={e => set('operatingHours', parseInt(e.target.value) || 16)} className="h-8 text-sm bg-amber/10 text-primary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location Type</Label>
                <Select value={inputs.locationType} onValueChange={v => set('locationType', v as LocationType)}>
                  <SelectTrigger className="h-8 text-sm bg-amber/10 text-primary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">EVpin Score (1-5)</Label>
                  <Input type="number" min={1} max={5} value={inputs.evpinScore ?? ''} onChange={e => set('evpinScore', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nearby L3 Ports</Label>
                  <Input type="number" value={inputs.nearbyL3Ports ?? ''} onChange={e => set('nearbyL3Ports', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading">Stall Recommendation</CardTitle>
            <Badge variant={recommendation.confidence === 'High' ? 'default' : recommendation.confidence === 'Medium' ? 'secondary' : 'outline'} className="text-[10px]">
              {recommendation.confidence} Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(['conservative', 'base', 'aggressive'] as const).map(tier => (
              <div key={tier} className={`rounded-lg p-3 text-center border ${tier === 'base' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="text-xs text-muted-foreground capitalize mb-1">{tier}</div>
                <div className="text-2xl font-heading font-bold">{recommendation[tier]}</div>
                <div className="text-xs text-muted-foreground">stalls (packs of 4)</div>
                <div className="text-xs font-mono mt-1">
                  {recommendation[`parkingPct${tier.charAt(0).toUpperCase() + tier.slice(1)}` as keyof typeof recommendation] !== undefined
                    ? `${(recommendation[`parkingPct${tier.charAt(0).toUpperCase() + tier.slice(1)}` as keyof typeof recommendation] as number).toFixed(1)}% of parking`
                    : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span>Est. Daily Sessions: <strong className="font-mono">{recommendation.dailySessions.toFixed(1)}</strong></span>
            <span>Est. kWh/Stall/Day: <strong className="font-mono">{recommendation.kwhPerStallPerDay.toFixed(0)}</strong></span>
          </div>

          {parkingWarning && (
            <div className={`mt-3 flex items-center gap-2 text-xs p-2 rounded ${parkingWarning === 'over' ? 'bg-destructive/10 text-destructive' : 'bg-amber/10 text-amber-foreground'}`}>
              {parkingWarning === 'over' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {parkingWarning === 'over' ? 'Over 10% of parking — may be too many stalls for this lot' : 'Under 2% of parking — potentially underbuilding'}
            </div>
          )}

          <div className="mt-4">
            <Button onClick={handleAddToPortfolio} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1.5" /> Add to Portfolio
            </Button>
          </div>
        </CardContent>
      </Card>

      <QuickFinancialPreview stalls={recommendation.base} kwhPerStallPerDay={recommendation.kwhPerStallPerDay} />
      <ParkingGuidelines />
    </div>
  );
}
