import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteAnalysis } from '@/types/chargeScore';
import { generateMockStations } from '@/lib/mockData';
import { calculateChargeScore, calculateFinancials, calculateParkingImpact, calculateDemandCharge, getIncentives } from '@/lib/calculations';
import MapView from '@/components/dashboard/MapView';
import ChargeScoreGauge from '@/components/dashboard/ChargeScoreGauge';
import PropertyInputs from '@/components/dashboard/PropertyInputs';
import FinancialProjection from '@/components/dashboard/FinancialProjection';
import DemandChargeAnalyzer from '@/components/dashboard/DemandChargeAnalyzer';
import ParkingImpact from '@/components/dashboard/ParkingImpact';

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
    teslaStalls: 4,
    l2Chargers: 4,
    dcfcChargers: 2,
    pricePerKwh: 0.45,
    electricityCostPerKwh: 0.14,
    demandChargePerKw: 15,
    teslaServiceFeePerKwh: 0.10,
  });

  const stations = useMemo(() => generateMockStations(site.lat, site.lng), [site.lat, site.lng]);
  const score = useMemo(() => calculateChargeScore(site, stations), [site, stations]);
  const incentives = useMemo(() => getIncentives(site), [site]);
  const financials = useMemo(() => calculateFinancials(site, incentives), [site, incentives]);
  const parking = useMemo(() => calculateParkingImpact(site), [site]);
  const demandCharge = useMemo(() => calculateDemandCharge(site), [site]);

  // Force dark mode on dashboard
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  const handlePrint = () => {
    window.print();
  };

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
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <FileText className="mr-1 h-4 w-4" />
              Report
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
        {/* Top Row: Map + Score + Inputs */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Map */}
          <MapView lat={site.lat} lng={site.lng} stations={stations} />

          {/* Right: Score + Inputs */}
          <div className="flex flex-col gap-4">
            <ChargeScoreGauge score={score} />
            <PropertyInputs site={site} onChange={setSite} />
          </div>
        </div>

        {/* Financial Projection */}
        <div className="mt-4">
          <FinancialProjection financials={financials} incentives={incentives} site={site} />
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

export default Dashboard;
