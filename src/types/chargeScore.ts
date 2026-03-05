export type ChargingModel = 'tesla' | 'generic';
export type NetworkOption = 'tesla' | 'chargepoint' | 'turnkey';

export interface TurnkeyProjection {
  monthlyLease: number;
  annualRevenue: number;
  investmentRequired: number;
  maintenanceBy: string;
  contractYears: number;
  paybackYears: number;
  controlsPricing: string;
}

export interface SiteAnalysis {
  address: string;
  lat: number;
  lng: number;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  totalParkingSpaces: number;
  peakUtilization: number;
  electricalService: ElectricalService;
  chargingModel: ChargingModel;
  // Tesla model: number of Supercharger stalls (min 4)
  teslaStalls: number;
  kwhPerStallPerDay: number;
  // Generic model
  l2Chargers: number;
  dcfcChargers: number;
  pricePerKwh: number;
  electricityCostPerKwh: number;
  demandChargePerKw: number;
  teslaServiceFeePerKwh: number;
}

export type PropertyType =
  | 'strip-retail'
  | 'shopping-center'
  | 'office-park'
  | 'multifamily'
  | 'parking-garage'
  | 'gas-station'
  | 'hotel'
  | 'restaurant'
  | 'other';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  'strip-retail': 'Strip Retail',
  'shopping-center': 'Shopping Center',
  'office-park': 'Office Park',
  'multifamily': 'Multifamily',
  'parking-garage': 'Parking Garage',
  'gas-station': 'Gas Station',
  'hotel': 'Hotel',
  'restaurant': 'Restaurant',
  'other': 'Other',
};

export type ElectricalService =
  | 'unknown'
  | '200a-208v'
  | '400a-208v'
  | '400a-480v'
  | '800a-480v'
  | '1200a-480v'
  | '2000a-480v';

export const ELECTRICAL_SERVICE_LABELS: Record<ElectricalService, string> = {
  'unknown': 'Unknown',
  '200a-208v': '200A / 208V',
  '400a-208v': '400A / 208V',
  '400a-480v': '400A / 480V',
  '800a-480v': '800A / 480V',
  '1200a-480v': '1,200A / 480V',
  '2000a-480v': '2,000A / 480V',
};

export interface NearbyStation {
  id: string;
  name: string;
  network: string;
  chargerType: 'L2' | 'DCFC' | 'Tesla';
  numPorts: number;
  lat: number;
  lng: number;
  distanceMiles: number;
}

export interface FinancialProjection {
  chargingModel: ChargingModel;
  // Revenue
  dailyKwhL2: number;
  dailyKwhDcfc: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  annualRevenue: number;
  // Tesla-specific
  teslaServiceFeeAnnual: number;
  // Costs
  hardwareCostL2: number;
  hardwareCostDcfc: number;
  totalHardwareCost: number;
  installationCostL2: number;
  installationCostDcfc: number;
  totalInstallationCost: number;
  electricalUpgradeNeeded: boolean;
  electricalUpgradeCost: [number, number]; // min/max
  monthlyElectricityCost: number;
  monthlyDemandCharge: number;
  monthlyNetworkingCost: number;
  annualMaintenance: number;
  totalAnnualOperatingCost: number;
  // Summary
  totalProjectCost: number;
  estimatedIncentives: number;
  netInvestment: number;
  annualNetRevenue: number;
  paybackMonths: number;
  fiveYearRoi: number;
  // Cash flow
  cumulativeCashFlow: number[];
  npv15Year: number;
  paybackYears: number;
}

export interface Incentive {
  id: string;
  name: string;
  description: string;
  amount: string;
  computedAmount: number;
  eligible: boolean | null; // null = unknown
  details: string;
  category: 'federal' | 'state' | 'utility' | 'other';
  expiresAt?: string;
  isAlternative?: boolean; // true = not counted in total (mutually exclusive with a selected program)
  verified?: string;       // YYYY-MM when last verified
  programStatus?: 'active' | 'accepting' | 'waitlist' | 'closed' | 'expired';
  sourceUrl?: string;      // link to official program page for verification
}

export interface ChargeScoreBreakdown {
  competitionGap: number;
  trafficIndicator: number;
  electricalFeasibility: number;
  incentiveAvailability: number;
  evAdoption: number;
  total: number;
  verdict: string;
}

export interface ParkingAnalysis {
  totalSpaces: number;
  peakUsed: number;
  available: number;
  recommendedEv: number;
  requestedChargers: number;
  exceedsAvailable: boolean;
}

export interface DemandChargeAnalysis {
  peakDemandKw: number;
  monthlyDemandCharge: number;
  monthlyEnergyCost: number;
  demandChargePercent: number;
  recommendations: string[];
}
