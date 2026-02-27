import type {
  SiteAnalysis,
  NearbyStation,
  FinancialProjection,
  ChargeScoreBreakdown,
  ParkingAnalysis,
  DemandChargeAnalysis,
  Incentive,
  PropertyType,
} from '@/types/chargeScore';

// --- ChargeScore Calculation ---

const TRAFFIC_SCORES: Record<PropertyType, number> = {
  'shopping-center': 90,
  'strip-retail': 75,
  'gas-station': 85,
  'restaurant': 70,
  'hotel': 65,
  'parking-garage': 80,
  'office-park': 55,
  'multifamily': 45,
  'other': 50,
};

const ELECTRICAL_FEASIBILITY: Record<string, number> = {
  'unknown': 40,
  '200a-208v': 30,
  '400a-208v': 50,
  '400a-480v': 70,
  '800a-480v': 85,
  '1200a-480v': 95,
  '2000a-480v': 100,
};

export function calculateChargeScore(
  site: SiteAnalysis,
  stations: NearbyStation[]
): ChargeScoreBreakdown {
  // Competition gap (30%) — fewer nearby stations = higher score
  const stationsWithin3Miles = stations.filter(s => s.distanceMiles <= 3).length;
  const competitionGap = Math.max(0, Math.min(100, 100 - stationsWithin3Miles * 15));

  // Traffic indicator (25%)
  const trafficIndicator = TRAFFIC_SCORES[site.propertyType] || 50;

  // Electrical feasibility (20%)
  const electricalFeasibility = ELECTRICAL_FEASIBILITY[site.electricalService] || 40;

  // Incentive availability (15%)
  const incentiveAvailability = getIncentiveScore(site.state);

  // EV adoption (10%)
  const evAdoption = getEvAdoptionScore(site.state);

  const total = Math.round(
    competitionGap * 0.3 +
    trafficIndicator * 0.25 +
    electricalFeasibility * 0.2 +
    incentiveAvailability * 0.15 +
    evAdoption * 0.1
  );

  const verdict = getVerdict(total, competitionGap, trafficIndicator);

  return { competitionGap, trafficIndicator, electricalFeasibility, incentiveAvailability, evAdoption, total, verdict };
}

function getVerdict(score: number, competition: number, traffic: number): string {
  if (score >= 80) return 'Strong Candidate — Low competition with high traffic potential';
  if (score >= 65) return 'Good Opportunity — Favorable conditions for EV charging investment';
  if (score >= 50) return 'Moderate — Nearby competition exists but demand may support additional capacity';
  if (score >= 35) return 'Challenging — High competition or limited traffic may reduce returns';
  return 'Weak — Consider alternative locations with better fundamentals';
}

function getIncentiveScore(state: string): number {
  const highIncentive = ['CA', 'NY', 'CO', 'MA', 'NJ', 'WA'];
  const medIncentive = ['TX', 'FL', 'PA', 'IL'];
  if (highIncentive.includes(state)) return 90;
  if (medIncentive.includes(state)) return 65;
  return 45;
}

function getEvAdoptionScore(state: string): number {
  const highAdoption = ['CA', 'WA', 'CO', 'MA', 'NJ'];
  const medAdoption = ['NY', 'FL', 'TX', 'IL', 'PA'];
  if (highAdoption.includes(state)) return 90;
  if (medAdoption.includes(state)) return 65;
  return 40;
}

// --- Financial Projection ---

const L2_KWH_PER_DAY = 30;
const DCFC_KWH_PER_DAY = 250;
const L2_HARDWARE_COST = 6500;
const DCFC_HARDWARE_COST = 85000;
const L2_INSTALL_COST = 4000;
const DCFC_INSTALL_COST = 50000;
const NETWORKING_PER_PORT = 15;
const MAINTENANCE_RATE = 0.03;
const L2_PEAK_KW = 7.7;
const DCFC_PEAK_KW = 150;

export function calculateFinancials(site: SiteAnalysis, incentives: Incentive[]): FinancialProjection {
  const dailyKwhL2 = site.l2Chargers * L2_KWH_PER_DAY;
  const dailyKwhDcfc = site.dcfcChargers * DCFC_KWH_PER_DAY;
  const totalDailyKwh = dailyKwhL2 + dailyKwhDcfc;
  const dailyRevenue = totalDailyKwh * site.pricePerKwh;
  const monthlyRevenue = dailyRevenue * 30;
  const annualRevenue = monthlyRevenue * 12;

  const hardwareCostL2 = site.l2Chargers * L2_HARDWARE_COST;
  const hardwareCostDcfc = site.dcfcChargers * DCFC_HARDWARE_COST;
  const totalHardwareCost = hardwareCostL2 + hardwareCostDcfc;

  const installationCostL2 = site.l2Chargers * L2_INSTALL_COST;
  const installationCostDcfc = site.dcfcChargers * DCFC_INSTALL_COST;
  const totalInstallationCost = installationCostL2 + installationCostDcfc;

  const needsUpgrade = (site.electricalService === 'unknown' || site.electricalService === '200a-208v' || site.electricalService === '400a-208v') && site.dcfcChargers > 2;
  const electricalUpgradeCost: [number, number] = needsUpgrade ? [75000, 150000] : [0, 0];

  const monthlyElectricityCost = totalDailyKwh * 30 * site.electricityCostPerKwh;
  const peakKw = site.l2Chargers * L2_PEAK_KW + site.dcfcChargers * DCFC_PEAK_KW;
  const monthlyDemandCharge = peakKw * site.demandChargePerKw;
  const totalPorts = site.l2Chargers + site.dcfcChargers;
  const monthlyNetworkingCost = totalPorts * NETWORKING_PER_PORT;
  const annualMaintenance = totalHardwareCost * MAINTENANCE_RATE;

  const totalAnnualOperatingCost = (monthlyElectricityCost + monthlyDemandCharge + monthlyNetworkingCost) * 12 + annualMaintenance;

  const totalProjectCost = totalHardwareCost + totalInstallationCost + (needsUpgrade ? electricalUpgradeCost[0] : 0);

  const totalIncentiveAmount = incentives
    .filter(i => i.eligible)
    .reduce((sum, i) => {
      const match = i.amount.match(/[\d,]+/);
      if (match) return sum + parseInt(match[0].replace(/,/g, ''), 10);
      return sum;
    }, 0);

  // Simplified: cap incentives at project cost
  const estimatedIncentives = Math.min(totalIncentiveAmount, totalProjectCost * 0.5);
  const netInvestment = Math.max(0, totalProjectCost - estimatedIncentives);
  const annualNetRevenue = annualRevenue - totalAnnualOperatingCost;
  const paybackMonths = annualNetRevenue > 0 ? (netInvestment / annualNetRevenue) * 12 : Infinity;

  const cumulativeCashFlow: number[] = [];
  for (let year = 1; year <= 5; year++) {
    const prev = year === 1 ? -netInvestment : cumulativeCashFlow[year - 2];
    cumulativeCashFlow.push(prev + annualNetRevenue);
  }

  const fiveYearRoi = netInvestment > 0 ? ((cumulativeCashFlow[4] + netInvestment) / netInvestment) * 100 : 0;

  return {
    dailyKwhL2, dailyKwhDcfc, dailyRevenue, monthlyRevenue, annualRevenue,
    hardwareCostL2, hardwareCostDcfc, totalHardwareCost,
    installationCostL2, installationCostDcfc, totalInstallationCost,
    electricalUpgradeNeeded: needsUpgrade,
    electricalUpgradeCost,
    monthlyElectricityCost, monthlyDemandCharge, monthlyNetworkingCost,
    annualMaintenance, totalAnnualOperatingCost,
    totalProjectCost, estimatedIncentives, netInvestment,
    annualNetRevenue, paybackMonths, fiveYearRoi, cumulativeCashFlow,
  };
}

// --- Parking Analysis ---

export function calculateParkingImpact(site: SiteAnalysis): ParkingAnalysis {
  const peakUsed = Math.round(site.totalParkingSpaces * (site.peakUtilization / 100));
  const available = site.totalParkingSpaces - peakUsed;
  const recommendedEv = Math.round(available * 0.75);
  const requestedChargers = site.l2Chargers + site.dcfcChargers;

  return {
    totalSpaces: site.totalParkingSpaces,
    peakUsed,
    available,
    recommendedEv,
    requestedChargers,
    exceedsAvailable: requestedChargers > recommendedEv,
  };
}

// --- Demand Charge Analysis ---

export function calculateDemandCharge(site: SiteAnalysis): DemandChargeAnalysis {
  const peakDemandKw = site.l2Chargers * L2_PEAK_KW + site.dcfcChargers * DCFC_PEAK_KW;
  const totalDailyKwh = site.l2Chargers * L2_KWH_PER_DAY + site.dcfcChargers * DCFC_KWH_PER_DAY;
  const monthlyEnergyCost = totalDailyKwh * 30 * site.electricityCostPerKwh;
  const monthlyDemandCharge = peakDemandKw * site.demandChargePerKw;
  const totalElectricity = monthlyEnergyCost + monthlyDemandCharge;
  const demandChargePercent = totalElectricity > 0 ? (monthlyDemandCharge / totalElectricity) * 100 : 0;

  const recommendations: string[] = [];
  if (demandChargePercent > 40) {
    recommendations.push('Consider load management software to stagger charger output and reduce peak demand');
  }
  if (site.dcfcChargers > 4) {
    recommendations.push('Battery energy storage could reduce demand charges by 40-60%');
  }
  if (peakDemandKw > 100) {
    recommendations.push('Contact your utility about EV-specific commercial rates that may reduce demand charges');
  }
  if (recommendations.length === 0) {
    recommendations.push('Your current configuration has manageable demand charges');
  }

  return { peakDemandKw, monthlyDemandCharge, monthlyEnergyCost, demandChargePercent, recommendations };
}

// --- Incentives ---

interface StateIncentive {
  name: string;
  amount: string;
  details: string;
}

const STATE_INCENTIVES: Record<string, StateIncentive[]> = {
  CA: [
    { name: 'CALeVIP (California)', amount: '$80,000', details: 'Up to $80,000 per DCFC and $6,500 per L2 through the California Electric Vehicle Infrastructure Project.' },
    { name: 'LCFS Credits', amount: '$15,000/yr', details: 'Low Carbon Fuel Standard credits can generate $10,000-$20,000 annually per DCFC based on utilization.' },
  ],
  NY: [
    { name: 'EVolve NY Program', amount: '$50,000', details: 'Up to $50,000 per DCFC for installations at eligible locations throughout New York State.' },
  ],
  TX: [
    { name: 'TCEQ DCFC Program', amount: '$60,000', details: 'Texas Commission on Environmental Quality offers up to $60,000 per DCFC unit.' },
  ],
  FL: [
    { name: 'FL DEP EV Program', amount: '$50,000', details: 'Florida Department of Environmental Protection offers grants for DCFC installations on major corridors.' },
  ],
  NJ: [
    { name: 'NJ It Pay$ to Plug In', amount: '$75,000', details: 'Up to $75,000 per DCFC and $5,000 per L2 through New Jersey\'s incentive program.' },
  ],
  MA: [
    { name: 'MassEVIP', amount: '$50,000', details: 'Massachusetts offers up to $50,000 per DCFC for workplace and fleet charging.' },
  ],
  PA: [
    { name: 'PA DEP Driving PA Forward', amount: '$40,000', details: 'Up to $40,000 per DCFC through the Driving PA Forward program.' },
  ],
  IL: [
    { name: 'IL EPA Charge Ahead', amount: '$45,000', details: 'Up to $45,000 per DCFC and $4,000 per L2 through the Illinois Charge Ahead program.' },
  ],
  CO: [
    { name: 'CO Charge Ahead', amount: '$55,000', details: 'Colorado offers up to $55,000 per DCFC and tax credits for charging infrastructure.' },
  ],
  WA: [
    { name: 'WA State EV Program', amount: '$50,000', details: 'Washington State offers grants up to $50,000 per DCFC for qualifying locations.' },
  ],
};

export function getIncentives(site: SiteAnalysis): Incentive[] {
  const incentives: Incentive[] = [];
  const totalProjectCost = site.l2Chargers * (L2_HARDWARE_COST + L2_INSTALL_COST) + site.dcfcChargers * (DCFC_HARDWARE_COST + DCFC_INSTALL_COST);
  const totalPorts = site.l2Chargers + site.dcfcChargers;
  const maxPerPort = 100000;
  const federal30cAmount = Math.min(totalProjectCost * 0.3, totalPorts * maxPerPort);

  incentives.push({
    id: 'federal-30c',
    name: 'Federal 30C Tax Credit',
    description: '30% of hardware + installation costs',
    amount: `$${Math.round(federal30cAmount).toLocaleString()}`,
    eligible: null,
    details: `30% of qualified costs, up to $100,000 per port. Must be in eligible census tract. Expires December 2032.`,
    category: 'federal',
    expiresAt: 'Dec 2032',
  });

  incentives.push({
    id: 'nevi',
    name: 'NEVI Formula Program',
    description: 'Up to 80% of project costs for highway corridor locations',
    amount: `$${Math.round(totalProjectCost * 0.8).toLocaleString()}`,
    eligible: null,
    details: 'National Electric Vehicle Infrastructure program covers up to 80% of costs for qualifying Alternative Fuel Corridor locations. Requires minimum 4 DCFC ports at 150kW+.',
    category: 'federal',
  });

  const statePrograms = STATE_INCENTIVES[site.state] || [];
  statePrograms.forEach((prog, i) => {
    incentives.push({
      id: `state-${i}`,
      name: prog.name,
      description: prog.details.slice(0, 80) + '...',
      amount: prog.amount,
      eligible: true,
      details: prog.details,
      category: 'state',
    });
  });

  incentives.push({
    id: 'utility',
    name: 'Utility Make-Ready Program',
    description: 'Check with your local utility for infrastructure incentives',
    amount: 'Varies',
    eligible: null,
    details: 'Many utilities offer "make-ready" programs that cover electrical infrastructure costs (trenching, conduit, transformer upgrades). Contact your utility for EV-specific commercial rates.',
    category: 'utility',
  });

  return incentives;
}
