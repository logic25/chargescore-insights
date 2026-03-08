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
  { name: "Dutch Broadway", address: "Dutch Broadway, Elmont, NY", lat: 40.6973, lng: -73.7079, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 76 },
  { name: "Hewlett", address: "Hewlett, NY", lat: 40.6382, lng: -73.6954, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 74 },
  { name: "Merrick Road", address: "Merrick, NY", lat: 40.6498, lng: -73.5565, state: "NY", stalls: 8, kwhPerStallPerDay: 250, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 68 },
  { name: "Lindenhurst", address: "Lindenhurst, NY", lat: 40.6862, lng: -73.3732, state: "NY", stalls: 8, kwhPerStallPerDay: 350, pricePerKwh: 0.45, electricityCost: 0.223, installPerStall: 25000, incentives: 281000, insurance: 5000, chargeScore: 72 },
  // Con Edison NYC
  { name: "86th St", address: "86th St, Brooklyn, NY", lat: 40.6218, lng: -74.0283, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 281000, insurance: 7500, chargeScore: 82 },
  { name: "Farmers Blvd", address: "Farmers Blvd, Queens, NY", lat: 40.6712, lng: -73.7623, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 305000, insurance: 7500, chargeScore: 80 },
  { name: "Cross Bay", address: "Cross Bay Blvd, Queens, NY", lat: 40.6591, lng: -73.8253, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 305000, insurance: 7500, chargeScore: 79 },
  { name: "Francis Lewis", address: "Francis Lewis Blvd, Queens, NY", lat: 40.7327, lng: -73.7613, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 81 },
  { name: "Linden Blvd", address: "Linden Blvd, Queens, NY", lat: 40.6689, lng: -73.7862, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 78 },
  { name: "Eastchester", address: "Eastchester Rd, Bronx, NY", lat: 40.8545, lng: -73.8313, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 297000, insurance: 7500, chargeScore: 77 },
  { name: "Avenue U", address: "Avenue U, Brooklyn, NY", lat: 40.5975, lng: -73.9539, state: "NY", stalls: 8, kwhPerStallPerDay: 400, pricePerKwh: 0.47, electricityCost: 0.223, installPerStall: 35000, incentives: 313000, insurance: 7500, chargeScore: 83 },
  // Duke Energy FL
  { name: "St Petersburg", address: "St Petersburg, FL", lat: 27.7676, lng: -82.6403, state: "FL", stalls: 8, kwhPerStallPerDay: 350, pricePerKwh: 0.40, electricityCost: 0.147, installPerStall: 22000, incentives: 200000, insurance: 4500, chargeScore: 72 },
  // ACE NJ
  { name: "Penns Grove", address: "Penns Grove, NJ", lat: 39.7243, lng: -75.4702, state: "NJ", stalls: 4, kwhPerStallPerDay: 200, pricePerKwh: 0.42, electricityCost: 0.116, installPerStall: 25000, incentives: 150000, insurance: 3500, chargeScore: 68 },
  // National Grid / Eversource MA
  { name: "Worcester", address: "Worcester, MA", lat: 42.2626, lng: -71.8023, state: "MA", stalls: 4, kwhPerStallPerDay: 250, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 74 },
  { name: "New Bedford", address: "New Bedford, MA", lat: 41.6362, lng: -70.9342, state: "MA", stalls: 4, kwhPerStallPerDay: 250, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 71 },
  { name: "Greenfield", address: "Greenfield, MA", lat: 42.5876, lng: -72.5993, state: "MA", stalls: 4, kwhPerStallPerDay: 200, pricePerKwh: 0.48, electricityCost: 0.136, installPerStall: 28000, incentives: 150000, insurance: 4000, chargeScore: 66 },
];

const BOM_PER_STALL = 62500;
const TESLA_FEE = 0.10;

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
