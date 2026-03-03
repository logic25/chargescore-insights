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
  const stationsWithin3Miles = stations.filter(s => s.distanceMiles <= 3).length;
  const competitionGap = Math.max(0, Math.min(100, 100 - stationsWithin3Miles * 15));
  const trafficIndicator = TRAFFIC_SCORES[site.propertyType] || 50;
  const electricalFeasibility = ELECTRICAL_FEASIBILITY[site.electricalService] || 40;
  const incentiveAvailability = getIncentiveScore(site.state);
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

// --- Constants ---

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

// Tesla Supercharger for Business constants — aligned with Tesla ROI Calculator
const TESLA_COST_PER_STALL = 50000;      // Tesla's BOM per V4 Post including cabinet, connectivity, commissioning
const TESLA_INSTALL_PER_STALL = 50000;    // Tesla's "High Cost Scenario" turnkey installation per charger
const TESLA_KWH_PER_STALL_PER_DAY = 250;  // Tesla's "Medium" utilization estimate
const TESLA_PEAK_KW_PER_STALL = 325;      // V4 Supercharger max output
const TESLA_LOAD_MGMT_FACTOR = 0.55;      // Tesla power sharing reduces peak demand ~45%
const TESLA_UTILIZATION_GROWTH = 1.07;     // 7% YoY utilization growth
const TESLA_FEE_ESCALATION = 1.03;        // 3% YoY Tesla service fee escalation
const DISCOUNT_RATE = 0.10;                // 10% discount rate for NPV

// --- Financial Projection ---

export function calculateFinancials(site: SiteAnalysis, incentives: Incentive[]): FinancialProjection {
  if (site.chargingModel === 'tesla') {
    return calculateTeslaFinancials(site, incentives);
  }
  return calculateGenericFinancials(site, incentives);
}

function calculateTeslaFinancials(site: SiteAnalysis, incentives: Incentive[]): FinancialProjection {
  const stalls = Math.max(4, site.teslaStalls);
  const baseDailyKwh = stalls * TESLA_KWH_PER_STALL_PER_DAY;
  // Year 1 values
  const dailyKwh = baseDailyKwh;
  const grossDailyRevenue = dailyKwh * site.pricePerKwh;
  const dailyRevenue = grossDailyRevenue;
  const monthlyRevenue = dailyRevenue * 30;
  const annualRevenue = monthlyRevenue * 12;
  const teslaServiceFeeAnnual = dailyKwh * site.teslaServiceFeePerKwh * 365;

  const totalHardwareCost = stalls * TESLA_COST_PER_STALL;
  const totalInstallationCost = stalls * TESLA_INSTALL_PER_STALL;

  const needsUpgrade = (site.electricalService === 'unknown' || site.electricalService === '200a-208v' || site.electricalService === '400a-208v') && stalls > 4;
  const electricalUpgradeCost: [number, number] = needsUpgrade ? [75000, 150000] : [0, 0];

  const monthlyElectricityCost = dailyKwh * 30 * site.electricityCostPerKwh;
  const peakKw = stalls * TESLA_PEAK_KW_PER_STALL * TESLA_LOAD_MGMT_FACTOR;
  const monthlyDemandCharge = peakKw * site.demandChargePerKw;
  const annualMaintenance = 0;
  const monthlyNetworkingCost = 0;

  const totalAnnualOperatingCost =
    (monthlyElectricityCost + monthlyDemandCharge) * 12 + teslaServiceFeeAnnual;

  const totalProjectCost = totalHardwareCost + totalInstallationCost + (needsUpgrade ? electricalUpgradeCost[0] : 0);

  const totalIncentiveAmount = incentives
    .filter(i => i.eligible)
    .reduce((sum, i) => {
      const match = i.amount.match(/[\d,]+/);
      if (match) return sum + parseInt(match[0].replace(/,/g, ''), 10);
      return sum;
    }, 0);

  const estimatedIncentives = Math.min(totalIncentiveAmount, totalProjectCost * 0.5);
  const netInvestment = Math.max(0, totalProjectCost - estimatedIncentives);
  const annualNetRevenue = annualRevenue - totalAnnualOperatingCost;

  // 15-year cash flow with 7% utilization growth and 3% fee escalation
  const cumulativeCashFlow: number[] = [];
  let npv15Year = -netInvestment;
  let paybackYears = Infinity;

  for (let year = 1; year <= 15; year++) {
    const growthFactor = Math.pow(TESLA_UTILIZATION_GROWTH, year - 1);
    const feeEscalation = Math.pow(TESLA_FEE_ESCALATION, year - 1);
    const yearDailyKwh = baseDailyKwh * growthFactor;
    const yearAnnualRevenue = yearDailyKwh * site.pricePerKwh * 365;
    const yearElectricity = yearDailyKwh * 365 * site.electricityCostPerKwh;
    const yearDemandCharge = monthlyDemandCharge * 12; // demand charge stays same (peak doesn't grow with utilization)
    const yearTeslaFee = yearDailyKwh * site.teslaServiceFeePerKwh * feeEscalation * 365;
    const yearNetRevenue = yearAnnualRevenue - yearElectricity - yearDemandCharge - yearTeslaFee;

    const prev = year === 1 ? -netInvestment : cumulativeCashFlow[year - 2];
    cumulativeCashFlow.push(prev + yearNetRevenue);

    npv15Year += yearNetRevenue / Math.pow(1 + DISCOUNT_RATE, year);

    if (paybackYears === Infinity && cumulativeCashFlow[year - 1] >= 0) {
      paybackYears = year;
    }
  }

  const paybackMonths = annualNetRevenue > 0 ? (netInvestment / annualNetRevenue) * 12 : Infinity;
  const fiveYearRoi = netInvestment > 0 ? ((cumulativeCashFlow[4] + netInvestment) / netInvestment) * 100 : 0;

  return {
    chargingModel: 'tesla',
    dailyKwhL2: 0, dailyKwhDcfc: dailyKwh,
    dailyRevenue, monthlyRevenue, annualRevenue,
    teslaServiceFeeAnnual,
    hardwareCostL2: 0, hardwareCostDcfc: totalHardwareCost, totalHardwareCost,
    installationCostL2: 0, installationCostDcfc: totalInstallationCost, totalInstallationCost,
    electricalUpgradeNeeded: needsUpgrade, electricalUpgradeCost,
    monthlyElectricityCost, monthlyDemandCharge, monthlyNetworkingCost,
    annualMaintenance, totalAnnualOperatingCost,
    totalProjectCost, estimatedIncentives, netInvestment,
    annualNetRevenue, paybackMonths, fiveYearRoi, cumulativeCashFlow,
    npv15Year, paybackYears,
  };
}

function calculateGenericFinancials(site: SiteAnalysis, incentives: Incentive[]): FinancialProjection {
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

  const estimatedIncentives = Math.min(totalIncentiveAmount, totalProjectCost * 0.5);
  const netInvestment = Math.max(0, totalProjectCost - estimatedIncentives);
  const annualNetRevenue = annualRevenue - totalAnnualOperatingCost;
  const paybackMonths = annualNetRevenue > 0 ? (netInvestment / annualNetRevenue) * 12 : Infinity;

  const cumulativeCashFlow: number[] = [];
  let npv15Year = -netInvestment;
  let paybackYears = Infinity;

  for (let year = 1; year <= 15; year++) {
    const prev = year === 1 ? -netInvestment : cumulativeCashFlow[year - 2];
    cumulativeCashFlow.push(prev + annualNetRevenue);
    npv15Year += annualNetRevenue / Math.pow(1 + DISCOUNT_RATE, year);
    if (paybackYears === Infinity && cumulativeCashFlow[year - 1] >= 0) {
      paybackYears = year;
    }
  }

  const fiveYearRoi = netInvestment > 0 ? ((cumulativeCashFlow[4] + netInvestment) / netInvestment) * 100 : 0;

  return {
    chargingModel: 'generic',
    dailyKwhL2, dailyKwhDcfc, dailyRevenue, monthlyRevenue, annualRevenue,
    teslaServiceFeeAnnual: 0,
    hardwareCostL2, hardwareCostDcfc, totalHardwareCost,
    installationCostL2, installationCostDcfc, totalInstallationCost,
    electricalUpgradeNeeded: needsUpgrade, electricalUpgradeCost,
    monthlyElectricityCost, monthlyDemandCharge, monthlyNetworkingCost,
    annualMaintenance, totalAnnualOperatingCost,
    totalProjectCost, estimatedIncentives, netInvestment,
    annualNetRevenue, paybackMonths, fiveYearRoi, cumulativeCashFlow,
    npv15Year, paybackYears,
  };
}

// --- Parking Analysis ---

export function calculateParkingImpact(site: SiteAnalysis): ParkingAnalysis {
  const peakUsed = Math.round(site.totalParkingSpaces * (site.peakUtilization / 100));
  const available = site.totalParkingSpaces - peakUsed;
  const recommendedEv = Math.round(available * 0.75);
  const requestedChargers = site.chargingModel === 'tesla'
    ? site.teslaStalls
    : site.l2Chargers + site.dcfcChargers;

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
  let peakDemandKw: number;
  let totalDailyKwh: number;

  if (site.chargingModel === 'tesla') {
    const stalls = Math.max(4, site.teslaStalls);
    peakDemandKw = stalls * TESLA_PEAK_KW_PER_STALL * TESLA_LOAD_MGMT_FACTOR;
    totalDailyKwh = stalls * TESLA_KWH_PER_STALL_PER_DAY;
  } else {
    peakDemandKw = site.l2Chargers * L2_PEAK_KW + site.dcfcChargers * DCFC_PEAK_KW;
    totalDailyKwh = site.l2Chargers * L2_KWH_PER_DAY + site.dcfcChargers * DCFC_KWH_PER_DAY;
  }

  const monthlyEnergyCost = totalDailyKwh * 30 * site.electricityCostPerKwh;
  const monthlyDemandCharge = peakDemandKw * site.demandChargePerKw;
  const totalElectricity = monthlyEnergyCost + monthlyDemandCharge;
  const demandChargePercent = totalElectricity > 0 ? (monthlyDemandCharge / totalElectricity) * 100 : 0;

  const recommendations: string[] = [];

  if (site.chargingModel === 'tesla') {
    recommendations.push('Tesla\'s built-in load management dynamically shares power across stalls, reducing peak demand by ~45%');
    if (site.teslaStalls > 8) {
      recommendations.push('Battery energy storage could further reduce demand charges by 30-50% for larger installations');
    }
    if (peakDemandKw > 100) {
      recommendations.push('Contact your utility about EV-specific commercial rates — many offer reduced demand charges for EV charging');
    }
  } else {
    if (demandChargePercent > 40) {
      recommendations.push('Consider load management software to stagger charger output and reduce peak demand');
    }
    if (site.dcfcChargers > 4) {
      recommendations.push('Battery energy storage could reduce demand charges by 40-60%');
    }
    if (peakDemandKw > 100) {
      recommendations.push('Contact your utility about EV-specific commercial rates that may reduce demand charges');
    }
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

  const totalPorts = site.chargingModel === 'tesla'
    ? site.teslaStalls
    : site.l2Chargers + site.dcfcChargers;

  const totalProjectCost = site.chargingModel === 'tesla'
    ? site.teslaStalls * (TESLA_COST_PER_STALL + TESLA_INSTALL_PER_STALL)
    : site.l2Chargers * (L2_HARDWARE_COST + L2_INSTALL_COST) + site.dcfcChargers * (DCFC_HARDWARE_COST + DCFC_INSTALL_COST);

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
    eligible: site.chargingModel === 'tesla' && site.teslaStalls >= 4 ? null : null,
    details: `National Electric Vehicle Infrastructure program covers up to 80% of costs for qualifying Alternative Fuel Corridor locations. Requires minimum 4 DCFC ports at 150kW+.${site.chargingModel === 'tesla' ? ' Tesla Superchargers meet the 150kW+ requirement.' : ''}`,
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
