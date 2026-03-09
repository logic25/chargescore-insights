import { supabase } from '@/integrations/supabase/client';
import type { NrelIncentive } from '@/lib/api/incentives';

export interface IncentiveProgram {
  id: string;
  programName: string;
  administrator: string | null;
  state: string | null;
  utilityTerritory: string | null;
  amountPerPort: number | null;
  amountFlat: number | null;
  amountCap: number | null;
  confidence: 'confirmed' | 'likely' | 'uncertain' | 'unverified';
  programStatus: 'active' | 'expiring' | 'expired' | 'announced';
  expirationDate: string | null;
  applicationUrl: string | null;
  notes: string | null;
  stackingAllowed: boolean;
  updatedAt: string;
  // Computed per-site
  computedAmount: number;
  isAfdc?: boolean;
}

export interface IncentiveResult {
  programs: IncentiveProgram[];
  confirmedTotal: number;
  likelyTotal: number;
  uncertainTotal: number;
  oopFloor: number;       // grossCost - (confirmed + likely)
  oopCeiling: number;     // grossCost - confirmed only
  fullCoveragePossible: boolean;
  uncertainRange: { low: number; high: number };
}

// Map from utility names (as detected by utilityInfo API) to our canonical territories
const UTILITY_TERRITORY_MAP: Record<string, string> = {
  'pseg long island': 'PSEG LI',
  'pseg li': 'PSEG LI',
  'lipa': 'PSEG LI',
  'long island power authority': 'PSEG LI',
  'consolidated edison': 'Con Edison',
  'con edison': 'Con Edison',
  'coned': 'Con Edison',
  'con ed': 'Con Edison',
  'duke energy': 'Duke Energy FL',
  'duke energy florida': 'Duke Energy FL',
  'atlantic city electric': 'ACE NJ',
  'ace': 'ACE NJ',
  'national grid': 'National Grid MA',
  'eversource': 'National Grid MA',
  'eversource energy': 'National Grid MA',
};

export function resolveUtilityTerritory(utilityName: string | null, state: string | null): string | null {
  if (!utilityName) return null;
  const lower = utilityName.toLowerCase().trim();

  // Direct match
  if (UTILITY_TERRITORY_MAP[lower]) return UTILITY_TERRITORY_MAP[lower];

  // Partial match
  for (const [key, territory] of Object.entries(UTILITY_TERRITORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return territory;
  }

  // State-based Duke Energy disambiguation
  if (lower.includes('duke') && state === 'FL') return 'Duke Energy FL';
  if (lower.includes('national grid') && state === 'MA') return 'National Grid MA';

  return null;
}

export async function fetchIncentivePrograms(utilityTerritory: string | null, state: string | null): Promise<IncentiveProgram[]> {
  let query = supabase.from('incentive_programs').select('*');

  // Fetch programs matching territory, plus state-level with null territory, plus universal (null state/territory)
  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch incentive programs:', error);
    return [];
  }

  if (!data) return [];

  return data
    .filter((row: any) => {
      // Match by utility territory
      if (row.utility_territory && utilityTerritory && row.utility_territory === utilityTerritory) return true;
      // State-level programs with no territory
      if (!row.utility_territory && row.state && state && row.state === state) return true;
      // Universal programs (expired 30C, etc)
      if (!row.utility_territory && !row.state) return true;
      return false;
    })
    .map((row: any) => ({
      id: row.id,
      programName: row.program_name,
      administrator: row.administrator,
      state: row.state,
      utilityTerritory: row.utility_territory,
      amountPerPort: row.amount_per_port ? Number(row.amount_per_port) : null,
      amountFlat: row.amount_flat ? Number(row.amount_flat) : null,
      amountCap: row.amount_cap ? Number(row.amount_cap) : null,
      confidence: row.confidence as IncentiveProgram['confidence'],
      programStatus: row.program_status as IncentiveProgram['programStatus'],
      expirationDate: row.expiration_date,
      applicationUrl: row.application_url,
      notes: row.notes,
      stackingAllowed: row.stacking_allowed ?? true,
      updatedAt: row.updated_at,
      computedAmount: 0,
    }));
}

export function calculateIncentives(
  programs: IncentiveProgram[],
  stallCount: number,
  grossProjectCost: number,
): IncentiveResult {
  // Calculate computed amount for each program
  const computed = programs.map(p => {
    let amount = 0;

    if (p.programStatus === 'expired') {
      return { ...p, computedAmount: 0 };
    }

    if (p.amountPerPort) {
      amount = p.amountPerPort * stallCount;
      // Add flat bonus if present (e.g. NYSERDA: $4K/stall + $15K flat)
      if (p.amountFlat) {
        amount += p.amountFlat;
      }
    } else if (p.amountFlat) {
      amount = p.amountFlat;
    }

    // Apply cap
    if (p.amountCap) {
      amount = Math.min(amount, p.amountCap);
    }

    // If only a cap is specified with no per-port or flat, use cap as the estimate
    if (!p.amountPerPort && !p.amountFlat && p.amountCap) {
      amount = p.amountCap;
    }

    return { ...p, computedAmount: Math.round(amount) };
  });

  // Split by confidence (exclude expired)
  const active = computed.filter(p => p.programStatus !== 'expired');
  const confirmed = active.filter(p => p.confidence === 'confirmed');
  const likely = active.filter(p => p.confidence === 'likely');
  const uncertain = active.filter(p => p.confidence === 'uncertain');

  const unverified = active.filter(p => p.confidence === 'unverified');

  const confirmedTotal = confirmed.reduce((s, p) => s + p.computedAmount, 0);
  const likelyTotal = likely.reduce((s, p) => s + p.computedAmount, 0);
  const uncertainTotal = uncertain.reduce((s, p) => s + p.computedAmount, 0);
  const unverifiedTotal = unverified.reduce((s, p) => s + p.computedAmount, 0);

  const oopFloor = Math.max(0, grossProjectCost - confirmedTotal - likelyTotal);
  const oopCeiling = Math.max(0, grossProjectCost - confirmedTotal);
  const fullCoveragePossible = oopFloor <= 0;

  // Uncertain range: low end is smallest uncertain program, high end is sum
  const uncertainAmounts = uncertain.map(p => p.computedAmount).filter(a => a > 0);
  const uncertainRange = {
    low: uncertainAmounts.length > 0 ? Math.min(...uncertainAmounts) : 0,
    high: uncertainTotal,
  };

  return {
    programs: computed,
    confirmedTotal,
    likelyTotal,
    uncertainTotal,
    unverifiedTotal,
    oopFloor,
    oopCeiling,
    fullCoveragePossible,
    uncertainRange,
  };
}

/** Convert NREL AFDC results into IncentiveProgram objects with 'unverified' confidence */
export function nrelToIncentivePrograms(nrelResults: NrelIncentive[]): IncentiveProgram[] {
  return nrelResults.map(r => {
    let amount = 0;
    if (r.estimatedBenefit) {
      // Try to parse dollar amounts from estimatedBenefit string
      const match = r.estimatedBenefit.match(/\$\s?([\d,]+)/);
      if (match) amount = parseInt(match[1].replace(/,/g, ''), 10) || 0;
    }

    return {
      id: `nrel-${r.id}`,
      programName: r.title,
      administrator: r.category === 'utility' ? 'Utility Program' : r.category === 'state' ? 'State Program' : null,
      state: r.state,
      utilityTerritory: null,
      amountPerPort: null,
      amountFlat: amount > 0 ? amount : null,
      amountCap: null,
      confidence: 'unverified' as const,
      programStatus: 'active' as const,
      expirationDate: null,
      applicationUrl: null,
      notes: r.description ? r.description.slice(0, 200) + (r.description.length > 200 ? '…' : '') : null,
      stackingAllowed: true,
      updatedAt: r.amended_date || r.enacted_date || new Date().toISOString(),
      computedAmount: amount,
      isAfdc: true,
    };
  });
}
