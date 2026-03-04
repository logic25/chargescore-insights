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
const TESLA_COST_PER_STALL = 50000;      // BOM per V4 Post (Source: Tesla V4 Canvas 2025)
const TESLA_INSTALL_PER_STALL = 50000;    // Installation per charger (Tesla High Cost estimate)
const TESLA_KWH_PER_STALL_PER_DAY = 250;  // Medium utilization (Source: Tesla ROI Calculator)
const TESLA_PEAK_KW_PER_STALL = 325;      // V4 max output kW (kept for reference only)
const TESLA_UTILIZATION_GROWTH = 1.07;     // 7% YoY utilization growth
const TESLA_FEE_ESCALATION = 1.03;        // 3% YoY Tesla service fee escalation
const DISCOUNT_RATE = 0.08;               // 8% discount rate for NPV
const PROJECT_YEARS = 15;                 // 15-year analysis

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
  // CRITICAL: electricityCostPerKwh is a LEVELIZED rate that ALREADY INCLUDES demand charges.
  // Do NOT calculate demand charges separately — that double-counts.
  const dailyKwh = baseDailyKwh;
  const dailyRevenue = dailyKwh * site.pricePerKwh;
  const monthlyRevenue = dailyRevenue * 30;
  const annualRevenue = monthlyRevenue * 12;

  // Only two operating cost lines:
  // 1. Electricity (levelized — includes demand charges, TOU, surcharges)
  const monthlyElectricityCost = dailyKwh * 30 * site.electricityCostPerKwh;
  // 2. Tesla service fee
  const teslaServiceFeeAnnual = dailyKwh * site.teslaServiceFeePerKwh * 365;

  // NO separate demand charge — it's embedded in the levelized electricity rate
  const monthlyDemandCharge = 0;
  const monthlyNetworkingCost = 0;
  const annualMaintenance = 0; // Tesla handles maintenance

  const totalAnnualOperatingCost = (monthlyElectricityCost * 12) + teslaServiceFeeAnnual;

  // Capital costs
  const totalHardwareCost = stalls * TESLA_COST_PER_STALL;
  const totalInstallationCost = stalls * TESLA_INSTALL_PER_STALL;

  const needsUpgrade = (site.electricalService === 'unknown' || site.electricalService === '200a-208v' || site.electricalService === '400a-208v') && stalls > 4;
  const electricalUpgradeCost: [number, number] = needsUpgrade ? [75000, 150000] : [0, 0];

  const totalProjectCost = totalHardwareCost + totalInstallationCost + (needsUpgrade ? electricalUpgradeCost[0] : 0);

  const totalIncentiveAmount = incentives
    .filter(i => i.eligible)
    .reduce((sum, i) => {
      const match = i.amount.match(/[\d,]+/);
      if (match) return sum + parseInt(match[0].replace(/,/g, ''), 10);
      return sum;
    }, 0);

  const estimatedIncentives = Math.min(totalIncentiveAmount, totalProjectCost);
  const netInvestment = Math.max(0, totalProjectCost - estimatedIncentives);
  const annualNetRevenue = annualRevenue - totalAnnualOperatingCost;

  // 15-year cash flow with 7% utilization growth and 3% Tesla fee escalation
  const cumulativeCashFlow: number[] = [];
  let npv15Year = -netInvestment;
  let paybackYears = Infinity;

  for (let year = 1; year <= PROJECT_YEARS; year++) {
    const growthFactor = Math.pow(TESLA_UTILIZATION_GROWTH, year - 1);
    const feeEscalation = Math.pow(TESLA_FEE_ESCALATION, year - 1);
    const yearDailyKwh = baseDailyKwh * growthFactor;
    const yearAnnualRevenue = yearDailyKwh * site.pricePerKwh * 365;
    const yearElectricity = yearDailyKwh * 365 * site.electricityCostPerKwh;
    const yearTeslaFee = yearDailyKwh * site.teslaServiceFeePerKwh * feeEscalation * 365;
    // NO demand charge line — already in levelized electricity rate
    const yearNetRevenue = yearAnnualRevenue - yearElectricity - yearTeslaFee;

    const prev = year === 1 ? -netInvestment : cumulativeCashFlow[year - 2];
    cumulativeCashFlow.push(prev + yearNetRevenue);

    npv15Year += yearNetRevenue / Math.pow(1 + DISCOUNT_RATE, year);

    if (paybackYears === Infinity && cumulativeCashFlow[year - 1] >= 0) {
      paybackYears = year;
    }
  }

  const paybackMonths = annualNetRevenue > 0 ? (netInvestment / annualNetRevenue) * 12 : Infinity;
  const fiveYearRoi = netInvestment > 0 ? ((cumulativeCashFlow[4] + netInvestment) / netInvestment) * 100 : (cumulativeCashFlow[4] > 0 ? Infinity : 0);

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

  const estimatedIncentives = Math.min(totalIncentiveAmount, totalProjectCost);
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

  const fiveYearRoi = netInvestment > 0 ? ((cumulativeCashFlow[4] + netInvestment) / netInvestment) * 100 : (cumulativeCashFlow[4] > 0 ? Infinity : 0);

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

// --- Demand Charge Analysis (kept for generic model only) ---

export function calculateDemandCharge(site: SiteAnalysis): DemandChargeAnalysis {
  let peakDemandKw: number;
  let totalDailyKwh: number;

  if (site.chargingModel === 'tesla') {
    // For Tesla model, demand charges are embedded in levelized electricity rate
    const stalls = Math.max(4, site.teslaStalls);
    peakDemandKw = stalls * TESLA_PEAK_KW_PER_STALL * 0.55; // reference only
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
    recommendations.push('Demand charges are included in your levelized electricity rate — no separate calculation needed.');
  } else {
    if (demandChargePercent > 40) recommendations.push('Consider load management software to reduce peak demand');
    if (site.dcfcChargers > 4) recommendations.push('Battery storage could reduce demand charges by 40-60%');
    if (peakDemandKw > 100) recommendations.push('Contact your utility about EV-specific commercial rates');
  }
  if (recommendations.length === 0) recommendations.push('Your current configuration has manageable demand charges');

  return { peakDemandKw, monthlyDemandCharge, monthlyEnergyCost, demandChargePercent, recommendations };
}

// --- Incentives ---

interface StateIncentive {
  name: string;
  amountPerPort?: number;       // flat $ per port
  amountFlat?: number;          // flat $ total
  amountPctOfProject?: number;  // percentage of project cost (0-1)
  amountPctOfInstall?: number;  // percentage of installation cost (0-1)
  displayAmount: string;        // for UI display
  details: string;
  layer: 'federal' | 'state' | 'utility';
}

const STATE_INCENTIVES: Record<string, StateIncentive[]> = {
  NY: [
    { name: 'NYSERDA NYSBIP', amountPerPort: 65000, displayAmount: '$65,000/port', details: 'Up to $65,000 per DCFC for commercial locations. Apply at nyserda.ny.gov', layer: 'state' },
    { name: 'EVolve NY', amountPerPort: 50000, displayAmount: '$50,000/port', details: 'Up to $50,000 per DCFC. Competitive — apply at evolveny.nypa.gov', layer: 'state' },
    { name: 'Charge Ready NY 2.0', amountPerPort: 4000, displayAmount: '$4,000/port', details: '$3,000-$4,000 per port. $28M program budget.', layer: 'state' },
    { name: 'Joint Utilities Make-Ready', amountPctOfInstall: 1.0, displayAmount: 'Up to 100% of installation', details: 'NY utilities cover up to 100% of electrical infrastructure. $1.24B program. Contact your utility.', layer: 'utility' },
    { name: 'Con Edison PowerReady', amountPctOfInstall: 0.85, displayAmount: 'Up to 85% of installation', details: 'Covers up to 85% of DCFC infrastructure in ConEd territory. Max $1.2M.', layer: 'utility' },
  ],
  CA: [
    { name: 'Fast Charge California', amountPerPort: 100000, displayAmount: '$100,000/port', details: 'Up to $100,000 per DCFC port. Successor to CALeVIP.', layer: 'state' },
    { name: 'LCFS Credits', amountPerPort: 15000, displayAmount: '$15,000/yr/port', details: 'Low Carbon Fuel Standard credits: $10-20K/yr per DCFC based on utilization.', layer: 'state' },
    { name: 'SCE/PG&E Charge Ready', amountPctOfInstall: 1.0, displayAmount: 'Up to 100% of installation', details: 'Major utilities cover 100% of make-ready in disadvantaged communities.', layer: 'utility' },
  ],
  MA: [
    { name: 'MassEVIP', amountPerPort: 50000, displayAmount: '$50,000/port', details: 'Up to $50,000 per DCFC through MassDEP. $14M program pool.', layer: 'state' },
    { name: 'Eversource Make-Ready', amountPctOfInstall: 1.0, displayAmount: 'Up to 100% of installation', details: 'Eversource covers up to 100% of make-ready for public DCFC.', layer: 'utility' },
    { name: 'National Grid EV Program', amountPerPort: 80000, displayAmount: '$80,000/port', details: 'Up to $80,000 per DCFC port in National Grid MA territory.', layer: 'utility' },
  ],
  CO: [
    { name: 'Charge Ahead Colorado', amountPctOfProject: 0.8, displayAmount: 'Up to 80% of project', details: 'Up to 80% of total DCFC project cost with NO CAP for public stations.', layer: 'state' },
    { name: 'Xcel Energy EV Program', amountPctOfInstall: 0.5, displayAmount: 'Up to 50% of installation', details: 'Make-ready support and reduced commercial EV rates.', layer: 'utility' },
  ],
  NJ: [
    { name: 'It Pay$ to Plug In', amountPerPort: 100000, displayAmount: '$100,000/port', details: 'Up to $100,000 per DCFC PORT near transit and multifamily housing.', layer: 'state' },
    { name: 'PSE&G Make-Ready', amountPctOfInstall: 0.7, displayAmount: 'Up to 70% of installation', details: 'PSE&G covers make-ready infrastructure costs.', layer: 'utility' },
  ],
  CT: [
    { name: 'CT EV Charging Program', amountPerPort: 50000, displayAmount: '$50,000/port', details: 'Up to $50,000 per DCFC through state program.', layer: 'state' },
    { name: 'Eversource CT Make-Ready', amountPctOfInstall: 0.5, displayAmount: 'Up to 50% of installation', details: 'Make-ready infrastructure support in Eversource CT territory.', layer: 'utility' },
  ],
  WA: [
    { name: 'WA State EV Grants', amountPerPort: 50000, displayAmount: '$50,000/port', details: 'Up to $50K per DCFC. $85M+ program with multiple funding rounds.', layer: 'state' },
  ],
  OR: [
    { name: 'Oregon Clean Fuels Credits', amountPerPort: 12000, displayAmount: '$12,000/yr/port', details: 'CFP credits generate ongoing revenue per DCFC based on utilization.', layer: 'state' },
  ],
  MI: [
    { name: 'DTE Energy DCFC Rebate', amountPerPort: 55000, displayAmount: '$55,000/port', details: 'DTE offers up to $55,000 per DCFC station.', layer: 'utility' },
  ],
  IL: [
    { name: 'IL Charge Ahead', amountPerPort: 45000, displayAmount: '$45,000/port', details: 'Up to $45,000 per DCFC through IL EPA.', layer: 'state' },
    { name: 'ComEd EV Rebate', amountPerPort: 10000, displayAmount: '$10,000/port', details: 'ComEd offers up to $10,000 for commercial EV charging.', layer: 'utility' },
  ],
  TX: [
    { name: 'TCEQ DCFC Program', amountPerPort: 60000, displayAmount: '$60,000/port', details: 'VW settlement funds — up to $60K per DCFC. Check availability.', layer: 'state' },
  ],
  FL: [
    { name: 'FL NEVI Allocation', amountPctOfProject: 0.8, displayAmount: 'Up to 80% of project', details: 'Florida received $198M in federal NEVI. Covers up to 80% for highway corridor DCFC.', layer: 'state' },
  ],
  PA: [
    { name: 'Driving PA Forward', amountPerPort: 40000, displayAmount: '$40,000/port', details: 'Up to $40,000 per DCFC through VW settlement program.', layer: 'state' },
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
    details: `30% of equipment + installation, up to $100,000 per port. Must be in eligible census tract. Expires June 2026.`,
    category: 'federal',
    expiresAt: 'Jun 2026',
  });

  incentives.push({
    id: 'nevi',
    name: 'NEVI Formula Program',
    description: 'Up to 80% of project costs for highway corridor locations',
    amount: `$${Math.round(totalProjectCost * 0.8).toLocaleString()}`,
    eligible: null,
    details: `National Electric Vehicle Infrastructure program covers up to 80% of costs for qualifying Alternative Fuel Corridor locations. Requires minimum 4 DCFC ports at 150kW+. Must be on designated Alternative Fuel Corridor. Expanding to all public roads in 2026.${site.chargingModel === 'tesla' ? ' Tesla Superchargers meet the 150kW+ requirement.' : ''}`,
    category: 'federal',
  });

  const statePrograms = STATE_INCENTIVES[site.state] || [];
  const installCost = site.chargingModel === 'tesla'
    ? site.teslaStalls * TESLA_INSTALL_PER_STALL
    : site.l2Chargers * L2_INSTALL_COST + site.dcfcChargers * DCFC_INSTALL_COST;

  statePrograms.forEach((prog, i) => {
    let computedAmount = 0;
    if (prog.amountPerPort) computedAmount = prog.amountPerPort * totalPorts;
    else if (prog.amountFlat) computedAmount = prog.amountFlat;
    else if (prog.amountPctOfProject) computedAmount = Math.round(totalProjectCost * prog.amountPctOfProject);
    else if (prog.amountPctOfInstall) computedAmount = Math.round(installCost * prog.amountPctOfInstall);

    incentives.push({
      id: `${prog.layer}-${i}`,
      name: prog.name,
      description: prog.details.slice(0, 80) + '...',
      amount: `$${computedAmount.toLocaleString()}`,
      eligible: true,
      details: prog.details,
      category: prog.layer,
    });
  });

  return incentives;
}
