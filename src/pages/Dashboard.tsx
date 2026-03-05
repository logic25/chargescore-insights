import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';
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

const GATE_UNLOCKED_KEY = 'chargescore_gate_unlocked';

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
  const [availableForChargers, setAvailableForChargers] = useState(0);
  const [gateUnlocked, setGateUnlocked] = useState(() => localStorage.getItem(GATE_UNLOCKED_KEY) === 'true');
  const [confirmedSpotCount, setConfirmedSpotCount] = useState<number | null>(null);

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

  const handleParkingEstimate = useCallback((data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => {
    setSite(prev => ({ ...prev, totalParkingSpaces: data.totalSpots }));
    setAvailableForChargers(data.availableForChargers);
  }, []);

  const handleSpotsCounted = useCallback((count: number) => {
    // Live count — no-op, just for display
  }, []);

  const handleSpotsConfirmed = useCallback((count: number) => {
    if (count > 0) {
      setSite(prev => ({ ...prev, totalParkingSpaces: count }));
      setAvailableForChargers(Math.floor(count * 0.33));
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

  // Fetch planned stations
  useEffect(() => {
    fetchPlannedStations(site.lat, site.lng, 5).then(setPlannedData);
  }, [site.lat, site.lng]);

  // Fetch census tract
  useEffect(() => {
    fetchCensusTractFips(site.lat, site.lng).then(setCensusTractFips);
  }, [site.lat, site.lng]);

  // Fetch DAC, Corridor, Flood Zone via edge function
  useEffect(() => {
    fetchSiteData(site.lat, site.lng).then(setSiteData);
  }, [site.lat, site.lng]);

  // Fetch utility info (name + commercial rate)
  useEffect(() => {
    fetchUtilityInfo(site.lat, site.lng).then(setUtilityInfo);
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

  // Fetch AADT traffic data from HPMS
  useEffect(() => {
    fetchAadt(site.lat, site.lng).then(setAadtData);
  }, [site.lat, site.lng]);

  // Fetch parcel data (MapPLUTO → NYS Tax Parcels fallback)
  useEffect(() => {
    fetchParcelInfo(site.lat, site.lng, site.state).then(setParcelData);
  }, [site.lat, site.lng, site.state]);


  // Fetch nearest highway
  useEffect(() => {
    fetchNearestHighway(site.lat, site.lng).then(setHighwayProximity);
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
  const incentiveContext = useMemo(() => ({ isDAC: siteData.isDAC, isOnCorridor: siteData.isOnCorridor, utilityName: utilityInfo.utilityName }), [siteData.isDAC, siteData.isOnCorridor, utilityInfo.utilityName]);
  const incentives = useMemo(() => getIncentives(site, incentiveContext), [site, incentiveContext]);
  const financials = useMemo(() => calculateFinancials(site, incentives), [site, incentives]);
  const parking = useMemo(() => calculateParkingImpact(site), [site]);
  const demandCharge = useMemo(() => calculateDemandCharge(site), [site]);

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

  // Log analysis for ML
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

  // Use light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const blurClass = gateUnlocked ? '' : 'blur-md pointer-events-none select-none';

  return (
    <div className="min-h-screen bg-background">
      {/* Report Gate */}
      {!gateUnlocked && chargeScore.totalScore > 0 && (
        <ReportGate chargeScore={chargeScore.totalScore} onUnlock={handleGateUnlock} />
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl">
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
            {gateUnlocked && (
              <ReportGenerator
                site={site} score={chargeScore} financials={financials}
                incentives={incentives} parking={parking} demandCharge={demandCharge}
              />
            )}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {/* Row 1 (ungated): Map tabs + ChargeScore Gauge */}
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <Tabs defaultValue="satellite" className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 pt-3">
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

          <ChargeScoreGauge score={chargeScore} siteInsights={{
            floodZone: siteData.floodZone,
            isHighRisk: siteData.isHighRisk,
            highwayDistance: highwayProximity.distanceMiles,
            highwayName: highwayProximity.routeName,
            utilityName: utilityInfo.utilityName,
            isDAC: siteData.isDAC,
            isOnCorridor: siteData.isOnCorridor,
          }} />
        </div>

        {/* GATED: Everything below is blurred until email entry */}
        <div className={blurClass}>
          <div className="space-y-3">
            {/* Row 2: Property Inputs + Investment Summary */}
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <PropertyInputs
                site={site} onChange={setSite}
                trafficLevel={trafficLevel} onTrafficLevelChange={setTrafficLevel}
                availableForChargers={availableForChargers}
                confirmedSpotCount={confirmedSpotCount}
                aadtData={aadtData}
                parcelData={parcelData}
                onParkingEstimate={handleParkingEstimate}
              />
              <InvestmentSummary financials={financials} incentives={incentives} stalls={site.teslaStalls} onStallsChange={(v) => setSite(prev => ({ ...prev, teslaStalls: v }))} nrelIncentives={nrelIncentives} />
            </div>

            {/* Row 3: 15-Year Cash Flow + Parking Impact */}
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <FinancialProjection financials={financials} />
              <ParkingImpact analysis={parking} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
