import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteAnalysis, NearbyStation } from '@/types/chargeScore';
import { fetchNearbyStations } from '@/lib/api/stations';
import { fetchStateIncentives, type NrelIncentive } from '@/lib/api/incentives';
import { fetchPlannedStations, type PlannedStationData } from '@/lib/api/plannedStations';
import { fetchCensusTractFips, fetchMultiFamilyPct, fetchPopDensity } from '@/lib/api/census';
import { fetchNearbyAmenities } from '@/lib/api/amenities';
import { calculateFinancials, calculateParkingImpact, calculateDemandCharge, getIncentives } from '@/lib/calculations';
import { calculateChargeScoreV2, projectRevenue, type ChargeScoreResult, type RevenueProjection } from '@/lib/scoring';
import { findNearestAirport } from '@/data/airports';
import { getEstimatedEvRegistrations } from '@/data/evRegistrations';
import { logAnalysis } from '@/lib/analytics';
import MapView from '@/components/dashboard/MapView';
import ChargeScoreGauge from '@/components/dashboard/ChargeScoreGauge';
import PropertyInputs, { type TrafficLevel, TRAFFIC_LEVEL_VPD } from '@/components/dashboard/PropertyInputs';
import FinancialProjection from '@/components/dashboard/FinancialProjection';
import DemandChargeAnalyzer from '@/components/dashboard/DemandChargeAnalyzer';
import ParkingImpact from '@/components/dashboard/ParkingImpact';
import NetworkComparison from '@/components/dashboard/NetworkComparison';
import ReportGenerator from '@/components/dashboard/ReportGenerator';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [site, setSite] = useState<SiteAnalysis>({
    address: searchParams.get('address') || '123 Main St, New York, NY',
    lat: parseFloat(searchParams.get('lat') || '40.7128'),
    lng: parseFloat(searchParams.get('lng') || '-74.006'),
    state: searchParams.get('state') || 'NY',
    zipCode: searchParams.get('zip') || '10001',
    propertyType: 'shopping-center',
    totalParkingSpaces: 200,
    peakUtilization: 65,
    electricalService: 'unknown',
    chargingModel: 'tesla',
    teslaStalls: 6,
    l2Chargers: 4,
    dcfcChargers: 2,
    pricePerKwh: 0.42,
    electricityCostPerKwh: 0.223,
    demandChargePerKw: 15,
    teslaServiceFeePerKwh: 0.10,
  });

  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'analysis' | 'compare'>('analysis');
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('main');

  // Scoring data state
  const [plannedData, setPlannedData] = useState<PlannedStationData>({ plannedCount: 0, totalPlannedPorts: 0, nearestPlannedMiles: null });
  const [censusTractFips, setCensusTractFips] = useState<string | null>(null);
  const [multiFamilyPct, setMultiFamilyPct] = useState<number | null>(null);
  const [popDensity, setPopDensity] = useState<number | null>(null);
  const [amenitiesCount, setAmenitiesCount] = useState(5);
  const [isDisadvantagedCommunity, setIsDisadvantagedCommunity] = useState(false);

  // Fetch existing stations
  useEffect(() => {
    setStationsLoading(true);
    fetchNearbyStations(site.lat, site.lng, 5)
      .then(setStations)
      .finally(() => setStationsLoading(false));
  }, [site.lat, site.lng]);

  // Fetch planned stations
  useEffect(() => {
    fetchPlannedStations(site.lat, site.lng, 5).then(setPlannedData);
  }, [site.lat, site.lng]);

  // Fetch census tract + DAC check
  useEffect(() => {
    fetchCensusTractFips(site.lat, site.lng).then((fips) => {
      setCensusTractFips(fips);
      // Simple DAC proxy: we don't bundle the full CEJST dataset for MVP
      // Instead mark as DAC if in a high-poverty tract (will refine later)
      setIsDisadvantagedCommunity(false);
    });
  }, [site.lat, site.lng]);

  // Fetch census housing + population data
  useEffect(() => {
    if (!censusTractFips) return;
    fetchMultiFamilyPct(censusTractFips).then(setMultiFamilyPct);
    fetchPopDensity(censusTractFips).then(setPopDensity);
  }, [censusTractFips]);

  // Fetch amenities
  useEffect(() => {
    fetchNearbyAmenities(site.lat, site.lng).then(setAmenitiesCount);
  }, [site.lat, site.lng]);

  // Computed scoring data from stations
  const stationMetrics = useMemo(() => {
    const dcfcStations = stations.filter(s => s.chargerType === 'DCFC' || s.chargerType === 'Tesla');
    const nearestDcfc = dcfcStations.length > 0
      ? dcfcStations.reduce((min, s) => s.distanceMiles < min.distanceMiles ? s : min)
      : null;
    const totalDcfcPorts = stations.reduce((sum, s) =>
      (s.chargerType === 'DCFC' || s.chargerType === 'Tesla') ? sum + s.numPorts : sum, 0
    );
    return {
      nearestDcfcMiles: nearestDcfc?.distanceMiles ?? null,
      dcfcWithin5Miles: dcfcStations.length,
      totalDcfcPortsWithin5Miles: totalDcfcPorts,
    };
  }, [stations]);

  const nearestAirport = useMemo(() => findNearestAirport(site.lat, site.lng), [site.lat, site.lng]);
  const evRegistrations = useMemo(() => getEstimatedEvRegistrations(site.state), [site.state]);

  // Has three-phase power inference from electrical service
  const hasThreePhasePower = useMemo(() => {
    if (site.electricalService === 'unknown') return null;
    return site.electricalService.includes('480v');
  }, [site.electricalService]);

  // ChargeScore V2
  const chargeScore: ChargeScoreResult = useMemo(() => calculateChargeScoreV2({
    aadtVpd: TRAFFIC_LEVEL_VPD[trafficLevel],
    evRegistrations,
    nearestDcfcMiles: stationMetrics.nearestDcfcMiles,
    dcfcWithin5Miles: stationMetrics.dcfcWithin5Miles,
    plannedDcfcWithin5Miles: plannedData.plannedCount,
    nearestPlannedDcfcMiles: plannedData.nearestPlannedMiles,
    totalDcfcPortsWithin5Miles: stationMetrics.totalDcfcPortsWithin5Miles,
    totalPlannedDcfcPortsWithin5Miles: plannedData.totalPlannedPorts,
    multiFamilyPct,
    popDensity,
    nearestMajorAirportMiles: nearestAirport.distance,
    isOnAltFuelCorridor: false, // MVP: not bundled yet
    propertyType: site.propertyType,
    amenitiesNearby: amenitiesCount,
    totalParkingSpots: site.totalParkingSpaces,
    isDisadvantagedCommunity,
    hasThreePhasePower: hasThreePhasePower,
  }), [trafficLevel, evRegistrations, stationMetrics, plannedData, multiFamilyPct, popDensity, nearestAirport, site.propertyType, amenitiesCount, site.totalParkingSpaces, isDisadvantagedCommunity, hasThreePhasePower]);

  // Revenue projection from ChargeScore
  const revenueProjection: RevenueProjection = useMemo(() => projectRevenue({
    chargeScore: chargeScore.totalScore,
    numStalls: site.teslaStalls,
    retailPrice: site.pricePerKwh,
    electricityCost: site.electricityCostPerKwh,
    teslaServiceFee: site.teslaServiceFeePerKwh,
    costPerStall: 100000,
    incentivesPerStall: site.state === 'NY' ? 45000 : site.state === 'CA' ? 50000 : 30000,
  }), [chargeScore.totalScore, site.teslaStalls, site.pricePerKwh, site.electricityCostPerKwh, site.teslaServiceFeePerKwh, site.state]);

  // Legacy calculations (still used by other panels)
  const incentives = useMemo(() => getIncentives(site), [site]);
  const financials = useMemo(() => calculateFinancials(site, incentives), [site, incentives]);
  const parking = useMemo(() => calculateParkingImpact(site), [site]);
  const demandCharge = useMemo(() => calculateDemandCharge(site), [site]);

  const [nrelIncentives, setNrelIncentives] = useState<NrelIncentive[]>([]);
  useEffect(() => {
    if (site.state) fetchStateIncentives(site.state).then(setNrelIncentives);
  }, [site.state]);

  // Log analysis for ML
  useEffect(() => {
    if (chargeScore.totalScore > 0) {
      logAnalysis({
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        state: site.state,
        chargeScore: chargeScore.totalScore,
        factors: Object.fromEntries(chargeScore.factors.map(f => [f.name, f.score])),
        numStalls: site.teslaStalls,
        predictedUtilization: revenueProjection.utilization,
        timestamp: new Date().toISOString(),
      });
    }
  }, [chargeScore.totalScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ChargeScore</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">{site.address}</span>
            <ReportGenerator
              site={site} score={chargeScore} financials={financials}
              incentives={incentives} parking={parking} demandCharge={demandCharge}
            />
          </div>
        </div>
      </header>

      <main className="p-4">
        {/* Top Row: Map + Score + Inputs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <MapView lat={site.lat} lng={site.lng} stations={stations} loading={stationsLoading} />
          <div className="flex flex-col gap-4">
            <ChargeScoreGauge score={chargeScore} />
            <PropertyInputs
              site={site} onChange={setSite}
              trafficLevel={trafficLevel} onTrafficLevelChange={setTrafficLevel}
            />
          </div>
        </div>

        {/* Revenue Projection from ChargeScore */}
        <div className="mt-4 glass-card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Revenue Projection (Score-Based)
            </h2>
            <span className="text-xs text-muted-foreground">
              Based on ChargeScore {chargeScore.totalScore} → {revenueProjection.kwhPerStallPerDay} kWh/stall/day
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RevenueCard label="Monthly Profit" value={`$${Math.round(revenueProjection.monthlyProfit).toLocaleString()}`}
              sub={`${site.teslaStalls} stalls`} positive={revenueProjection.monthlyProfit > 0} />
            <RevenueCard label="Year 1 Revenue" value={`$${Math.round(revenueProjection.year1Revenue).toLocaleString()}`}
              sub={`${Math.round(revenueProjection.annualKwh).toLocaleString()} kWh`} positive />
            <RevenueCard label="Out of Pocket" value={`$${Math.round(revenueProjection.outOfPocket).toLocaleString()}`}
              sub={`After $${Math.round(revenueProjection.totalIncentives).toLocaleString()} incentives`} positive={revenueProjection.outOfPocket === 0} />
            <RevenueCard label="Payback" value={revenueProjection.paybackYears !== null ? `${revenueProjection.paybackYears.toFixed(1)} yrs` : 'N/A'}
              sub={`15-yr NPV: $${Math.round(revenueProjection.npv15Year).toLocaleString()}`} positive={revenueProjection.paybackYears !== null && revenueProjection.paybackYears < 5} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant={viewMode === 'analysis' ? 'default' : 'outline'}
            onClick={() => setViewMode('analysis')}>
            <Zap className="mr-1 h-3.5 w-3.5" /> Tesla Analysis
          </Button>
          <Button size="sm" variant={viewMode === 'compare' ? 'default' : 'outline'}
            onClick={() => setViewMode('compare')}>
            Compare Networks
          </Button>
        </div>

        {/* Financial Section */}
        <div className="mt-4">
          {viewMode === 'analysis' ? (
            <FinancialProjection financials={financials} incentives={incentives} site={site} nrelIncentives={nrelIncentives} />
          ) : (
            <NetworkComparison site={site} incentives={incentives} />
          )}
        </div>

        {/* Bottom: Demand Charge + Parking */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DemandChargeAnalyzer analysis={demandCharge} />
          <ParkingImpact analysis={parking} />
        </div>
      </main>
    </div>
  );
};

const RevenueCard = ({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) => (
  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={`font-mono text-xl font-bold ${positive ? 'text-primary' : 'text-destructive'}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground/70">{sub}</p>
  </div>
);

export default Dashboard;
