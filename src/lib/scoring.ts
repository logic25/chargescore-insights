// ChargeScore Scoring Engine — 9 factors, 0-100 scale

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  tooltip: string;
  dataSource: string;
  rawValue: string;
}

export interface ChargeScoreResult {
  totalScore: number;
  grade: string;
  factors: ScoreFactor[];
  recommendation: string;
}

export interface ScoringInputs {
  aadtVpd: number | null;
  evRegistrations: number | null;
  nearestDcfcMiles: number | null;
  dcfcWithin5Miles: number;
  plannedDcfcWithin5Miles: number;
  nearestPlannedDcfcMiles: number | null;
  totalDcfcPortsWithin5Miles: number;
  totalPlannedDcfcPortsWithin5Miles: number;
  multiFamilyPct: number | null;
  popDensity: number | null;
  nearestMajorAirportMiles: number | null;
  isOnAltFuelCorridor: boolean;
  propertyType: string;
  amenitiesNearby: number;
  totalParkingSpots: number;
  peakUtilization: number;
  isDisadvantagedCommunity: boolean;
  hasThreePhasePower: boolean | null;
  state?: string;
  zipCode?: string;
  utilityName?: string | null;
}

export function calculateChargeScoreV2(inputs: ScoringInputs): ChargeScoreResult {
  const factors: ScoreFactor[] = [];

  // Pre-compute urban context (used by multiple factors)
  const estimatedPopDensity = inputs.popDensity ?? (() => {
    const zip = inputs.zipCode || '';
    const state = inputs.state || '';
    if (state === 'NY' && (zip.startsWith('10') || zip.startsWith('11'))) return 25000;
    if (['NY', 'CA', 'MA', 'NJ', 'IL'].includes(state)) return 8000;
    return 3000;
  })();
  const isUrban = estimatedPopDensity >= 10000;
  const isDenseUrban = estimatedPopDensity >= 20000;

  // FACTOR 1: Traffic Volume (22%)
  let trafficScore = 50;
  if (inputs.aadtVpd !== null) {
    if (inputs.aadtVpd >= 30000) trafficScore = 100;
    else if (inputs.aadtVpd >= 20000) trafficScore = 85;
    else if (inputs.aadtVpd >= 10000) trafficScore = 70;
    else if (inputs.aadtVpd >= 5000) trafficScore = 50;
    else trafficScore = 25;
  }
  factors.push({
    name: 'Traffic Volume',
    score: trafficScore,
    weight: 0.22,
    weightedScore: trafficScore * 0.22,
    tooltip: 'How many vehicles drive past this location daily (AADT). Higher traffic = more potential EV charging customers. Sites above 20,000 VPD are considered excellent.',
    dataSource: 'FHWA HPMS (Highway Performance Monitoring System)',
    rawValue: inputs.aadtVpd ? `${inputs.aadtVpd.toLocaleString()} VPD` : 'Not available — using estimate',
  });

  // FACTOR 2: EV Density (13%)
  // Apply urban multiplier — dense urban areas have higher EV concentrations
  // (rideshare/TLC fleets, higher adoption) than state averages reflect
  let effectiveEvRegistrations = inputs.evRegistrations;
  if (effectiveEvRegistrations !== null && isDenseUrban) {
    effectiveEvRegistrations = Math.round(effectiveEvRegistrations * 1.8);
  } else if (effectiveEvRegistrations !== null && isUrban) {
    effectiveEvRegistrations = Math.round(effectiveEvRegistrations * 1.3);
  }

  let evScore = 50;
  if (effectiveEvRegistrations !== null) {
    if (effectiveEvRegistrations >= 3000) evScore = 100;
    else if (effectiveEvRegistrations >= 1500) evScore = 80;
    else if (effectiveEvRegistrations >= 500) evScore = 60;
    else if (effectiveEvRegistrations >= 100) evScore = 40;
    else evScore = 20;
  }
  factors.push({
    name: 'EV Density',
    score: evScore,
    weight: 0.13,
    weightedScore: evScore * 0.13,
    tooltip: 'How many electric vehicles are registered in surrounding zip codes. More EVs nearby means more immediate charging demand without waiting for adoption to grow.',
    dataSource: 'State-level estimate (zip-level data coming soon)',
    rawValue: effectiveEvRegistrations ? `~${effectiveEvRegistrations.toLocaleString()} EVs nearby${isUrban ? ' (urban-adjusted)' : ''}` : 'Using state estimate',
  });

  // FACTOR 3: Competition Gap (18%)

  let competitionScore = 50;
  if (inputs.nearestDcfcMiles !== null) {
    if (isDenseUrban) {
      // Dense urban: 1+ mi to nearest DCFC is excellent spacing
      if (inputs.nearestDcfcMiles >= 5) competitionScore = 100;
      else if (inputs.nearestDcfcMiles >= 3) competitionScore = 90;
      else if (inputs.nearestDcfcMiles >= 1.5) competitionScore = 80;
      else if (inputs.nearestDcfcMiles >= 0.75) competitionScore = 65;
      else if (inputs.nearestDcfcMiles >= 0.3) competitionScore = 45;
      else competitionScore = 25;
    } else if (isUrban) {
      // Urban: slightly wider thresholds
      if (inputs.nearestDcfcMiles >= 7) competitionScore = 100;
      else if (inputs.nearestDcfcMiles >= 4) competitionScore = 90;
      else if (inputs.nearestDcfcMiles >= 2) competitionScore = 75;
      else if (inputs.nearestDcfcMiles >= 1) competitionScore = 55;
      else if (inputs.nearestDcfcMiles >= 0.5) competitionScore = 35;
      else competitionScore = 20;
    } else {
      // Suburban/rural: original wider thresholds
      if (inputs.nearestDcfcMiles >= 10) competitionScore = 100;
      else if (inputs.nearestDcfcMiles >= 5) competitionScore = 85;
      else if (inputs.nearestDcfcMiles >= 2) competitionScore = 65;
      else if (inputs.nearestDcfcMiles >= 1) competitionScore = 40;
      else competitionScore = 20;
    }
  }

  // Density-adjusted saturation penalty: urban areas naturally have more stations
  const saturationThreshold = isDenseUrban ? 15 : isUrban ? 10 : 5;
  if (inputs.dcfcWithin5Miles > saturationThreshold) {
    const excess = inputs.dcfcWithin5Miles - saturationThreshold;
    const penalty = Math.min(20, Math.round(excess * (isDenseUrban ? 1 : 2)));
    competitionScore = Math.max(competitionScore - penalty, 0);
  }

  // Planned station penalties (softer — they may be delayed or cancelled)
  if (inputs.plannedDcfcWithin5Miles >= 3) competitionScore = Math.max(competitionScore - 10, 0);
  else if (inputs.plannedDcfcWithin5Miles >= 1) competitionScore = Math.max(competitionScore - 5, 0);
  if (inputs.nearestPlannedDcfcMiles !== null && inputs.nearestPlannedDcfcMiles < 0.5) {
    competitionScore = Math.max(competitionScore - 10, 0);
  }

  const existingText = inputs.nearestDcfcMiles ? `${inputs.nearestDcfcMiles.toFixed(1)} mi to nearest` : 'No existing nearby';
  const plannedText = inputs.plannedDcfcWithin5Miles > 0
    ? ` · ${inputs.plannedDcfcWithin5Miles} planned within 5 mi`
    : ' · No planned nearby';
  const contextText = isDenseUrban ? ' (dense urban)' : isUrban ? ' (urban)' : '';

  factors.push({
    name: 'Competition Gap',
    score: competitionScore,
    weight: 0.18,
    weightedScore: competitionScore * 0.18,
    tooltip: `How much charging competition exists AND is coming. Thresholds adjust for ${isDenseUrban ? 'dense urban' : isUrban ? 'urban' : 'suburban'} context — in cities, stations are naturally closer together, so we measure relative to what's normal for the area.`,
    dataSource: 'NLR Alternative Fuel Stations API (existing + planned)',
    rawValue: existingText + plannedText + contextText,
  });

  // FACTOR 4: Dwell Time Match (10%)
  const dwellScores: Record<string, number> = {
    'restaurant': 90, 'shopping-center': 95, 'strip-retail': 85,
    'hotel': 100, 'gas-station': 40, 'office-park': 50,
    'multifamily': 55, 'parking-garage': 70, 'other': 60,
  };
  const dwellScore = dwellScores[inputs.propertyType] || 60;
  factors.push({
    name: 'Dwell Time Match',
    score: dwellScore,
    weight: 0.10,
    weightedScore: dwellScore * 0.10,
    tooltip: 'Does this property type match DCFC charging times (15-45 min)? Restaurants, shopping centers, and hotels score highest because customers naturally stay long enough to charge.',
    dataSource: 'Property type analysis',
    rawValue: inputs.propertyType.replace(/-/g, ' '),
  });

  // FACTOR 5: Nearby Amenities (10%)
  const amenityScore = Math.min(inputs.amenitiesNearby * 10, 100);
  factors.push({
    name: 'Nearby Amenities',
    score: amenityScore,
    weight: 0.10,
    weightedScore: amenityScore * 0.10,
    tooltip: 'How many restaurants, cafes, and shops are within a short walk. EV drivers need something to do while charging. Tesla specifically requires sites near amenities.',
    dataSource: 'Google Places API',
    rawValue: `${inputs.amenitiesNearby} places within 0.25 mi`,
  });

  // FACTOR 6: Parking Capacity (5%)
  let parkingScore = 0;
  if (inputs.totalParkingSpots >= 50) parkingScore = 100;
  else if (inputs.totalParkingSpots >= 30) parkingScore = 80;
  else if (inputs.totalParkingSpots >= 15) parkingScore = 60;
  else if (inputs.totalParkingSpots >= 8) parkingScore = 40;
  else parkingScore = 10;

  // Utilization adjustment: busy lots = more customers = more sessions
  const util = inputs.peakUtilization;
  if (util >= 60 && util <= 85) parkingScore = Math.min(parkingScore + 15, 100); // sweet spot
  else if (util > 95) parkingScore = Math.max(parkingScore - 15, 0); // too full
  else if (util < 40) parkingScore = Math.max(parkingScore - 10, 0); // low traffic

  factors.push({
    name: 'Parking Capacity',
    score: parkingScore,
    weight: 0.05,
    weightedScore: parkingScore * 0.05,
    tooltip: 'Enough parking to dedicate spaces to EV charging without hurting existing business. Utilization between 60-85% is ideal — it signals high foot traffic with room for dedicated stalls.',
    dataSource: 'User input',
    rawValue: `${inputs.totalParkingSpots} spots · ${inputs.peakUtilization}% peak utilization`,
  });

  // FACTOR 7: Grid Capacity (5%)
  let gridScore = 60;
  if (inputs.hasThreePhasePower === true) gridScore = 90;
  else if (inputs.hasThreePhasePower === false) gridScore = 30;
  
  // Boost score if we know the utility (commercial service likely available)
  const utilityName = inputs.utilityName ?? null;
  if (utilityName && inputs.hasThreePhasePower === null) {
    // Known utility = at least basic commercial service exists
    gridScore = 65;
  }

  factors.push({
    name: 'Grid Capacity',
    score: gridScore,
    weight: 0.05,
    weightedScore: gridScore * 0.05,
    tooltip: 'Can the electrical grid handle high-power DCFC? V4 Superchargers need 480V three-phase power. Properties with existing high-power service score higher.',
    dataSource: utilityName ? `NREL Utility Rates API — ${utilityName}` : 'User input / utility data',
    rawValue: inputs.hasThreePhasePower === null
      ? (utilityName ? `Utility: ${utilityName} (service type unknown)` : 'Unknown')
      : (inputs.hasThreePhasePower ? 'Three-phase available' : 'May need upgrade'),
  });

  // FACTOR 8: Incentive Eligibility (10%)
  let incentiveScore = 40;
  if (inputs.isDisadvantagedCommunity) incentiveScore += 35;
  if (inputs.isOnAltFuelCorridor) incentiveScore += 25;
  incentiveScore = Math.min(incentiveScore, 100);

  const incentiveReasons: string[] = [];
  if (inputs.isDisadvantagedCommunity) incentiveReasons.push('DAC (higher incentives)');
  if (inputs.isOnAltFuelCorridor) incentiveReasons.push('Alt Fuel Corridor (NEVI eligible)');
  if (incentiveReasons.length === 0) incentiveReasons.push('Standard rates');

  factors.push({
    name: 'Incentive Eligibility',
    score: incentiveScore,
    weight: 0.10,
    weightedScore: incentiveScore * 0.10,
    tooltip: 'Two major incentive boosters: (1) Disadvantaged Community (DAC) status — utilities cover up to 100% of infrastructure. (2) FHWA Alternative Fuel Corridor — qualifies for NEVI funding covering up to 80% of project cost.',
    dataSource: 'CEJST (DAC) + FHWA Alt Fuel Corridors (NEVI)',
    rawValue: incentiveReasons.join(' + '),
  });

  // FACTOR 9: Demand Overflow (7%)
  let overflowScore = 50;
  let demandMultiplier = 1.0;

  // Use sensible defaults when Census data is unavailable
  let effectiveMultiFamilyPct = inputs.multiFamilyPct;
  let effectivePopDensity = inputs.popDensity;

  if (effectiveMultiFamilyPct === null) {
    // Estimate from state/zip — NYC zips 100xx-104xx and 11xxx are dense urban
    const zip = inputs.zipCode || '';
    const state = inputs.state || '';
    if (state === 'NY' && (zip.startsWith('10') || zip.startsWith('11'))) {
      effectiveMultiFamilyPct = 55;
    } else if (['NY', 'CA', 'MA', 'NJ', 'IL'].includes(state)) {
      effectiveMultiFamilyPct = 40;
    } else {
      effectiveMultiFamilyPct = 30; // national average
    }
  }

  if (effectivePopDensity === null) {
    const zip = inputs.zipCode || '';
    const state = inputs.state || '';
    if (state === 'NY' && (zip.startsWith('10') || zip.startsWith('11'))) {
      effectivePopDensity = 25000;
    } else if (['NY', 'CA', 'MA', 'NJ', 'IL'].includes(state)) {
      effectivePopDensity = 8000;
    } else {
      effectivePopDensity = 3000;
    }
  }

  if (effectiveMultiFamilyPct >= 60) demandMultiplier += 1.5;
  else if (effectiveMultiFamilyPct >= 40) demandMultiplier += 1.0;
  else if (effectiveMultiFamilyPct >= 20) demandMultiplier += 0.5;

  if (effectivePopDensity >= 20000) demandMultiplier += 1.0;
  else if (effectivePopDensity >= 10000) demandMultiplier += 0.7;
  else if (effectivePopDensity >= 5000) demandMultiplier += 0.3;

  if (inputs.nearestMajorAirportMiles !== null) {
    if (inputs.nearestMajorAirportMiles <= 5) demandMultiplier += 0.8;
    else if (inputs.nearestMajorAirportMiles <= 15) demandMultiplier += 0.4;
  }

  if (inputs.evRegistrations !== null && inputs.evRegistrations > 0) {
    const adjustedEvDemand = inputs.evRegistrations * demandMultiplier;
    const currentPortsPerK = inputs.totalDcfcPortsWithin5Miles / (adjustedEvDemand / 1000);
    const futureSupply = inputs.totalDcfcPortsWithin5Miles + inputs.totalPlannedDcfcPortsWithin5Miles;
    const futurePortsPerK = futureSupply / (adjustedEvDemand / 1000);

    if (currentPortsPerK < 3) overflowScore = 100;
    else if (currentPortsPerK < 6) overflowScore = 85;
    else if (currentPortsPerK < 12) overflowScore = 65;
    else if (currentPortsPerK < 25) overflowScore = 40;
    else overflowScore = 15;

    if (inputs.totalPlannedDcfcPortsWithin5Miles > 0 && futurePortsPerK > currentPortsPerK * 1.5) {
      overflowScore = Math.max(overflowScore - 15, 15);
    }
  } else if (inputs.totalDcfcPortsWithin5Miles === 0 && inputs.totalPlannedDcfcPortsWithin5Miles === 0) {
    overflowScore = 95;
  } else if (inputs.totalDcfcPortsWithin5Miles === 0 && inputs.totalPlannedDcfcPortsWithin5Miles > 0) {
    overflowScore = 75;
  }

  // Build dynamic label based on actual contributing factors
  const demandFactors: string[] = [];
  if (effectivePopDensity >= 20000) demandFactors.push('dense urban');
  else if (effectivePopDensity >= 10000) demandFactors.push('urban');
  if (effectiveMultiFamilyPct >= 40) demandFactors.push('apartments');
  if (inputs.nearestMajorAirportMiles !== null && inputs.nearestMajorAirportMiles <= 15) {
    demandFactors.push(`airport ${inputs.nearestMajorAirportMiles.toFixed(0)} mi`);
  }
  const multiplierLabel = demandFactors.length > 0
    ? `${demandMultiplier >= 3.0 ? 'Very High' : demandMultiplier >= 2.0 ? 'High' : 'Moderate'} (${demandFactors.join(' + ')})`
    : 'Low (suburban — most EVs charge at home)';

  factors.push({
    name: 'Demand Overflow',
    score: overflowScore,
    weight: 0.07,
    weightedScore: overflowScore * 0.07,
    tooltip: 'How underserved is this area for fast charging? We weight demand by multi-family housing (apartment residents can\'t charge at home), population density (more rideshare/fleet EVs), and airport proximity (TLC drivers need constant DCFC).',
    dataSource: 'NLR Stations + Census ACS + airport proximity',
    rawValue: `${inputs.totalDcfcPortsWithin5Miles} DCFC ports · ${demandMultiplier.toFixed(1)}x demand (${multiplierLabel})`,
  });

  const totalScore = Math.round(factors.reduce((sum, f) => sum + f.weightedScore, 0));

  let grade = 'F';
  if (totalScore >= 90) grade = 'A';
  else if (totalScore >= 80) grade = 'B+';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C+';
  else if (totalScore >= 50) grade = 'C';
  else if (totalScore >= 40) grade = 'D';

  let recommendation = '';
  if (totalScore >= 80) recommendation = 'Excellent site — strong traffic, low competition, and good incentive coverage. Move forward with Tesla Supercharger application.';
  else if (totalScore >= 60) recommendation = 'Good site with some advantages. Consider the specific weak factors and whether they can be improved.';
  else if (totalScore >= 40) recommendation = 'Marginal site — review the low-scoring factors carefully before investing.';
  else recommendation = 'This location may not be suitable for DCFC. Consider L2 charging or a different property.';

  return { totalScore, grade, factors, recommendation };
}

// --- Revenue Projection ---

export interface RevenueProjection {
  kwhPerStallPerDay: number;
  utilization: number;
  annualKwh: number;
  year1Revenue: number;
  year1Electricity: number;
  year1TeslaFee: number;
  year1Profit: number;
  monthlyProfit: number;
  totalProjectCost: number;
  totalIncentives: number;
  outOfPocket: number;
  paybackYears: number | null;
  npv15Year: number;
}

export function projectRevenue(inputs: {
  chargeScore: number;
  numStalls: number;
  retailPrice: number;
  electricityCost: number;
  teslaServiceFee: number;
  costPerStall: number;
  incentivesPerStall: number;
}): RevenueProjection {
  let kwhPerStallPerDay: number;
  if (inputs.chargeScore >= 90) kwhPerStallPerDay = 300;
  else if (inputs.chargeScore >= 80) kwhPerStallPerDay = 250;
  else if (inputs.chargeScore >= 70) kwhPerStallPerDay = 190;
  else if (inputs.chargeScore >= 60) kwhPerStallPerDay = 140;
  else if (inputs.chargeScore >= 50) kwhPerStallPerDay = 100;
  else if (inputs.chargeScore >= 40) kwhPerStallPerDay = 65;
  else kwhPerStallPerDay = 40;

  const utilization = kwhPerStallPerDay / (24 * 100);
  const annualKwh = kwhPerStallPerDay * inputs.numStalls * 365;
  const year1Revenue = annualKwh * inputs.retailPrice;
  const year1Electricity = annualKwh * inputs.electricityCost;
  const year1TeslaFee = annualKwh * inputs.teslaServiceFee;
  const year1Profit = year1Revenue - year1Electricity - year1TeslaFee;
  const monthlyProfit = year1Profit / 12;
  const totalProjectCost = inputs.numStalls * inputs.costPerStall;
  const totalIncentives = inputs.numStalls * inputs.incentivesPerStall;
  const outOfPocket = Math.max(0, totalProjectCost - totalIncentives);
  const paybackYears = outOfPocket === 0 ? 0 : (year1Profit > 0 ? outOfPocket / year1Profit : null);

  // Proper 15-year NPV with discounted cash flow
  let npv15Year = -outOfPocket;
  for (let year = 1; year <= 15; year++) {
    const growthFactor = Math.pow(1.07, year - 1);
    const feeEscalation = Math.pow(1.03, year - 1);
    const yearKwh = annualKwh * growthFactor;
    const yearRevenue = yearKwh * inputs.retailPrice;
    const yearElectricity = yearKwh * inputs.electricityCost;
    const yearTeslaFee = yearKwh * inputs.teslaServiceFee * feeEscalation;
    const yearProfit = yearRevenue - yearElectricity - yearTeslaFee;
    npv15Year += yearProfit / Math.pow(1.08, year);
  }

  return {
    kwhPerStallPerDay, utilization, annualKwh,
    year1Revenue, year1Electricity, year1TeslaFee,
    year1Profit, monthlyProfit,
    totalProjectCost, totalIncentives, outOfPocket,
    paybackYears, npv15Year,
  };
}
