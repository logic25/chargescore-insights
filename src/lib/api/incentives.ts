const NREL_API_KEY = 'ttwrfmgTXzqUEZctNUcKtCbN2gnJhnST68fj6Oe9';

export interface NrelIncentive {
  id: number;
  title: string;
  state: string;
  type: string;
  description: string;
  status: string;
  enacted_date: string;
  amended_date?: string;
  utilityId?: number | null;
}

// Keywords that indicate a program is relevant to commercial EV charging infrastructure
const EVSE_KEYWORDS = [
  'charging', 'charger', 'evse', 'electric vehicle supply',
  'infrastructure', 'station', 'make-ready', 'make ready',
  'refueling', 'fueling infrastructure',
  'dcfc', 'fast charge', 'level 2', 'level 3',
];

// Keywords that indicate a program is NOT relevant (fleet mandates, HOV, registration, etc.)
const EXCLUDE_KEYWORDS = [
  'fleet requirement', 'zev sales', 'zev production', 'emission standard',
  'hov lane', 'high occupancy', 'license plate', 'registration fee',
  'inspection', 'idling', 'procurement', 'medium-duty', 'heavy-duty',
  'bus', 'transit', 'school', 'last updated', 'comprehensive review',
  'building code', 'parking requirement', 'weight limit', 'toll',
];

function isRelevantToEVCharging(item: any): boolean {
  const text = `${item.title ?? ''} ${item.plaintext ?? ''} ${item.text ?? ''}`.toLowerCase();

  // Exclude items matching exclusion patterns
  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) return false;

  // Must match at least one EVSE keyword
  if (!EVSE_KEYWORDS.some(kw => text.includes(kw))) return false;

  // Check technology tags — must include ELEC (EVs)
  const techs: string[] = item.technologies || [];
  if (techs.length > 0 && !techs.includes('ELEC') && !techs.includes('PHEV') && !techs.includes('HEV')) return false;

  // If it's a "Laws and Regulations" type, only include if clearly about infrastructure incentives
  const cats: any[] = item.categories || [];
  const catCodes = cats.map((c: any) => c.code);
  if (item.type === 'Laws and Regulations' && !catCodes.includes('STATION')) return false;

  return true;
}

export interface FetchIncentivesOptions {
  stateCode: string;
  utilityCompanyId?: string | null; // NREL utility company_id to filter utility-specific programs
}

export async function fetchStateIncentives(opts: FetchIncentivesOptions): Promise<NrelIncentive[]> {
  try {
    const params = new URLSearchParams({
      api_key: NREL_API_KEY,
      jurisdiction: opts.stateCode,
      limit: '200',
    });
    const res = await fetch(`https://developer.nrel.gov/api/transportation-incentives-laws/v1.json?${params}`);
    if (!res.ok) throw new Error(`NREL Incentives API error: ${res.status}`);
    const data = await res.json();

    return (data.result || [])
      .filter((r: any) => {
        // Only include incentive types (not pure laws/regulations)
        const isIncentiveType = r.type === 'State Incentives' || r.type === 'Incentives' || r.type === 'Utility / Private Incentives';
        const isRelevantLaw = r.type === 'Laws and Regulations' && isRelevantToEVCharging(r);
        if (!isIncentiveType && !isRelevantLaw) return false;

        // Filter for EVSE relevance
        if (!isRelevantToEVCharging(r)) return false;

        // Exclude repealed/expired
        if (r.status === 'repealed' || r.status === 'expired') return false;

        // If program has a utility_id, only show if it matches the site's utility
        if (r.utility_id != null && opts.utilityCompanyId) {
          if (String(r.utility_id) !== String(opts.utilityCompanyId)) return false;
        }

        return true;
      })
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        state: r.state,
        type: r.type,
        description: r.plaintext?.slice(0, 200) || '',
        status: r.status || 'active',
        enacted_date: r.enacted_date,
        amended_date: r.amended_date,
        utilityId: r.utility_id,
      }));
  } catch (err) {
    console.error('Failed to fetch NREL incentives:', err);
    return [];
  }
}
