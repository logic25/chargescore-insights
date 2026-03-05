import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, TrendingUp, DollarSign, BarChart3, ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteAnalysis, NearbyStation } from '@/types/chargeScore';
import { fetchNearbyStations } from '@/lib/api/stations';
import { fetchStateIncentives, type NrelIncentive } from '@/lib/api/incentives';
import { fetchPlannedStations, type PlannedStationData } from '@/lib/api/plannedStations';
import { fetchCensusTractFips, fetchMultiFamilyPct, fetchPopDensity } from '@/lib/api/census';
import { fetchNearbyAmenities } from '@/lib/api/amenities';
import { fetchAadt, type AadtResult } from '@/lib/api/traffic';
import { fetchParcelInfo, type ParcelResult } from '@/lib/api/parcel';
import { fetchSiteData, type SiteDataResult } from '@/lib/api/siteData';
import { fetchUtilityInfo, type UtilityInfo } from '@/lib/api/utilityInfo';
import { fetchNearestHighway, type HighwayProximity } from '@/lib/api/highway';
import { calculateFinancials, calculateParkingImpact, calculateDemandCharge, getIncentives } from '@/lib/calculations';
import { calculateChargeScoreV2, projectRevenue, type ChargeScoreResult, type RevenueProjection } from '@/lib/scoring';
import { findNearestAirport } from '@/data/airports';
import { getEstimatedEvRegistrations } from '@/data/evRegistrations';
import { logAnalysis } from '@/lib/analytics';
import SiteAerial from '@/components/dashboard/SiteAerial';
import MapView from '@/components/dashboard/MapView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChargeScoreGauge from '@/components/dashboard/ChargeScoreGauge';
import PropertyInputs, { type TrafficLevel, TRAFFIC_LEVEL_VPD } from '@/components/dashboard/PropertyInputs';
import InvestmentSummary from '@/components/dashboard/InvestmentSummary';
import FinancialProjection from '@/components/dashboard/FinancialProjection';
import ParkingImpact from '@/components/dashboard/ParkingImpact';
import ReportGenerator from '@/components/dashboard/ReportGenerator';
import ReportGate from '@/components/ReportGate';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const GATE_UNLOCKED_KEY = 'chargescore_gate_unlocked';

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

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
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('main');
  const [gateUnlocked, setGateUnlocked] = useState(() => localStorage.getItem(GATE_UNLOCKED_KEY) === 'true');
  const [confirmedSpotCount, setConfirmedSpotCount] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<'revenue' | 'investment' | 'npv' | null>('revenue');

  const handleGateUnlock = useCallback(() => {
    localStorage.setItem(GATE_UNLOCKED_KEY, 'true');
    setGateUnlocked(true);
  }, []);

  // Scoring data state
  const [plannedData, setPlannedData] = useState<PlannedStationData>({ plannedCount: 0, totalPlannedPorts: 0, nearestPlannedMiles: null });
  const [censusTractFips, setCensusTractFips] = useState<string | null>(null);
  const [multiFamilyPct, setMultiFamilyPct] = useState<number | null>(null);
  const [popDensity, setPopDensity] = useState<number | null>(null);
  const [amenitiesCount, setAmenitiesCount] = useState(5);
  const [siteData, setSiteData] = useState<SiteDataResult>({ isDAC: false, isOnCorridor: false, floodZone: null, floodZoneSubtype: null, isHighRisk: false });
  const [utilityInfo, setUtilityInfo] = useState<UtilityInfo>({ utilityName: null, commercialRate: null, companyId: null });
  const [aadtData, setAadtData] = useState<AadtResult>({ aadt: null, routeId: null, year: null });
  const [parcelData, setParcelData] = useState<ParcelResult>({ lotArea: null, bldgArea: null, address: null, ownerName: null, landUse: null, bbl: null, source: null });
  const [highwayProximity, setHighwayProximity] = useState<HighwayProximity>({ distanceMiles: null, routeName: null, isInterstate: false });

  const handleParkingEstimate = useCallback((data: { lotSqFt: number; totalSpots: number }) => {
    setSite(prev => ({ ...prev, totalParkingSpaces: data.totalSpots }));
  }, []);

  const handleSpotsCounted = useCallback((_count: number) => {}, []);

  const handleSpotsConfirmed = useCallback((count: number) => {
    if (count > 0) {
      setSite(prev => ({ ...prev, totalParkingSpaces: count }));
      setConfirmedSpotCount(count);
    }
  }, []);

  // Fetch existing stations
  useEffect(() => {
    setStationsLoading(true);
    fetchNearbyStations(site.lat, site.lng, 5)
      .then(setStations)
      .finally(() => setStationsLoading(false));
  }, [site.lat, site.lng]);

  useEffect(() => { fetchPlannedStations(site.lat, site.lng, 5).then(setPlannedData); }, [site.lat, site.lng]);
  useEffect(() => { fetchCensusTractFips(site.lat, site.lng).then(setCensusTractFips); }, [site.lat, site.lng]);
  useEffect(() => { fetchSiteData(site.lat, site.lng).then(setSiteData); }, [site.lat, site.lng]);
  useEffect(() => { fetchUtilityInfo(site.lat, site.lng).then(setUtilityInfo); }, [site.lat, site.lng]);
  useEffect(() => {
    if (!censusTractFips) return;
    fetchMultiFamilyPct(censusTractFips).then(setMultiFamilyPct);
    fetchPopDensity(censusTractFips).then(setPopDensity);
  }, [censusTractFips]);
  useEffect(() => { fetchNearbyAmenities(site.lat, site.lng).then(setAmenitiesCount); }, [site.lat, site.lng]);
  useEffect(() => { fetchAadt(site.lat, site.lng).then(setAadtData); }, [site.lat, site.lng]);
  useEffect(() => { fetchParcelInfo(site.lat, site.lng, site.state).then(setParcelData); }, [site.lat, site.lng, site.state]);
  useEffect(() => { fetchNearestHighway(site.lat, site.lng).then(setHighwayProximity); }, [site.lat, site.lng]);

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
  const hasThreePhasePower = useMemo(() => {
    if (site.electricalService === 'unknown') return null;
    return site.electricalService.includes('480v');
  }, [site.electricalService]);

  const chargeScore: ChargeScoreResult = useMemo(() => calculateChargeScoreV2({
    aadtVpd: aadtData.aadt ?? TRAFFIC_LEVEL_VPD[trafficLevel],
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
    isOnAltFuelCorridor: siteData.isOnCorridor,
    propertyType: site.propertyType,
    amenitiesNearby: amenitiesCount,
    totalParkingSpots: site.totalParkingSpaces,
    isDisadvantagedCommunity: siteData.isDAC,
    hasThreePhasePower: hasThreePhasePower,
    state: site.state,
    zipCode: site.zipCode,
    utilityName: utilityInfo.utilityName,
  }), [trafficLevel, aadtData, evRegistrations, stationMetrics, plannedData, multiFamilyPct, popDensity, nearestAirport, site.propertyType, amenitiesCount, site.totalParkingSpaces, siteData, hasThreePhasePower, site.state, site.zipCode, utilityInfo]);

  const revenueProjection: RevenueProjection = useMemo(() => projectRevenue({
    chargeScore: chargeScore.totalScore,
    numStalls: site.teslaStalls,
    retailPrice: site.pricePerKwh,
    electricityCost: site.electricityCostPerKwh,
    teslaServiceFee: site.teslaServiceFeePerKwh,
    costPerStall: 100000,
    incentivesPerStall: site.state === 'NY' ? 45000 : site.state === 'CA' ? 50000 : 30000,
  }), [chargeScore.totalScore, site.teslaStalls, site.pricePerKwh, site.electricityCostPerKwh, site.teslaServiceFeePerKwh, site.state]);

  const [nrelIncentives, setNrelIncentives] = useState<NrelIncentive[]>([]);
  useEffect(() => {
    if (site.state) {
      fetchStateIncentives({
        stateCode: site.state,
        utilityCompanyId: utilityInfo.companyId,
        utilityName: utilityInfo.utilityName,
        siteAddress: site.address,
      }).then(setNrelIncentives);
    }
  }, [site.state, site.address, utilityInfo.companyId, utilityInfo.utilityName]);

  const incentiveContext = useMemo(() => ({ isDAC: siteData.isDAC, isOnCorridor: siteData.isOnCorridor, utilityName: utilityInfo.utilityName }), [siteData.isDAC, siteData.isOnCorridor, utilityInfo.utilityName]);
  const incentives = useMemo(() => getIncentives(site, incentiveContext, nrelIncentives), [site, incentiveContext, nrelIncentives]);
  const financials = useMemo(() => calculateFinancials(site, incentives), [site, incentives]);
  const parking = useMemo(() => calculateParkingImpact(site), [site]);
  const demandCharge = useMemo(() => calculateDemandCharge(site), [site]);

  useEffect(() => {
    if (chargeScore.totalScore > 0) {
      void logAnalysis({
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

  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);

  const blurClass = gateUnlocked ? '' : 'blur-md pointer-events-none select-none';
  const monthlyProfit = financials.annualNetRevenue / 12;

  return (
    <div className="min-h-screen bg-background">
      {!gateUnlocked && chargeScore.totalScore > 0 && (
        <ReportGate chargeScore={chargeScore.totalScore} onUnlock={handleGateUnlock} />
      )}

      {/* Compact Header with ChargeScore */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex h-12 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm font-bold">ChargeScore</span>
            {/* Inline score badge */}
            <div className="flex items-center gap-1.5 ml-1">
              <div className="relative flex-shrink-0">
                <svg width="40" height="40" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" className="text-border" strokeWidth="14"
                    strokeDasharray={`${2 * Math.PI * 70 * 0.75} ${2 * Math.PI * 70 * 0.25}`}
                    strokeLinecap="round" transform="rotate(135 80 80)" />
                  <circle cx="80" cy="80" r="70" fill="none"
                    stroke={chargeScore.totalScore >= 70 ? 'hsl(var(--success))' : chargeScore.totalScore >= 45 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
                    strokeWidth="14"
                    strokeDasharray={`${(chargeScore.totalScore / 100) * 2 * Math.PI * 70 * 0.75} ${2 * Math.PI * 70 - (chargeScore.totalScore / 100) * 2 * Math.PI * 70 * 0.75}`}
                    strokeLinecap="round" transform="rotate(135 80 80)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold text-foreground">{chargeScore.totalScore}</span>
                </div>
              </div>
              {chargeScore.grade && (
                <span className="font-mono text-base font-bold text-primary">{chargeScore.grade}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block truncate max-w-[400px]">{site.address}</span>
            {gateUnlocked && (
              <ReportGenerator
                site={site} score={chargeScore} financials={financials}
                incentives={incentives} parking={parking} demandCharge={demandCharge}
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-4 space-y-3">
        {/* ═══ ROW 1: Map (left) + Sidebar (right) ═══ */}
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: Map with tabs */}
          <div className="min-h-0">
            <Tabs defaultValue="satellite" className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <TabsList className="h-8">
                  <TabsTrigger value="satellite" className="text-xs">Satellite</TabsTrigger>
                  <TabsTrigger value="competition" className="text-xs">Competition</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="satellite" className="mt-0">
                <SiteAerial lat={site.lat} lng={site.lng} onSpotsCounted={handleSpotsCounted} onSpotsConfirmed={handleSpotsConfirmed} />
              </TabsContent>
              <TabsContent value="competition" className="mt-0">
                <MapView lat={site.lat} lng={site.lng} stations={stations} loading={stationsLoading} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Property Inputs + Parking Impact (no ChargeScore card) */}
          <div className="space-y-3 min-h-0">

            {/* Property Inputs — expanded by default */}
            <PropertyInputs
              site={site} onChange={setSite}
              trafficLevel={trafficLevel} onTrafficLevelChange={setTrafficLevel}
              confirmedSpotCount={confirmedSpotCount}
              aadtData={aadtData}
              parcelData={parcelData}
              onParkingEstimate={handleParkingEstimate}
              defaultExpanded
            />

            {/* Parking Impact */}
            <ParkingImpact analysis={parking} />
          </div>
        </div>

        {/* ═══ ROW 2: Clickable Metrics Strip ═══ */}
        <div className="rounded-xl border border-border bg-card">
          <TooltipProvider>
          <div className="grid grid-cols-3">
            {([
              { key: 'revenue' as const, icon: TrendingUp, iconClass: 'text-success', label: 'Monthly Revenue', value: fmt(monthlyProfit), valueClass: monthlyProfit >= 0 ? 'text-success' : 'text-destructive', sub: '/mo net profit' },
              { key: 'investment' as const, icon: DollarSign, iconClass: 'text-primary', label: 'Out-of-Pocket', value: fmt(financials.netInvestment), valueClass: financials.netInvestment <= 0 ? 'text-success' : 'text-foreground', sub: 'after incentives' },
              { key: 'npv' as const, icon: BarChart3, iconClass: 'text-primary', label: '15-Year NPV', value: fmt(financials.npv15Year), valueClass: financials.npv15Year > 0 ? 'text-success' : 'text-destructive', sub: 'Total profit in today\'s dollars' },
            ] as const).map((card, i) => (
              <button
                key={card.key}
                onClick={() => setActivePanel(prev => prev === card.key ? null : card.key)}
                className={`px-4 py-3 text-center transition-colors relative ${i > 0 ? 'border-l border-border' : ''} ${activePanel === card.key ? 'bg-primary/5 ring-2 ring-inset ring-primary rounded-t-xl' : 'hover:bg-muted/50'}`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <card.icon className={`h-3.5 w-3.5 ${card.iconClass}`} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</span>
                  {card.key === 'npv' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        Net Present Value discounts future cash flows at 8% to show what your total 15-year profit is worth in today's dollars.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className={`font-mono text-xl font-bold ${card.valueClass}`}>{card.value}</p>
                <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                <ChevronDown className={`h-3 w-3 mx-auto mt-1 text-muted-foreground transition-transform ${activePanel === card.key ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>
          </TooltipProvider>
        </div>

        {/* ═══ GATED CONTENT: Expandable Detail Panel ═══ */}
        <div className={blurClass}>
          {activePanel === 'revenue' && (
            <InvestmentSummary financials={financials} incentives={incentives} stalls={site.teslaStalls} onStallsChange={(v) => setSite(prev => ({ ...prev, teslaStalls: v }))} />
          )}
          {activePanel === 'investment' && (
            <ChargeScoreGauge score={chargeScore} siteInsights={{
              floodZone: siteData.floodZone,
              isHighRisk: siteData.isHighRisk,
              highwayDistance: highwayProximity.distanceMiles,
              highwayName: highwayProximity.routeName,
              utilityName: utilityInfo.utilityName,
              isDAC: siteData.isDAC,
              isOnCorridor: siteData.isOnCorridor,
            }} />
          )}
          {activePanel === 'npv' && (
            <FinancialProjection financials={financials} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
