// ── Types ──────────────────────────────────────────────────────────────────
import { computeMarginPerKwh, computeAnnualGrossRevenue, computeAnnualNOI } from './calculations';

export interface MasterControls {
  hurdleRate: number;        // e.g. 0.10
  tier1OwnerSplit: number;   // e.g. 0.85
  tier2OwnerSplit: number;   // e.g. 0.60
  kwhMultiplier: number;     // e.g. 1.0
  noiGrowthRate: number;     // e.g. 0.03
  holdPeriod: number;        // e.g. 5
  exitMultiple: number;      // e.g. 10
  msPromoteAtExit: number;   // e.g. 0.35
}

export interface SiteRow {
  id: string;
  name: string;
  address: string;
  stalls: number;
  baseKwhPerStallPerDay: number;
  customerPrice: number;
  electricityCost: number;
  teslaFee: number;         // fixed 0.10
  bomPerStall: number;      // fixed 62500
  installPerStall: number;  // default 25000
  incentives: number;
  insurance: number;        // default 5000
  monthlyRent: number;      // default 0
}

export interface ComputedSite extends SiteRow {
  effectiveKwhPerDay: number;
  marginPerKwh: number;
  totalProjectCost: number;
  outOfPocket: number;
  annualNOI: number;
  ownerAnnualTier1: number;
  msAnnualTier1: number;
  cocReturn: number | null;
}

export interface WaterfallYearRow {
  year: number;
  portfolioNOI: number;
  cumulativeOwnerTarget: number;
  tier1NOI: number;
  ownerTier1: number;
  msTier1: number;
  cumulativeOwnerDist: number;
  ownerMadeWhole: boolean;
  tier2NOI: number;
  ownerTier2: number;
  msTier2: number;
  ownerTotal: number;
  msTotal: number;
  ownerCumulative: number;
  msCumulative: number;
}

export interface ExitAnalysis {
  exitValue: number;
  dispositionFee: number;
  ownerPreferredAtExit: number;
  msPromoteAmount: number;
  ownerExitProceeds: number;
  msExitProceeds: number;
  ownerTotalReturn: number;
  msTotalReturn: number;
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_CONTROLS: MasterControls = {
  hurdleRate: 0.10,
  tier1OwnerSplit: 0.85,
  tier2OwnerSplit: 0.60,
  kwhMultiplier: 1.0,
  noiGrowthRate: 0.03,
  holdPeriod: 5,
  exitMultiple: 10,
  msPromoteAtExit: 0.35,
};

// ── Calculations ───────────────────────────────────────────────────────────

export function computeSite(site: SiteRow, controls: MasterControls): ComputedSite {
  const effectiveKwhPerDay = site.baseKwhPerStallPerDay * controls.kwhMultiplier;
  // Use shared calculation functions from calculations.ts
  const marginPerKwh = computeMarginPerKwh(site.customerPrice, site.electricityCost, site.teslaFee);
  const totalProjectCost = (site.bomPerStall + site.installPerStall) * site.stalls;
  const outOfPocket = Math.max(0, totalProjectCost - site.incentives);
  const grossRevenue = computeAnnualGrossRevenue(site.stalls, effectiveKwhPerDay, marginPerKwh);
  const annualNOI = computeAnnualNOI(grossRevenue, site.insurance, site.monthlyRent);
  const ownerAnnualTier1 = annualNOI * controls.tier1OwnerSplit;
  const msAnnualTier1 = annualNOI * (1 - controls.tier1OwnerSplit);
  const cocReturn = outOfPocket > 0 ? ownerAnnualTier1 / outOfPocket : null;

  return {
    ...site,
    effectiveKwhPerDay,
    marginPerKwh,
    totalProjectCost,
    outOfPocket,
    annualNOI,
    ownerAnnualTier1,
    msAnnualTier1,
    cocReturn,
  };
}

export function computeWaterfall(
  sites: ComputedSite[],
  controls: MasterControls,
  years: number = 10
): WaterfallYearRow[] {
  const totalOOP = sites.reduce((s, site) => s + site.outOfPocket, 0);
  const basePortfolioNOI = sites.reduce((s, site) => s + site.annualNOI, 0);
  const tier1MSSplit = 1 - controls.tier1OwnerSplit;
  const tier2MSSplit = 1 - controls.tier2OwnerSplit;

  let cumulativeOwnerDist = 0;
  let ownerCumulative = 0;
  let msCumulative = 0;
  const rows: WaterfallYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const portfolioNOI = basePortfolioNOI * Math.pow(1 + controls.noiGrowthRate, y - 1);
    const cumulativeOwnerTarget = totalOOP + (totalOOP * controls.hurdleRate * y);
    const remainingToTarget = cumulativeOwnerTarget - cumulativeOwnerDist;

    let tier1NOI: number, ownerTier1: number, msTier1: number;
    let tier2NOI: number, ownerTier2: number, msTier2: number;

    if (remainingToTarget > 0) {
      tier1NOI = Math.min(portfolioNOI, remainingToTarget / controls.tier1OwnerSplit);
      tier1NOI = Math.min(tier1NOI, portfolioNOI);
      ownerTier1 = tier1NOI * controls.tier1OwnerSplit;
      msTier1 = tier1NOI * tier1MSSplit;
      tier2NOI = portfolioNOI - tier1NOI;
      ownerTier2 = tier2NOI * controls.tier2OwnerSplit;
      msTier2 = tier2NOI * tier2MSSplit;
    } else {
      tier1NOI = 0;
      ownerTier1 = 0;
      msTier1 = 0;
      tier2NOI = portfolioNOI;
      ownerTier2 = tier2NOI * controls.tier2OwnerSplit;
      msTier2 = tier2NOI * tier2MSSplit;
    }

    cumulativeOwnerDist += ownerTier1 + ownerTier2;
    const ownerTotal = ownerTier1 + ownerTier2;
    const msTotal = msTier1 + msTier2;
    ownerCumulative += ownerTotal;
    msCumulative += msTotal;

    rows.push({
      year: y,
      portfolioNOI,
      cumulativeOwnerTarget,
      tier1NOI,
      ownerTier1,
      msTier1,
      cumulativeOwnerDist,
      ownerMadeWhole: cumulativeOwnerDist >= cumulativeOwnerTarget,
      tier2NOI,
      ownerTier2,
      msTier2,
      ownerTotal,
      msTotal,
      ownerCumulative,
      msCumulative,
    });
  }

  return rows;
}

export function computeExit(
  waterfallRows: WaterfallYearRow[],
  controls: MasterControls,
  totalOOP: number
): ExitAnalysis {
  const holdYear = Math.min(controls.holdPeriod, waterfallRows.length);
  const exitYearRow = waterfallRows[holdYear - 1];
  if (!exitYearRow) {
    return { exitValue: 0, dispositionFee: 0, ownerPreferredAtExit: 0, msPromoteAmount: 0, ownerExitProceeds: 0, msExitProceeds: 0, ownerTotalReturn: 0, msTotalReturn: 0 };
  }

  const exitValue = exitYearRow.portfolioNOI * controls.exitMultiple;
  const dispositionFee = exitValue * 0.01;
  const ownerPreferredAtExit = Math.max(0, totalOOP + (totalOOP * controls.hurdleRate * holdYear) - exitYearRow.ownerCumulative);
  const remainingAfterPreferred = Math.max(0, exitValue - dispositionFee - ownerPreferredAtExit);
  const msPromoteAmount = remainingAfterPreferred * controls.msPromoteAtExit;
  const ownerExitProceeds = exitValue - dispositionFee - msPromoteAmount;
  const msExitProceeds = msPromoteAmount + dispositionFee;

  const ownerTotalReturn = exitYearRow.ownerCumulative + ownerExitProceeds;
  const msTotalReturn = exitYearRow.msCumulative + msExitProceeds;

  return { exitValue, dispositionFee, ownerPreferredAtExit, msPromoteAmount, ownerExitProceeds, msExitProceeds, ownerTotalReturn, msTotalReturn };
}

// ── Stall Sizer ────────────────────────────────────────────────────────────

export type LocationType = 'highway' | 'urban_retail' | 'suburban_retail' | 'rural';

const CAPTURE_RATES: Record<LocationType, number> = {
  highway: 0.12,
  urban_retail: 0.06,
  suburban_retail: 0.08,
  rural: 0.15,
};

const UTILIZATION_FACTORS = {
  conservative: 0.25,
  base: 0.35,
  aggressive: 0.50,
};

const PARKING_RATIO_FLOORS: Record<LocationType, { conservative: number; base: number; aggressive: number }> = {
  highway: { conservative: 0.04, base: 0.06, aggressive: 0.10 },
  urban_retail: { conservative: 0.03, base: 0.05, aggressive: 0.08 },
  suburban_retail: { conservative: 0.03, base: 0.05, aggressive: 0.08 },
  rural: { conservative: 0.02, base: 0.04, aggressive: 0.06 },
};

export interface StallSizerInputs {
  siteName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  state: string;
  totalParkingSpaces: number | null;
  lotSizeSqFt: number | null;
  dailyTraffic: number;
  evAdoptionRate: number;
  avgChargeTimeMin: number;
  operatingHours: number;
  locationType: LocationType;
  evpinScore: number | null;
  chargeScore: number | null;
  nearbyL3Ports: number | null;
}

export interface StallRecommendation {
  conservative: number;
  base: number;
  aggressive: number;
  parkingSpaces: number;
  parkingPctConservative: number;
  parkingPctBase: number;
  parkingPctAggressive: number;
  dailySessions: number;
  kwhPerStallPerDay: number;
  confidence: 'Low' | 'Medium' | 'High';
}

export function computeStallRecommendation(inputs: StallSizerInputs): StallRecommendation {
  const parkingSpaces = inputs.totalParkingSpaces ?? (inputs.lotSizeSqFt ? Math.floor(inputs.lotSizeSqFt / 350) : 100);
  const captureRate = CAPTURE_RATES[inputs.locationType];
  const estimatedEVTraffic = inputs.dailyTraffic * inputs.evAdoptionRate;
  const chargingDemand = estimatedEVTraffic * captureRate;

  const ratioFloors = PARKING_RATIO_FLOORS[inputs.locationType];

  const scoreMultiplier = inputs.chargeScore !== null ? 1 + Math.max(0, (inputs.chargeScore - 50)) / 100 : 1;

  const competitionBoost = inputs.nearbyL3Ports !== null
    ? (inputs.nearbyL3Ports < 5 ? 1.3 : inputs.nearbyL3Ports < 15 ? 1.1 : 1.0)
    : 1.0;

  const recommend = (utilizationFactor: number, ratioFloor: number) => {
    const sessionsPerStall = (inputs.operatingHours * 60 / inputs.avgChargeTimeMin) * utilizationFactor;
    const demandBased = Math.ceil((chargingDemand * scoreMultiplier * competitionBoost) / Math.max(sessionsPerStall, 0.01));
    const ratioBased = Math.ceil(parkingSpaces * ratioFloor);
    const raw = Math.max(demandBased, ratioBased);
    return Math.max(4, Math.ceil(raw / 4) * 4);
  };

  const conservative = recommend(UTILIZATION_FACTORS.conservative, ratioFloors.conservative);
  const base = recommend(UTILIZATION_FACTORS.base, ratioFloors.base);
  const aggressive = recommend(UTILIZATION_FACTORS.aggressive, ratioFloors.aggressive);

  let filled = 0;
  if (inputs.totalParkingSpaces || inputs.lotSizeSqFt) filled++;
  if (inputs.dailyTraffic > 0) filled++;
  if (inputs.evpinScore) filled++;
  if (inputs.chargeScore !== null) filled++;
  if (inputs.nearbyL3Ports !== null) filled++;
  const confidence: 'Low' | 'Medium' | 'High' = filled >= 4 ? 'High' : filled >= 3 ? 'Medium' : 'Low';

  const avgKwhPerSession = 30;
  const dailySessions = chargingDemand * scoreMultiplier * competitionBoost;
  const kwhPerStallPerDay = base > 0 ? (dailySessions * avgKwhPerSession) / base : 0;

  return {
    conservative, base, aggressive,
    parkingSpaces,
    parkingPctConservative: (conservative / parkingSpaces) * 100,
    parkingPctBase: (base / parkingSpaces) * 100,
    parkingPctAggressive: (aggressive / parkingSpaces) * 100,
    dailySessions,
    kwhPerStallPerDay,
    confidence,
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────

export const fmt = (n: number) => n < 0
  ? `-$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export const fmtMult = (n: number) => `${n.toFixed(1)}x`;
