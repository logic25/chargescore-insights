import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, TrendingUp, DollarSign, BarChart3, ChevronDown, Info, Save, Briefcase, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { getEstimatedEvRegistrations, extractCountyFromAddress } from '@/data/evRegistrations';
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
import StallHint from '@/components/dashboard/StallHint';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { computeStallRecommendation } from '@/lib/waterfallCalc';
import { fetchIncentivePrograms, calculateIncentives, resolveUtilityTerritory, type IncentiveResult, type IncentiveProgram } from '@/lib/incentiveCalc';
import IncentiveTeaser from '@/components/incentives/IncentiveTeaser';
import IncentiveSummary from '@/components/incentives/IncentiveSummary';
import IncentiveBreakdown from '@/components/incentives/IncentiveBreakdown';
import OOPRangeBar from '@/components/incentives/OOPRangeBar';

const GATE_UNLOCKED_KEY = 'chargescore_gate_unlocked';

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, canDoLookup, incrementLookup, isAtLeast } = useProfile();
  const [saving, setSaving] = useState(false);
  const [lookupCounted, setLookupCounted] = useState(false);

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
    teslaStalls: 8,
    kwhPerStallPerDay: 250,
    l2Chargers: 4,
    dcfcChargers: 2,
    pricePerKwh: 0.42,
    electricityCostPerKwh: 0.223,
    demandChargePerKw: 15,
    teslaServiceFeePerKwh: 0.10,
    npvYears: 15,
    ownerSplitPct: 70,
    annualInsurance: 5000,
    monthlyRent: 0,
  });

  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationRadius, setStationRadius] = useState(10);
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('main');
  const [gateUnlocked, setGateUnlocked] = useState(() => localStorage.getItem(GATE_UNLOCKED_KEY) === 'true');
  const [confirmedSpotCount, setConfirmedSpotCount] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<'revenue' | 'investment' | 'npv' | null>('revenue');
  const [manualKwhOverride, setManualKwhOverride] = useState(false);

  // Freemium: count lookup once when full analysis loads
  useEffect(() => {
    if (!user || lookupCounted || !profile) return;
    if (profile.role === 'free' && gateUnlocked) {
      incrementLookup();
      setLookupCounted(true);
    }
  }, [user, profile, gateUnlocked, lookupCounted]);

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
    fetchNearbyStations(site.lat, site.lng, stationRadius)
      .then(setStations)
      .finally(() => setStationsLoading(false));
  }, [site.lat, site.lng, stationRadius]);

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
  useEffect(() => {
    fetchAadt(site.lat, site.lng, 500, site.state, site.address).then((result) => {
      setAadtData(result);
      // Auto-select traffic level based on AADT data
      if (result.aadt) {
        const vpd = result.aadt;
        if (vpd >= 25000) setTrafficLevel('highway');
        else if (vpd >= 10000) setTrafficLevel('main');
        else if (vpd >= 3000) setTrafficLevel('side');
        else setTrafficLevel('residential');
      }
    });
  }, [site.lat, site.lng, site.state, site.address]);
  useEffect(() => { fetchParcelInfo(site.lat, site.lng, site.state).then(setParcelData); }, [site.lat, site.lng, site.state]);
  useEffect(() => { fetchNearestHighway(site.lat, site.lng).then(setHighwayProximity); }, [site.lat, site.lng]);

  const stationMetrics = useMemo(() => {
    const allDcfc = stations.filter(s => s.chargerType === 'DCFC' || s.chargerType === 'Tesla');
    const nearestDcfc = allDcfc.length > 0
      ? allDcfc.reduce((min, s) => s.distanceMiles < min.distanceMiles ? s : min)
      : null;
    const dcfcWithin5 = allDcfc.filter(s => s.distanceMiles <= 5);
    const totalDcfcPorts5mi = dcfcWithin5.reduce((sum, s) => sum + s.numPorts, 0);
    return {
      nearestDcfcMiles: nearestDcfc?.distanceMiles ?? null,
      dcfcWithin5Miles: dcfcWithin5.length,
      totalDcfcPortsWithin5Miles: totalDcfcPorts5mi,
    };
  }, [stations]);

  const nearestAirport = useMemo(() => findNearestAirport(site.lat, site.lng), [site.lat, site.lng]);
  const county = useMemo(() => extractCountyFromAddress(site.address), [site.address]);
  const evRegistrations = useMemo(() => getEstimatedEvRegistrations(site.state, county), [site.state, county]);
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
    peakUtilization: site.peakUtilization,
    isDisadvantagedCommunity: siteData.isDAC,
    hasThreePhasePower: hasThreePhasePower,
    state: site.state,
    zipCode: site.zipCode,
    utilityName: utilityInfo.utilityName,
  }), [trafficLevel, aadtData, evRegistrations, stationMetrics, plannedData, multiFamilyPct, popDensity, nearestAirport, site.propertyType, amenitiesCount, site.totalParkingSpaces, siteData, hasThreePhasePower, site.state, site.zipCode, utilityInfo]);

  // Auto-set kWh/stall/day based on ChargeScore (unless user manually overrode)
  useEffect(() => {
    if (manualKwhOverride) return;
    const score = chargeScore.totalScore;
    let autoKwh = 250;
    if (score >= 80) autoKwh = 400;
    else if (score >= 70) autoKwh = 300;
    else if (score < 50) autoKwh = 100;
    setSite(prev => prev.kwhPerStallPerDay === autoKwh ? prev : { ...prev, kwhPerStallPerDay: autoKwh });
  }, [chargeScore.totalScore, manualKwhOverride]);

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

  // Stall recommendation for hint
  const stallRecommendation = useMemo(() => computeStallRecommendation({
    siteName: '',
    address: '',
    lat: null,
    lng: null,
    state: site.state,
    totalParkingSpaces: site.totalParkingSpaces,
    lotSizeSqFt: parcelData.lotArea,
    dailyTraffic: aadtData.aadt ?? TRAFFIC_LEVEL_VPD[trafficLevel],
    evAdoptionRate: evRegistrations > 0 ? Math.min(evRegistrations / 100000, 0.15) : 0.05,
    avgChargeTimeMin: 25,
    operatingHours: 16,
    locationType:
      (aadtData.aadt ?? TRAFFIC_LEVEL_VPD[trafficLevel]) >= 25000 ? 'highway' :
      (aadtData.aadt ?? TRAFFIC_LEVEL_VPD[trafficLevel]) >= 10000 ? 'urban_retail' :
      (aadtData.aadt ?? TRAFFIC_LEVEL_VPD[trafficLevel]) >= 5000 ? 'suburban_retail' : 'rural',
    evpinScore: null,
    chargeScore: chargeScore.totalScore,
    nearbyL3Ports: stationMetrics.totalDcfcPortsWithin5Miles,
  }), [site.state, site.totalParkingSpaces, parcelData.lotArea, aadtData, trafficLevel, evRegistrations, chargeScore.totalScore, stationMetrics]);

  const handleSaveProject = async () => {
    if (!user) {
      toast.error('Sign in to save projects');
      navigate('/auth');
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('analyses')
        .select('id')
        .eq('user_id', user.id)
        .eq('address', site.address)
        .limit(1);

      const payload = {
        user_id: user.id,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        state: site.state,
        charge_score: chargeScore.totalScore,
        factors: Object.fromEntries(chargeScore.factors.map(f => [f.name, f.score])) as any,
        num_stalls: site.teslaStalls,
        predicted_utilization: revenueProjection.utilization,
        owner_split_pct: site.ownerSplitPct,
        annual_insurance: site.annualInsurance,
        monthly_rent: site.monthlyRent,
        noi: financials.annualNoi,
        owner_monthly: financials.ownerMonthly,
        ms_monthly: financials.msMonthly,
        coc: isFinite(financials.cashOnCashReturn) ? financials.cashOnCashReturn : null,
        npv: financials.npv15Year,
        margin_kwh: financials.marginPerKwh,
        price_per_kwh: site.pricePerKwh,
        electricity_cost: site.electricityCostPerKwh,
        kwh_per_stall_per_day: site.kwhPerStallPerDay,
        total_project_cost: financials.totalProjectCost,
        net_investment: financials.netInvestment,
        estimated_incentives: financials.estimatedIncentives,
      } as any;

      if (existing && existing.length > 0) {
        const { error } = await supabase.from('analyses').update(payload).eq('id', existing[0].id);
        if (error) throw error;
        toast.success('Project updated with latest financials!');
      } else {
        const { error } = await supabase.from('analyses').insert(payload);
        if (error) throw error;
        toast.success('Project saved!');
      }
      navigate('/my-analyses');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPortfolio = async () => {
    if (!user) {
      toast.error('Sign in first');
      navigate('/auth');
      return;
    }
    // Save first, then navigate to portfolio
    await handleSaveProject();
    navigate('/portfolio');
  };

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

  const showFullAnalysis = gateUnlocked && (user ? canDoLookup || isAtLeast('plus') : false);
  const atLookupLimit = profile?.role === 'free' && !canDoLookup;
  const blurClass = showFullAnalysis ? '' : 'blur-md pointer-events-none select-none';
  const monthlyProfit = financials.annualNetRevenue / 12;

  return (
    <div className="min-h-screen bg-background">
      {!gateUnlocked && chargeScore.totalScore > 0 && (
        <ReportGate chargeScore={chargeScore.totalScore} onUnlock={handleGateUnlock} />
      )}

      {/* Lookup limit banner */}
      {atLookupLimit && gateUnlocked && (
        <div className="bg-accent/10 border-b border-accent/30 px-6 py-3 text-center">
          <p className="text-sm text-foreground">
            <Crown className="inline h-4 w-4 mr-1 text-accent" />
            You've used all {profile?.lookups_limit} free analyses.{' '}
            <button onClick={() => navigate('/pricing')} className="font-semibold text-primary underline">
              Upgrade to ChargeScore Plus
            </button>{' '}
            for unlimited reports, revenue projections, and downloadable PDFs.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-[2000]">
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
            {gateUnlocked && user && (
              <Button size="sm" variant="default" onClick={handleSaveProject} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? 'Saving…' : 'Save Project'}
              </Button>
            )}
            {gateUnlocked && isAtLeast('pro') && (
              <Button size="sm" variant="outline" onClick={handleAddToPortfolio}>
                <Briefcase className="mr-1 h-4 w-4" />
                Add to Portfolio
              </Button>
            )}
            {gateUnlocked && isAtLeast('plus') && (
              <ReportGenerator
                site={site} score={chargeScore} financials={financials}
                incentives={incentives} parking={parking} demandCharge={demandCharge}
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1920px] px-6 py-4 space-y-3">
        {/* ROW 1: Map + Sidebar */}
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-h-0 self-stretch">
            <Tabs defaultValue="satellite" className="border border-border rounded-xl overflow-hidden bg-card h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <TabsList className="h-8">
                  <TabsTrigger value="satellite" className="text-xs">Satellite</TabsTrigger>
                  <TabsTrigger value="competition" className="text-xs">Competition</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="satellite" className="mt-0 flex-1 min-h-0">
                <SiteAerial lat={site.lat} lng={site.lng} onSpotsCounted={handleSpotsCounted} onSpotsConfirmed={handleSpotsConfirmed} />
              </TabsContent>
              <TabsContent value="competition" className="mt-0 flex-1 min-h-0">
                <MapView lat={site.lat} lng={site.lng} stations={stations} loading={stationsLoading} radius={stationRadius} onRadiusChange={setStationRadius} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3 min-h-0">
            <PropertyInputs
              site={site} onChange={setSite}
              trafficLevel={trafficLevel} onTrafficLevelChange={setTrafficLevel}
              confirmedSpotCount={confirmedSpotCount}
              aadtData={aadtData}
              parcelData={parcelData}
              onParkingEstimate={handleParkingEstimate}
              defaultExpanded
            />

            {/* Stall Hint (replaces full StallRecommendation) */}
            <StallHint
              recommendedStalls={stallRecommendation.base}
              userRole={profile?.role ?? null}
            />

            <ParkingImpact
              totalSpaces={site.totalParkingSpaces}
              stalls={site.teslaStalls}
              propertyType={site.propertyType}
              peakUtilization={site.peakUtilization}
              onPeakUtilizationChange={(v) => setSite(prev => ({ ...prev, peakUtilization: v }))}
            />
          </div>
        </div>

        {/* ROW 2: Metrics Strip */}
        <div className="rounded-xl border border-border bg-card">
          <TooltipProvider>
          <div className="grid grid-cols-3">
            {([
              { key: 'revenue' as const, icon: TrendingUp, iconClass: 'text-success', label: 'Monthly Revenue', value: fmt(monthlyProfit), valueClass: monthlyProfit >= 0 ? 'text-success' : 'text-destructive', sub: '/mo net profit' },
              { key: 'investment' as const, icon: DollarSign, iconClass: 'text-primary', label: 'Out-of-Pocket', value: fmt(financials.netInvestment), valueClass: financials.netInvestment <= 0 ? 'text-success' : 'text-foreground', sub: 'after incentives' },
              { key: 'npv' as const, icon: BarChart3, iconClass: 'text-primary', label: `${site.npvYears}-Year NPV`, value: fmt(financials.npv15Year), valueClass: financials.npv15Year > 0 ? 'text-success' : 'text-destructive', sub: 'Total profit in today\'s dollars' },
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
                      <TooltipContent side="top" className="max-w-[300px] text-xs leading-relaxed">
                        <p className="font-semibold mb-1">Net Present Value (NPV)</p>
                        <p>Your total {site.npvYears}-year profit expressed in today's dollars. We discount future cash flows at 8%.</p>
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

        {/* INCENTIVE TEASER — visible to everyone, above the gate */}
        {!showFullAnalysis && incentives.length > 0 && (
          <div className="rounded-xl border border-success/30 bg-success/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {incentives.filter(i => i.eligible !== false && !i.isAlternative).length} incentive programs available
                </p>
                <p className="text-xs text-muted-foreground">
                  Est. <span className="font-bold text-success">{fmt(financials.estimatedIncentives)}</span> in incentives — your out-of-pocket could be as low as <span className="font-bold text-success">{financials.netInvestment <= 0 ? '$0' : fmt(financials.netInvestment)}</span>
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 text-success-foreground whitespace-nowrap"
              onClick={() => { if (!user) navigate('/auth'); else handleGateUnlock(); }}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Sign Up to See Details
            </Button>
          </div>
        )}

        {/* GATED CONTENT */}
        <div className={blurClass}>
          {activePanel === 'revenue' && (
            <InvestmentSummary financials={financials} incentives={incentives} stalls={site.teslaStalls} kwhPerStallPerDay={site.kwhPerStallPerDay} onStallsChange={(v) => setSite(prev => ({ ...prev, teslaStalls: v }))} onUtilizationChange={(v) => { setManualKwhOverride(true); setSite(prev => ({ ...prev, kwhPerStallPerDay: v })); }} userRole={profile?.role ?? null} />
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
            }} incentiveTeaser={{
              programCount: incentives.filter(i => i.eligible !== false && !i.isAlternative).length,
              totalEstimate: financials.estimatedIncentives,
              outOfPocket: financials.netInvestment,
            }} />
          )}
          {activePanel === 'npv' && (
            <FinancialProjection financials={financials} npvYears={site.npvYears} onNpvYearsChange={(v) => setSite(prev => ({ ...prev, npvYears: v }))} />
          )}
        </div>

        {/* High-scoring CTA for free users */}
        {chargeScore.totalScore >= 70 && (!user || profile?.role === 'free') && gateUnlocked && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              🎯 This site scores in the <span className="text-primary font-bold">top 15%</span>. Want a free consultation about EV charging?
            </p>
            <Button className="mt-3" onClick={() => navigate(`/contact?address=${encodeURIComponent(site.address)}&score=${chargeScore.totalScore}&lat=${site.lat}&lng=${site.lng}`)}>
              Get Started — Free Consultation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
