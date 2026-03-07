import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ParkingGuidelines from "./ParkingGuidelines";
import QuickFinancialPreview from "./QuickFinancialPreview";
import type { StallSizerInputs, LocationType, SiteRow } from "@/lib/waterfallCalc";
import { computeStallRecommendation } from "@/lib/waterfallCalc";
import { fetchAadt } from "@/lib/api/traffic";
import { fetchNearbyStations } from "@/lib/api/stations";
import { fetchParcelInfo } from "@/lib/api/parcel";
import { fetchSiteData } from "@/lib/api/siteData";
import { fetchCensusTractFips, fetchPopDensity } from "@/lib/api/census";
import { getEstimatedEvRegistrations, extractCountyFromAddress } from "@/data/evRegistrations";
import { calculateChargeScoreV2 } from "@/lib/scoring";

interface Props {
  onAddToPortfolio: (site: Omit<SiteRow, 'id'>) => void;
}

const DEFAULT_INPUTS: StallSizerInputs = {
  siteName: "",
  address: "",
  lat: null,
  lng: null,
  state: "",
  totalParkingSpaces: null,
  lotSizeSqFt: null,
  dailyTraffic: 10000,
  evAdoptionRate: 0.05,
  avgChargeTimeMin: 25,
  operatingHours: 16,
  locationType: 'suburban_retail',
  evpinScore: null,
  chargeScore: null,
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
  const [fetching, setFetching] = useState(false);
  const set = <K extends keyof StallSizerInputs>(key: K, value: StallSizerInputs[K]) => setInputs(prev => ({ ...prev, [key]: value }));

  const recommendation = computeStallRecommendation(inputs);

  const handleAddressSelect = useCallback(async (result: { formatted: string; lat: number; lng: number; stateCode: string }) => {
    const { formatted, lat, lng, stateCode } = result;
    setInputs(prev => ({
      ...prev,
      siteName: formatted.split(',')[0] || formatted,
      address: formatted,
      lat,
      lng,
      state: stateCode,
    }));
    setFetching(true);

    try {
      // Run all API lookups in parallel
      const [aadtResult, stations, parcel, siteData, tractFips] = await Promise.all([
        fetchAadt(lat, lng),
        fetchNearbyStations(lat, lng, 5),
        fetchParcelInfo(lat, lng, stateCode),
        fetchSiteData(lat, lng),
        fetchCensusTractFips(lat, lng),
      ]);

      // Count nearby L3 (DCFC + Tesla) ports
      const l3Ports = stations.filter(s => s.chargerType === 'DCFC' || s.chargerType === 'Tesla').length;

      // Get population density for location type inference
      let popDensity: number | null = null;
      if (tractFips) {
        popDensity = await fetchPopDensity(tractFips);
      }

      // Infer location type from density
      let locationType: LocationType = 'suburban_retail';
      if (popDensity !== null) {
        if (popDensity > 15000) locationType = 'urban_retail';
        else if (popDensity < 2000) locationType = 'rural';
      }

      // EV adoption rate from state registration data
      const county = extractCountyFromAddress(formatted);
      const evRegs = getEstimatedEvRegistrations(stateCode, county);
      // Rough adoption rate: higher registrations = higher adoption
      const adoptionRate = Math.min(0.15, Math.max(0.03, evRegs / 100000));

      // Lot size / parking from parcel
      const lotSizeSqFt = parcel.lotArea ?? null;
      const totalParkingSpaces = lotSizeSqFt ? Math.floor(lotSizeSqFt / 350) : null;

      // Calculate ChargeScore
      const nearestDcfc = stations.filter(s => s.chargerType === 'DCFC' || s.chargerType === 'Tesla');
      const nearestDcfcMiles = nearestDcfc.length > 0 ? nearestDcfc[0].distanceMiles : null;
      const dcfcWithin5 = nearestDcfc.length;
      const totalPorts = nearestDcfc.reduce((sum, s) => sum + s.numPorts, 0);

      const scoreResult = calculateChargeScoreV2({
        aadtVpd: aadtResult.aadt,
        evRegistrations: evRegs,
        nearestDcfcMiles,
        dcfcWithin5Miles: dcfcWithin5,
        plannedDcfcWithin5Miles: 0,
        nearestPlannedDcfcMiles: null,
        totalDcfcPortsWithin5Miles: totalPorts,
        totalPlannedDcfcPortsWithin5Miles: 0,
        multiFamilyPct: null,
        popDensity,
        nearestMajorAirportMiles: null,
        isOnAltFuelCorridor: siteData.isOnCorridor,
        propertyType: 'other',
        amenitiesNearby: 0,
        totalParkingSpots: totalParkingSpaces ?? 100,
        peakUtilization: 0.7,
        isDisadvantagedCommunity: siteData.isDAC,
        hasThreePhasePower: null,
        state: stateCode,
      });

      setInputs(prev => ({
        ...prev,
        dailyTraffic: aadtResult.aadt ?? prev.dailyTraffic,
        nearbyL3Ports: l3Ports,
        lotSizeSqFt: lotSizeSqFt ?? prev.lotSizeSqFt,
        totalParkingSpaces: totalParkingSpaces ?? prev.totalParkingSpaces,
        evAdoptionRate: adoptionRate,
        locationType,
        chargeScore: scoreResult.totalScore,
      }));
    } catch (err) {
      console.error('Stall Sizer auto-fill error:', err);
    } finally {
      setFetching(false);
    }
  }, []);

  const handleAddToPortfolio = () => {
    const stalls = recommendation.base;
    const site: Omit<SiteRow, 'id'> = {
      name: inputs.siteName || "New Site",
      address: inputs.address,
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
          <div className="space-y-4">
            {/* Address search row */}
            <div className="space-y-1">
              <Label className="text-xs">Site Address</Label>
              <div className="flex items-center gap-2">
                <AddressAutocomplete
                  onSelect={handleAddressSelect}
                  placeholder="Search address to auto-fill site data..."
                  className="[&_input]:h-8 [&_input]:text-sm [&_input]:bg-amber/10 [&_input]:text-primary [&_svg]:h-3.5 [&_svg]:w-3.5"
                />
                {fetching && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching data…
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Total Parking Spaces</Label>
                  <Input type="number" value={inputs.totalParkingSpaces ?? ''} onChange={e => set('totalParkingSpaces', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" placeholder="Or estimate from lot size" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lot Size (sq ft) — optional</Label>
                  <Input type="number" value={inputs.lotSizeSqFt ?? ''} onChange={e => set('lotSizeSqFt', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" placeholder="Auto-estimate spaces at 350 sqft/space" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Daily Traffic Count</Label>
                  <Input type="number" value={inputs.dailyTraffic} onChange={e => set('dailyTraffic', parseInt(e.target.value) || 0)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">EV Adoption Rate (%)</Label>
                  <Input type="number" step={0.5} value={(inputs.evAdoptionRate * 100).toFixed(1)} onChange={e => set('evAdoptionRate', (parseFloat(e.target.value) || 0) / 100)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avg Charge Time (min)</Label>
                  <Input type="number" value={inputs.avgChargeTimeMin} onChange={e => set('avgChargeTimeMin', parseInt(e.target.value) || 25)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operating Hours/Day</Label>
                  <Input type="number" value={inputs.operatingHours} onChange={e => set('operatingHours', parseInt(e.target.value) || 16)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Location Type</Label>
                  <Select value={inputs.locationType} onValueChange={v => set('locationType', v as LocationType)}>
                    <SelectTrigger className="h-8 text-sm bg-amber/10 text-primary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LOCATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nearby L3 Ports</Label>
                  <Input type="number" value={inputs.nearbyL3Ports ?? ''} onChange={e => set('nearbyL3Ports', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">EVpin Score (1-5)</Label>
                    <Input type="number" min={1} max={5} value={inputs.evpinScore ?? ''} onChange={e => set('evpinScore', e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-sm bg-amber/10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ChargeScore™</Label>
                    <div className={`h-8 flex items-center justify-center rounded-md border text-sm font-mono font-bold ${
                      inputs.chargeScore !== null
                        ? inputs.chargeScore >= 70 ? 'border-green-500/50 bg-green-500/10 text-green-400'
                        : inputs.chargeScore >= 50 ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    }`}>
                      {inputs.chargeScore !== null ? inputs.chargeScore : '—'}
                    </div>
                  </div>
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
