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
}

// Keywords that indicate a program is relevant to commercial EV charging infrastructure
const EVSE_KEYWORDS = [
  'charging', 'charger', 'evse', 'electric vehicle supply',
  'infrastructure', 'station', 'make-ready', 'make ready',
  'refueling', 'fueling infrastructure', 'alt fuel', 'alternative fuel infrastructure',
  'dcfc', 'fast charge', 'level 2', 'level 3',
];

// Keywords that indicate a program is NOT relevant (fleet mandates, HOV, registration, etc.)
const EXCLUDE_KEYWORDS = [
  'fleet requirement', 'zev sales', 'zev production', 'emission standard',
  'hov lane', 'high occupancy', 'license plate', 'registration fee',
  'inspection', 'idling', 'procurement', 'medium-duty', 'heavy-duty',
  'bus', 'transit', 'school', 'last updated', 'comprehensive review',
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

  // Check category — prefer infrastructure-related
  const cats: any[] = item.categories || [];
  const catCodes = cats.map((c: any) => c.code);
  const hasInfraOrStation = catCodes.includes('STATION') || catCodes.includes('FLEET') || catCodes.includes('GOV');

  // If it's a "Laws and Regulations" type, only include if clearly about infrastructure incentives
  if (item.type === 'Laws and Regulations' && !hasInfraOrStation) return false;

  return true;
}

export async function fetchStateIncentives(stateCode: string): Promise<NrelIncentive[]> {
  try {
    const params = new URLSearchParams({
      api_key: NREL_API_KEY,
      jurisdiction: stateCode,
      limit: '200',
    });
    const res = await fetch(`https://developer.nrel.gov/api/transportation-incentives-laws/v1.json?${params}`);
    if (!res.ok) throw new Error(`NREL Incentives API error: ${res.status}`);
    const data = await res.json();

    // Filter for incentive-type entries that are relevant to EV charging infrastructure
    return (data.result || [])
      .filter((r: any) => {
        // Only include incentive types (not pure laws/regulations)
        const isIncentiveType = r.type === 'State Incentives' || r.type === 'Incentives' || r.type === 'Utility / Private Incentives';

        // Also allow laws that specifically create charging incentive programs
        const isRelevantLaw = r.type === 'Laws and Regulations' && isRelevantToEVCharging(r);

        if (!isIncentiveType && !isRelevantLaw) return false;

        // For incentive types, still filter for EVSE relevance
        return isRelevantToEVCharging(r);
      })
      .filter((r: any) => {
        // Exclude repealed/expired programs
        if (r.status === 'repealed' || r.status === 'expired') return false;
        return true;
      });
  } catch (err) {
    console.error('Failed to fetch NREL incentives:', err);
    return [];
  }
}
