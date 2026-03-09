import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeedSite {
  name: string;
  address: string;
  lat: number;
  lng: number;
  state: string;
  stalls: number;
  kwhPerStallPerDay: number;
  pricePerKwh: number;
  electricityCost: number;
  installPerStall: number;
  incentives: number;
  insurance: number;
  chargeScore: number;
}

const SEED_SITES: SeedSite[] = [
  // PSEG Long Island
  { name: "Dutch Broadway", address: "2095 Dutch Broadway, Elmont, NY 11003", lat: 40.6973, lng: -73.7079, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 76 },
  { name: "Hewlett", address: "1344 Broadway, Hewlett, NY 11557", lat: 40.6382, lng: -73.6954, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 74 },
  { name: "Merrick Road", address: "1970 Merrick Road, Merrick, NY 11566", lat: 40.6498, lng: -73.5565, state: "NY", stalls: 8, kwhPerStallPerDay: 250, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 68 },
  { name: "Lindenhurst", address: "150 South Wellwood Avenue, Lindenhurst, NY 11757", lat: 40.6862, lng: -73.3732, state: "NY", stalls: 8, kwhPerStallPerDay: 350, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 72 },
  // Con Edison NYC
  { name: "86th St", address: "1525 86th Street, Brooklyn, NY 11228", lat: 40.6218, lng: -74.0283, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 281000, insurance: 7500, chargeScore: 82 },
  { name: "Farmers Blvd", address: "145-44 Farmers Boulevard, Queens, NY 11434", lat: 40.6712, lng: -73.7623, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 305000, insurance: 7500, chargeScore: 80 },
  { name: "Cross Bay", address: "163-50 Cross Bay Boulevard, Queens, NY 11414", lat: 40.6591, lng: -73.8253, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 305000, insurance: 7500, chargeScore: 79 },
  { name: "Francis Lewis", address: "245-14 Francis Lewis Boulevard, Queens, NY 11422", lat: 40.7327, lng: -73.7613, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 81 },
  { name: "Linden Blvd", address: "188-33 Linden Boulevard, Queens, NY 11412", lat: 40.6689, lng: -73.7862, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 78 },
  { name: "Eastchester", address: "3040 Eastchester Road, Bronx, NY 10469", lat: 40.8545, lng: -73.8313, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 77 },
  { name: "Avenue U", address: "6620 Avenue U, Brooklyn, NY 11234", lat: 40.5975, lng: -73.9539, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 313000, insurance: 7500, chargeScore: 83 },
  // Duke Energy FL
  { name: "St Petersburg", address: "5420 Dr Martin Luther King Jr Street North, St. Petersburg, FL 33703", lat: 27.7676, lng: -82.6403, state: "FL", stalls: 8, kwhPerStallPerDay: 350, pricePerKwh: 0.40, electricityCost: 0.147, installPerStall: 22000, incentives: 200000, insurance: 4500, chargeScore: 72 },
  // ACE NJ
  { name: "Penns Grove", address: "130 East Main Street, Penns Grove, NJ 08069", lat: 39.7243, lng: -75.4702, state: "NJ", stalls: 4, kwhPerStallPerDay: 200, pricePerKwh: 0.42, electricityCost: 0.116, installPerStall: 25000, incentives: 150000, insurance: 3500, chargeScore: 68 },
  // National Grid / Eversource MA
  { name: "Worcester", address: "27 Sunderland Road, Worcester, MA 01604", lat: 42.2626, lng: -71.8023, state: "MA", stalls: 4, kwhPerStallPerDay: 250, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 74 },
  { name: "New Bedford", address: "1207 Acushnet Avenue, New Bedford, MA 02746", lat: 41.6362, lng: -70.9342, state: "MA", stalls: 4, kwhPerStallPerDay: 250, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 71 },
  { name: "Greenfield", address: "107 Main Street, Greenfield, MA 01301", lat: 42.5876, lng: -72.5993, state: "MA", stalls: 4, kwhPerStallPerDay: 200, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 66 },
];

const BOM_PER_STALL = 62500;
const TESLA_FEE = 0.10;
const DISCOUNT_RATE = 0.08;
const UTILIZATION_GROWTH = 1.07;
const FEE_ESCALATION = 1.03;
const PROJECT_YEARS = 15;

function computeNpv(site: SeedSite, netInvestment: number): number {
  const stalls = site.stalls;
  const baseDailyKwh = stalls * site.kwhPerStallPerDay;
  let npv = -netInvestment;
  for (let y = 1; y <= PROJECT_YEARS; y++) {
    const growth = Math.pow(UTILIZATION_GROWTH, y - 1);
    const feeEsc = Math.pow(FEE_ESCALATION, y - 1);
    const yearKwh = baseDailyKwh * growth * 365;
    const revenue = yearKwh * site.pricePerKwh;
    const electricity = yearKwh * site.electricityCost;
    const teslaFee = yearKwh * TESLA_FEE * feeEsc;
    const yearNoi = revenue - electricity - teslaFee - site.insurance;
    npv += yearNoi / Math.pow(1 + DISCOUNT_RATE, y);
  }
  return Math.round(npv);
}

export async function seedPortfolioIfEmpty(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) return false;

  const rows = SEED_SITES.map(s => {
    const margin = s.pricePerKwh - s.electricityCost - TESLA_FEE;
    const annualRev = s.stalls * s.kwhPerStallPerDay * margin * 365;
    const noi = annualRev - s.insurance;
    const totalCost = (BOM_PER_STALL + s.installPerStall) * s.stalls;
    const netInv = Math.max(0, totalCost - s.incentives);
    const ownerPct = 0.70;
    const ownerMonthly = (noi * ownerPct) / 12;
    const msMonthly = (noi * (1 - ownerPct)) / 12;
    const coc = netInv > 0 ? (noi * ownerPct / netInv) * 100 : null;

    return {
      user_id: userId,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      state: s.state,
      charge_score: s.chargeScore,
      num_stalls: s.stalls,
      kwh_per_stall_per_day: s.kwhPerStallPerDay,
      price_per_kwh: s.pricePerKwh,
      electricity_cost: s.electricityCost,
      total_project_cost: totalCost,
      estimated_incentives: s.incentives,
      net_investment: netInv,
      noi,
      npv: computeNpv(s, netInv),
      margin_kwh: margin,
      owner_monthly: ownerMonthly,
      ms_monthly: msMonthly,
      coc,
      annual_insurance: s.insurance,
      monthly_rent: 0,
      owner_split_pct: 70,
    };
  });

  const { error } = await supabase.from('analyses').insert(rows as any);
  if (error) {
    console.error('Seed error:', error);
    return false;
  }

  toast.success('16 partner sites loaded. You can edit all assumptions on each site.');
  return true;
}

/**
 * Force-seed the 16 partner sites (even if user already has analyses)
 */
export async function forceSeedPortfolio(userId: string): Promise<boolean> {
  const rows = SEED_SITES.map(s => {
    const margin = s.pricePerKwh - s.electricityCost - TESLA_FEE;
    const annualRev = s.stalls * s.kwhPerStallPerDay * margin * 365;
    const noi = annualRev - s.insurance;
    const totalCost = (BOM_PER_STALL + s.installPerStall) * s.stalls;
    const netInv = Math.max(0, totalCost - s.incentives);
    const ownerPct = 0.70;
    const ownerMonthly = (noi * ownerPct) / 12;
    const msMonthly = (noi * (1 - ownerPct)) / 12;
    const coc = netInv > 0 ? (noi * ownerPct / netInv) * 100 : null;

    return {
      user_id: userId,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      state: s.state,
      charge_score: s.chargeScore,
      num_stalls: s.stalls,
      kwh_per_stall_per_day: s.kwhPerStallPerDay,
      price_per_kwh: s.pricePerKwh,
      electricity_cost: s.electricityCost,
      total_project_cost: totalCost,
      estimated_incentives: s.incentives,
      net_investment: netInv,
      noi,
      margin_kwh: margin,
      owner_monthly: ownerMonthly,
      ms_monthly: msMonthly,
      coc,
      annual_insurance: s.insurance,
      monthly_rent: 0,
      owner_split_pct: 70,
    };
  });

  const { error } = await supabase.from('analyses').insert(rows as any);
  if (error) {
    console.error('Seed error:', error);
    toast.error('Failed to add partner sites');
    return false;
  }

  toast.success(`Added ${SEED_SITES.length} partner sites to portfolio`);
  return true;
}
