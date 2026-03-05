import type {
  SiteAnalysis,
  FinancialProjection,
  ParkingAnalysis,
  DemandChargeAnalysis,
  Incentive,
} from '@/types/chargeScore';

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

  // Only sum non-alternative (selected) incentives
  const totalIncentiveAmount = incentives
    .filter(i => i.eligible && !i.isAlternative)
    .reduce((sum, i) => sum + (i.computedAmount ?? 0), 0);

  // Include federal 30C only if eligible (true or null/unknown — NOT false)
  const federal30c = incentives.find(i => i.id === 'federal-30c');
  const federalAmount = (federal30c && federal30c.eligible !== false) ? federal30c.computedAmount : 0;
  const selectedTotal = totalIncentiveAmount + federalAmount;

  const estimatedIncentives = Math.min(selectedTotal, totalProjectCost);
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
    .filter(i => i.eligible && !i.isAlternative)
    .reduce((sum, i) => sum + (i.computedAmount ?? 0), 0);

  // Include federal 30C only if eligible (true or null/unknown — NOT false)
  const federal30c = incentives.find(i => i.id === 'federal-30c');
  const federalAmount = (federal30c && federal30c.eligible !== false) ? federal30c.computedAmount : 0;
  const selectedTotal = totalIncentiveAmount + federalAmount;

  const estimatedIncentives = Math.min(selectedTotal, totalProjectCost);
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

// Eligibility check result
interface EligibilityResult {
  eligible: boolean | null; // true=yes, false=no, null=unknown/verify
  reason?: string;          // why ineligible or what to verify
}

// Context passed into eligibility checks
interface EligibilityInput {
  site: SiteAnalysis;
  context?: IncentiveContext;
  totalPorts: number;
  dcfcPorts: number;
  totalProjectCost: number;
}

interface StateIncentiveGroup {
  groupId: string;
  name: string;
  amountPerPort?: number;
  amountFlat?: number;
  amountPctOfProject?: number;
  amountPctOfInstall?: number;
  displayAmount: string;
  details: string;
  layer: 'federal' | 'state' | 'utility';
  utilityMatch?: string[];
  verified: string;
  expiresAt?: string;
  programStatus: 'active' | 'accepting' | 'waitlist' | 'closed' | 'expired';
  sourceUrl?: string;
  checkEligibility?: (input: EligibilityInput) => EligibilityResult;
}

// --- Common eligibility check helpers ---
const requiresDCFC = (minPorts: number) => (input: EligibilityInput): EligibilityResult => {
  if (input.dcfcPorts < minPorts) {
    return { eligible: false, reason: `Requires minimum ${minPorts} DCFC ports (you have ${input.dcfcPorts})` };
  }
  return { eligible: true };
};

const requiresPublicAccess = () => (_input: EligibilityInput): EligibilityResult => {
  // We assume commercial property types are public-access; multifamily is not
  return { eligible: null, reason: 'Requires public access — verify site will be publicly accessible' };
};

const requiresDAC = () => (input: EligibilityInput): EligibilityResult => {
  if (!input.context) return { eligible: null, reason: 'DAC status unknown' };
  if (!input.context.isDAC) return { eligible: false, reason: 'Site is not in a disadvantaged community' };
  return { eligible: true };
};

const requiresUtilityTerritory = () => (input: EligibilityInput): EligibilityResult => {
  if (!input.context?.utilityName) return { eligible: null, reason: 'Utility territory not confirmed' };
  return { eligible: true };
};

const alwaysEligible = () => (_input: EligibilityInput): EligibilityResult => ({ eligible: true });

const combineChecks = (...checks: ((input: EligibilityInput) => EligibilityResult)[]) => {
  return (input: EligibilityInput): EligibilityResult => {
    for (const check of checks) {
      const result = check(input);
      if (result.eligible === false) return result;
      if (result.eligible === null) return result; // unknown = stop and report
    }
    return { eligible: true };
  };
};

const STATE_INCENTIVES: Record<string, StateIncentiveGroup[]> = {
  NY: [
    {
      groupId: 'ny-state-dcfc', name: 'NYSERDA NYSBIP', amountPerPort: 65000,
      displayAmount: '$65,000/port',
      details: 'Up to $65,000 per DCFC for commercial locations. Must be publicly accessible. Apply at nyserda.ny.gov.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.nyserda.ny.gov/All-Programs/EV-Make-Ready/Charging-Station-Programs',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ny-state-dcfc', name: 'EVolve NY', amountPerPort: 50000,
      displayAmount: '$50,000/port',
      details: 'Up to $50,000 per DCFC. Competitive — apply at evolveny.nypa.gov. Requires public access.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://evolveny.nypa.gov/',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ny-state-small', name: 'Charge Ready NY 2.0', amountPerPort: 4000,
      displayAmount: '$4,000/port',
      details: '$3,000-$4,000 per port (L2 or DCFC). $28M program budget. Stackable with NYSBIP.',
      layer: 'state', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.nyserda.ny.gov/All-Programs/ChargeReady-NY',
      checkEligibility: alwaysEligible(),
    },
    {
      groupId: 'ny-utility-coned', name: 'Con Edison PowerReady', amountPctOfInstall: 0.85,
      displayAmount: 'Up to 85% of installation',
      details: 'Covers up to 85% of DCFC infrastructure in ConEd territory (NYC & Westchester). Max $1.2M.',
      layer: 'utility', utilityMatch: ['con ed', 'consolidated edison'],
      verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.coned.com/en/our-energy-future/technology-innovation/electric-vehicles/powering-up-for-evs',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ny-utility-pseg', name: 'PSEG Long Island Make-Ready', amountPctOfInstall: 0.50,
      displayAmount: 'Up to 50% of installation',
      details: 'PSEG Long Island covers up to 50% of make-ready for commercial DCFC in Nassau & Suffolk counties.',
      layer: 'utility', utilityMatch: ['long island', 'lipa', 'pseg li', 'pseg long'],
      verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.psegliny.com/inthecommunity/electricvehicles/evchargingstationowners',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ny-utility-nyseg', name: 'NYSEG/RG&E Make-Ready', amountPctOfInstall: 0.90,
      displayAmount: 'Up to 90% of installation',
      details: 'Avangrid utilities cover up to 90% of make-ready for public DCFC in upstate NY.',
      layer: 'utility', utilityMatch: ['nyseg', 'rg&e', 'rochester gas', 'avangrid'],
      verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.nyseg.com/en/save-money/electric-vehicle-programs',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ny-utility-ngrid', name: 'National Grid NY Make-Ready', amountPctOfInstall: 1.0,
      displayAmount: 'Up to 100% of installation',
      details: 'National Grid covers up to 100% of make-ready for public DCFC in its NY service territory.',
      layer: 'utility', utilityMatch: ['national grid'],
      verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.nationalgridus.com/NY-Home/Energy-Saving-Programs/Electric-Vehicle-Charging-Station',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ny-utility-chge', name: 'Central Hudson Make-Ready', amountPctOfInstall: 0.50,
      displayAmount: 'Up to 50% of installation',
      details: 'Central Hudson covers up to 50% of make-ready in Hudson Valley territory.',
      layer: 'utility', utilityMatch: ['central hudson'],
      verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.cenhud.com/my-energy/electric-vehicles/',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ny-utility-oru', name: 'O&R Make-Ready', amountPctOfInstall: 0.50,
      displayAmount: 'Up to 50% of installation',
      details: 'Orange & Rockland covers up to 50% of make-ready for public DCFC.',
      layer: 'utility', utilityMatch: ['orange', 'rockland', 'o&r'],
      verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.oru.com/en/our-energy-future/electric-vehicles',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
  ],
  CA: [
    {
      groupId: 'ca-state', name: 'Fast Charge California', amountPerPort: 100000,
      displayAmount: '$100,000/port',
      details: 'Up to $100,000 per DCFC port. CEC-administered. Must be publicly accessible.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.energy.ca.gov/programs-and-topics/programs/fast-charge-california',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ca-lcfs', name: 'LCFS Credits', amountPerPort: 15000,
      displayAmount: '$15,000/yr/port',
      details: 'Low Carbon Fuel Standard credits: $10-20K/yr per DCFC based on utilization. Ongoing revenue.',
      layer: 'state', verified: '2025-06', programStatus: 'active', expiresAt: 'ongoing',
      sourceUrl: 'https://ww2.arb.ca.gov/our-work/programs/low-carbon-fuel-standard',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ca-utility', name: 'SCE/PG&E Charge Ready', amountPctOfInstall: 1.0,
      displayAmount: 'Up to 100% of installation',
      details: 'Major utilities cover 100% of make-ready. Priority for disadvantaged communities.',
      layer: 'utility', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.sce.com/business/electric-cars/charge-ready',
      checkEligibility: alwaysEligible(),
    },
  ],
  MA: [
    {
      groupId: 'ma-state', name: 'MassEVIP', amountPerPort: 50000,
      displayAmount: '$50,000/port',
      details: 'Up to $50,000 per DCFC through MassDEP. $14M pool. Must be publicly accessible.',
      layer: 'state', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.mass.gov/how-to/apply-for-massevip-public-access-charging',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ma-utility', name: 'Eversource Make-Ready', amountPctOfInstall: 1.0,
      displayAmount: 'Up to 100% of installation',
      details: 'Eversource covers up to 100% of make-ready for public DCFC.',
      layer: 'utility', utilityMatch: ['eversource'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.eversource.com/content/residential/save-money-energy/explore-alternatives/electric-vehicles/ev-charging-stations',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
    {
      groupId: 'ma-utility', name: 'National Grid EV Program', amountPerPort: 80000,
      displayAmount: '$80,000/port',
      details: 'Up to $80,000 per DCFC port in National Grid MA territory.',
      layer: 'utility', utilityMatch: ['national grid'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.nationalgridus.com/MA-Home/Energy-Saving-Programs/Electric-Vehicle-Charging-Station',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
  ],
  CO: [
    {
      groupId: 'co-state', name: 'Charge Ahead Colorado', amountPctOfProject: 0.8,
      displayAmount: 'Up to 80% of project',
      details: 'Up to 80% of total DCFC project cost with NO CAP for public stations.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://energyoffice.colorado.gov/charge-ahead-colorado',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'co-utility', name: 'Xcel Energy EV Program', amountPctOfInstall: 0.5,
      displayAmount: 'Up to 50% of installation',
      details: 'Make-ready support and reduced commercial EV rates in Xcel territory.',
      layer: 'utility', utilityMatch: ['xcel'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://co.my.xcelenergy.com/s/business/ev',
      checkEligibility: combineChecks(requiresUtilityTerritory()),
    },
  ],
  NJ: [
    {
      groupId: 'nj-state', name: 'It Pay$ to Plug In', amountPerPort: 100000,
      displayAmount: '$100,000/port',
      details: 'Up to $100,000 per DCFC port. Priority near transit and multifamily housing.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.njcleanenergy.com/ev',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'nj-utility', name: 'PSE&G Make-Ready', amountPctOfInstall: 0.7,
      displayAmount: 'Up to 70% of installation',
      details: 'PSE&G covers make-ready infrastructure costs in its territory.',
      layer: 'utility', utilityMatch: ['pseg', 'pse&g', 'public service'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://nj.pseg.com/saveenergyandmoney/solutionsforbusiness/electricvehicles',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
  ],
  CT: [
    {
      groupId: 'ct-state', name: 'CT EV Charging Program', amountPerPort: 50000,
      displayAmount: '$50,000/port',
      details: 'Up to $50,000 per DCFC through DEEP.',
      layer: 'state', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://portal.ct.gov/deep/air/mobile-sources/ev-charging',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'ct-utility', name: 'Eversource CT Make-Ready', amountPctOfInstall: 0.5,
      displayAmount: 'Up to 50% of installation',
      details: 'Make-ready support in Eversource CT territory.',
      layer: 'utility', utilityMatch: ['eversource'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.eversource.com/content/ct-c/residential/save-money-energy/explore-alternatives/electric-vehicles',
      checkEligibility: combineChecks(requiresUtilityTerritory()),
    },
  ],
  WA: [
    {
      groupId: 'wa-state', name: 'WA State EV Grants', amountPerPort: 50000,
      displayAmount: '$50,000/port',
      details: 'Up to $50K per DCFC. $85M+ program.',
      layer: 'state', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.commerce.wa.gov/growing-the-economy/energy/clean-energy-fund/electrification-of-transportation/',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
  ],
  OR: [
    {
      groupId: 'or-state', name: 'Oregon Clean Fuels Credits', amountPerPort: 12000,
      displayAmount: '$12,000/yr/port',
      details: 'CFP credits generate ongoing revenue per DCFC based on utilization.',
      layer: 'state', verified: '2025-06', programStatus: 'active', expiresAt: 'ongoing',
      sourceUrl: 'https://www.oregon.gov/deq/ghgp/cfp/Pages/default.aspx',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
  ],
  MI: [
    {
      groupId: 'mi-utility', name: 'DTE Energy DCFC Rebate', amountPerPort: 55000,
      displayAmount: '$55,000/port',
      details: 'DTE offers up to $55,000 per DCFC station in its territory.',
      layer: 'utility', utilityMatch: ['dte'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://newlook.dteenergy.com/wps/wcm/connect/dte-web/home/service-request/business/electric/electric-vehicles',
      checkEligibility: combineChecks(requiresUtilityTerritory(), requiresDCFC(1)),
    },
  ],
  IL: [
    {
      groupId: 'il-state', name: 'IL Charge Ahead', amountPerPort: 45000,
      displayAmount: '$45,000/port',
      details: 'Up to $45,000 per DCFC through IL EPA.',
      layer: 'state', verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://epa.illinois.gov/topics/ceja/ev-charging-grants.html',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
    {
      groupId: 'il-utility', name: 'ComEd EV Rebate', amountPerPort: 10000,
      displayAmount: '$10,000/port',
      details: 'ComEd offers up to $10,000 for commercial EV charging in its territory.',
      layer: 'utility', utilityMatch: ['comed', 'commonwealth edison'], verified: '2025-03', programStatus: 'accepting',
      sourceUrl: 'https://www.comed.com/SmartEnergy/InnovativeTechnologies/Pages/ElectricVehicles.aspx',
      checkEligibility: combineChecks(requiresUtilityTerritory()),
    },
  ],
  TX: [
    {
      groupId: 'tx-state', name: 'TCEQ DCFC Program', amountPerPort: 60000,
      displayAmount: '$60,000/port',
      details: 'VW settlement funds — up to $60K per DCFC. Limited remaining funds.',
      layer: 'state', verified: '2025-03', programStatus: 'waitlist', expiresAt: '2026-09',
      sourceUrl: 'https://www.tceq.texas.gov/airquality/terp/dctf.html',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
  ],
  FL: [
    {
      groupId: 'fl-state', name: 'FL NEVI Allocation', amountPctOfProject: 0.8,
      displayAmount: 'Up to 80% of project',
      details: 'Florida $198M NEVI allocation. Covers up to 80% for highway corridor DCFC. Requires corridor location.',
      layer: 'state', verified: '2025-06', programStatus: 'accepting',
      sourceUrl: 'https://www.fdot.gov/planning/nevi',
      checkEligibility: (input) => {
        if (!input.context) return { eligible: null, reason: 'Corridor status unknown' };
        if (!input.context.isOnCorridor) return { eligible: false, reason: 'Site is not on a designated highway corridor' };
        if (input.dcfcPorts < 4) return { eligible: false, reason: `Requires minimum 4 DCFC ports (you have ${input.dcfcPorts})` };
        return { eligible: true };
      },
    },
  ],
  PA: [
    {
      groupId: 'pa-state', name: 'Driving PA Forward', amountPerPort: 40000,
      displayAmount: '$40,000/port',
      details: 'Up to $40,000 per DCFC through VW settlement. Limited remaining funds.',
      layer: 'state', verified: '2025-03', programStatus: 'waitlist', expiresAt: '2026-06',
      sourceUrl: 'https://www.dep.pa.gov/Citizens/GrantsLoansRebates/DrivingPAForward/Pages/default.aspx',
      checkEligibility: combineChecks(requiresDCFC(1)),
    },
  ],
};

export interface IncentiveContext {
  isDAC: boolean;            // Disadvantaged community — required for 30C
  isOnCorridor: boolean;     // Alt fuel corridor — required for NEVI
  utilityName?: string | null; // Detected utility — filters utility-specific programs
}

// --- NREL program amount parser ---
// Known NREL program IDs with computable amounts
interface NrelAmountRule {
  match: (title: string, text: string) => boolean;
  compute: (totalProjectCost: number, installCost: number, totalPorts: number, dcfcPorts: number) => { amount: number; description: string };
}

const NREL_AMOUNT_RULES: NrelAmountRule[] = [
  {
    // NY Alternative Fueling Infrastructure Tax Credit — 50% of infrastructure cost
    match: (title) => /alternative\s+fuel.*(?:tax\s+credit|infrastructure\s+(?:tax\s+)?credit)/i.test(title),
    compute: (totalProjectCost) => ({
      amount: Math.round(totalProjectCost * 0.5),
      description: 'State tax credit equal to 50% of EV charging infrastructure cost (NY Tax Law 187-b).',
    }),
  },
  {
    // Generic "X% of cost" pattern
    match: (_, text) => /\b(\d{1,3})\s?%\s+of\s+(the\s+)?(infrastructure|project|equipment|installation|total)\s+cost/i.test(text),
    compute: (totalProjectCost, _install, _total, _dcfc) => {
      // We'll extract the % dynamically in the converter below
      return { amount: 0, description: '' };
    },
  },
  {
    // Per-port dollar amounts like "$X,XXX per port/charger/station"
    match: (_, text) => /\$\s?\d[\d,]+\s+(?:per|\/)\s*(?:port|charger|station|unit)/i.test(text),
    compute: () => ({ amount: 0, description: '' }),
  },
];

function computeNrelAmount(
  title: string,
  text: string,
  totalProjectCost: number,
  installCost: number,
  totalPorts: number,
  dcfcPorts: number,
): { amount: number; description: string } | null {
  const combined = `${title} ${text}`.toLowerCase();

  // Known program: Alternative Fueling Infrastructure Tax Credit (50%)
  if (/alternative\s+fuel.*(?:infrastructure|fueling)/i.test(title) && combined.includes('50%')) {
    return {
      amount: Math.round(totalProjectCost * 0.5),
      description: 'State tax credit = 50% of EV charging infrastructure cost (NY Tax Law 187-b).',
    };
  }

  // Generic percentage of cost
  const pctMatch = combined.match(/(?:tax\s+credit|rebate|grant|incentive|covers?|up\s+to)\s+(?:is\s+)?(?:equal\s+to\s+)?(\d{1,3})\s?%\s+of\s+(?:the\s+)?(?:infrastructure|project|equipment|installation|total|eligible)\s+cost/i);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10) / 100;
    return {
      amount: Math.round(totalProjectCost * pct),
      description: `${pctMatch[1]}% of project cost.`,
    };
  }

  // Per-port amounts like "$50,000 per port"
  const perPortMatch = combined.match(/\$\s?([\d,]+)\s+(?:per|\/)\s*(?:port|charger|station|unit|connector)/i);
  if (perPortMatch) {
    const perPort = parseInt(perPortMatch[1].replace(/,/g, ''), 10);
    if (perPort > 0 && perPort < 500000) {
      return {
        amount: perPort * totalPorts,
        description: `$${perPort.toLocaleString()} per port × ${totalPorts} ports.`,
      };
    }
  }

  // Flat dollar amount like "up to $X,XXX"
  const flatMatch = combined.match(/up\s+to\s+\$\s?([\d,]+(?:\.\d+)?)\s*(?:million|per\s+project)?/i);
  if (flatMatch) {
    let flatAmount = parseFloat(flatMatch[1].replace(/,/g, ''));
    if (combined.includes('million')) flatAmount *= 1_000_000;
    if (flatAmount > 0 && flatAmount < 10_000_000) {
      return {
        amount: Math.min(flatAmount, totalProjectCost),
        description: `Up to $${flatAmount.toLocaleString()}.`,
      };
    }
  }

  return null;
}

import type { NrelIncentive } from '@/lib/api/incentives';

export function getIncentives(site: SiteAnalysis, context?: IncentiveContext, nrelPrograms?: NrelIncentive[]): Incentive[] {
  const incentives: Incentive[] = [];

  const totalPorts = site.chargingModel === 'tesla'
    ? site.teslaStalls
    : site.l2Chargers + site.dcfcChargers;

  const totalProjectCost = site.chargingModel === 'tesla'
    ? site.teslaStalls * (TESLA_COST_PER_STALL + TESLA_INSTALL_PER_STALL)
    : site.l2Chargers * (L2_HARDWARE_COST + L2_INSTALL_COST) + site.dcfcChargers * (DCFC_HARDWARE_COST + DCFC_INSTALL_COST);

  const installCost = site.chargingModel === 'tesla'
    ? site.teslaStalls * TESLA_INSTALL_PER_STALL
    : site.l2Chargers * L2_INSTALL_COST + site.dcfcChargers * DCFC_INSTALL_COST;

  const maxPerPort = 100000;

  // --- Federal 30C: requires eligible census tract (DAC / low-income) ---
  const federal30cAmount = Math.min(totalProjectCost * 0.3, totalPorts * maxPerPort);
  const is30cEligible = context ? context.isDAC : null;

  incentives.push({
    id: 'federal-30c',
    name: 'Federal 30C Tax Credit',
    description: is30cEligible === false
      ? 'NOT ELIGIBLE — site is not in a qualifying census tract'
      : '30% of hardware + installation costs',
    amount: is30cEligible === false ? '$0' : `$${Math.round(federal30cAmount).toLocaleString()}`,
    computedAmount: is30cEligible === false ? 0 : federal30cAmount,
    eligible: is30cEligible,
    details: is30cEligible === false
      ? 'This site is NOT in an eligible low-income or disadvantaged census tract. The 30C Alternative Fuel Vehicle Refueling Property Credit requires the property to be in a qualifying area per IRS guidance. Consider NEVI or state/utility programs instead.'
      : `30% of equipment + installation, up to $100,000 per port. Must be in eligible census tract. Expires June 2026.`,
    category: 'federal',
    expiresAt: 'Jun 2026',
    isAlternative: false,
    sourceUrl: 'https://afdc.energy.gov/laws/10513',
  });

  // --- NEVI: requires alt fuel corridor + minimum 4 DCFC ports at 150kW+ ---
  const neviAmount = totalProjectCost * 0.8;
  const meetsNeviPortReq = site.chargingModel === 'tesla'
    ? site.teslaStalls >= 4
    : site.dcfcChargers >= 4;
  const isNeviEligible = context
    ? (context.isOnCorridor && meetsNeviPortReq)
    : null;

  const neviIneligibleReasons: string[] = [];
  if (context && !context.isOnCorridor) neviIneligibleReasons.push('site is not on a designated Alternative Fuel Corridor');
  if (context && !meetsNeviPortReq) neviIneligibleReasons.push(`minimum 4 DCFC ports required (you have ${site.chargingModel === 'tesla' ? site.teslaStalls : site.dcfcChargers})`);

  incentives.push({
    id: 'nevi',
    name: 'NEVI Formula Program',
    description: isNeviEligible === false
      ? `NOT ELIGIBLE — ${neviIneligibleReasons.join('; ')}`
      : 'Up to 80% — highway corridor only',
    amount: isNeviEligible === false ? '$0' : `$${Math.round(neviAmount).toLocaleString()}`,
    computedAmount: isNeviEligible === false ? 0 : neviAmount,
    eligible: isNeviEligible,
    details: isNeviEligible === false
      ? `This site does not qualify for NEVI: ${neviIneligibleReasons.join('; ')}. NEVI requires the location to be on a designated Alternative Fuel Corridor with at least 4 DCFC ports rated 150kW+.`
      : `National Electric Vehicle Infrastructure program covers up to 80% of costs for qualifying Alternative Fuel Corridor locations. Requires minimum 4 DCFC ports at 150kW+.${site.chargingModel === 'tesla' ? ' Tesla Superchargers meet the 150kW+ requirement.' : ''}`,
    category: 'federal',
    isAlternative: true,
    sourceUrl: 'https://www.fhwa.dot.gov/environment/alternative_fuel_corridors/nominations/90d_nevi_formula_program_guidance.pdf',
  });

  // --- State & Utility programs (pick best per mutually-exclusive group) ---
  const statePrograms = STATE_INCENTIVES[site.state] || [];
  const detectedUtility = context?.utilityName?.toLowerCase() ?? '';

  const dcfcPorts = site.chargingModel === 'tesla' ? site.teslaStalls : site.dcfcChargers;
  const eligInput: EligibilityInput = { site, context, totalPorts, dcfcPorts, totalProjectCost };

  // Filter: utility programs with utilityMatch only show if the detected utility matches
  const filteredPrograms = statePrograms.filter(prog => {
    if (!prog.utilityMatch) return true;
    if (!detectedUtility) return false;
    return prog.utilityMatch.some(kw => detectedUtility.includes(kw));
  });

  const programsWithAmounts = filteredPrograms.map((prog, i) => {
    let computedAmount = 0;
    if (prog.amountPerPort) computedAmount = prog.amountPerPort * totalPorts;
    else if (prog.amountFlat) computedAmount = prog.amountFlat;
    else if (prog.amountPctOfProject) computedAmount = Math.round(totalProjectCost * prog.amountPctOfProject);
    else if (prog.amountPctOfInstall) computedAmount = Math.round(installCost * prog.amountPctOfInstall);

    // Run eligibility check if defined
    const eligResult = prog.checkEligibility
      ? prog.checkEligibility(eligInput)
      : { eligible: true as boolean | null };

    return { ...prog, computedAmount, index: i, eligResult };
  });

  // Group by groupId — pick the highest-value program per group
  const groups = new Map<string, typeof programsWithAmounts>();
  for (const p of programsWithAmounts) {
    const arr = groups.get(p.groupId) || [];
    arr.push(p);
    groups.set(p.groupId, arr);
  }

  for (const [, members] of groups) {
    members.sort((a, b) => b.computedAmount - a.computedAmount);
    members.forEach((prog, idx) => {
      // Skip expired programs entirely
      if (prog.programStatus === 'expired' || prog.programStatus === 'closed') return;

      const isEligible = prog.eligResult.eligible;
      const ineligibleReason = prog.eligResult.reason;

      incentives.push({
        id: `${prog.layer}-${prog.index}`,
        name: prog.name,
        description: isEligible === false
          ? `NOT ELIGIBLE — ${ineligibleReason}`
          : isEligible === null
            ? `${ineligibleReason || 'Verify eligibility'}`
            : prog.details.slice(0, 80) + '...',
        amount: isEligible === false ? '$0' : `$${prog.computedAmount.toLocaleString()}`,
        computedAmount: isEligible === false ? 0 : prog.computedAmount,
        eligible: isEligible,
        details: isEligible === false
          ? `${prog.details}\n\nNOT ELIGIBLE: ${ineligibleReason}`
          : prog.details,
        category: prog.layer,
        isAlternative: idx > 0,
        verified: prog.verified,
        expiresAt: prog.expiresAt,
        programStatus: prog.programStatus,
      });
    });
  }

  // --- NREL API programs: convert to Incentive objects with computed amounts ---
  if (nrelPrograms && nrelPrograms.length > 0) {
    // Track which curated programs we already have by name similarity
    const curatedNames = new Set(incentives.map(i => i.name.toLowerCase()));

    for (const nrel of nrelPrograms) {
      // Skip if we already have a curated version of this program
      const nrelNameLower = nrel.title.toLowerCase();
      const isDuplicate = Array.from(curatedNames).some(name => {
        // Check for significant word overlap
        const words = name.split(/\s+/).filter(w => w.length > 3);
        const matchCount = words.filter(w => nrelNameLower.includes(w)).length;
        return matchCount >= 2;
      });
      if (isDuplicate) continue;

      // Skip laws/regulations — only show actual financial incentives
      if (nrel.type === 'Laws and Regulations') continue;

      // Compute amount from description
      const computed = computeNrelAmount(
        nrel.title,
        nrel.description || '',
        totalProjectCost,
        installCost,
        totalPorts,
        dcfcPorts,
      );

      const category = nrel.category || inferNrelCategory(nrel.type);
      const computedAmount = computed?.amount ?? 0;
      const hasAmount = computedAmount > 0;

      incentives.push({
        id: `nrel-${nrel.id}`,
        name: nrel.title,
        description: computed?.description || nrel.description?.slice(0, 100) || 'Contact program for details.',
        amount: hasAmount ? `$${computedAmount.toLocaleString()}` : 'Contact for details',
        computedAmount: hasAmount ? computedAmount : 0,
        eligible: true,
        details: `${nrel.description || nrel.title}\n\nSource: NREL AFDC • https://afdc.energy.gov/laws/${nrel.id}`,
        category,
        isAlternative: false,
        programStatus: 'active',
      });
    }
  }

  return incentives;
}

function inferNrelCategory(type: string): 'federal' | 'state' | 'utility' | 'other' {
  const t = type.toLowerCase();
  if (t.includes('utility') || t.includes('private')) return 'utility';
  if (t.includes('state')) return 'state';
  if (t.includes('federal')) return 'federal';
  return 'other';
}
