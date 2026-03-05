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
  category?: 'federal' | 'state' | 'utility' | 'other';
  eligible?: boolean | null;
  estimatedBenefit?: string | null;
}

// Keywords that indicate a program is relevant to commercial EV charging infrastructure
const EVSE_KEYWORDS = [
  'charging', 'charger', 'evse', 'electric vehicle supply',
  'infrastructure', 'station', 'make-ready', 'make ready',
  'refueling', 'fueling infrastructure',
  'dcfc', 'fast charge', 'level 2', 'level 3',
];

// Keywords that indicate a program is NOT relevant
const EXCLUDE_KEYWORDS = [
  'fleet requirement', 'zev sales', 'zev production', 'emission standard',
  'hov lane', 'high occupancy', 'license plate', 'registration fee',
  'inspection', 'idling', 'procurement', 'medium-duty', 'heavy-duty',
  'bus', 'transit', 'school', 'last updated', 'comprehensive review',
  'building code', 'parking requirement', 'weight limit', 'toll',
];

// Known utility names in NREL program titles — used to detect utility-specific programs
const KNOWN_UTILITY_NAMES = [
  'con edison', 'coned', 'consolidated edison',
  'national grid',
  'nyseg', 'new york state electric',
  'rochester gas', 'rg&e', 'rge',
  'central hudson',
  'orange & rockland', 'orange and rockland', 'o&r utilities',
  'pseg', 'public service electric',
  'long island power', 'lipa',
  'fishers island',
  'north shore towers',
  'village of rockville', 'village of freeport',
  'eversource', 'avangrid',
  'sce', 'southern california edison',
  'pg&e', 'pacific gas',
  'sdg&e', 'san diego gas',
  'ladwp', 'los angeles department',
  'dte', 'consumers energy',
  'comed', 'commonwealth edison',
  'xcel', 'duke energy', 'dominion',
  'fpl', 'florida power', 'tampa electric',
  'peco', 'ppl electric', 'duquesne',
];

function isUtilitySpecificProgram(title: string): boolean {
  const lower = title.toLowerCase();
  return KNOWN_UTILITY_NAMES.some(name => lower.includes(name));
}

// Alias map: canonical utility name -> all known variations
const UTILITY_ALIASES: Record<string, string[]> = {
  'long island power authority': ['long island', 'lipa', 'pseg long island', 'pseg li'],
  'consolidated edison': ['con edison', 'coned', 'con ed'],
  'national grid': ['national grid'],
  'rochester gas and electric': ['rg&e', 'rge', 'rochester gas'],
  'new york state electric': ['nyseg'],
  'central hudson': ['central hudson'],
  'orange and rockland': ['o&r', 'orange & rockland', 'orange and rockland'],
  'fishers island': ['fishers island'],
  'north shore towers': ['north shore towers'],
  'village of rockville': ['village of rockville'],
  'village of freeport': ['village of freeport'],
};

function utilityMatchesSite(programTitle: string, siteUtilityName: string): boolean {
  const title = programTitle.toLowerCase();
  const utility = siteUtilityName.toLowerCase();

  // Direct containment
  if (title.includes(utility)) return true;

  // Check alias map: find which utility the site belongs to, then check if program matches
  for (const [canonical, aliases] of Object.entries(UTILITY_ALIASES)) {
    const siteIsThisUtility = utility.includes(canonical) || aliases.some(a => utility.includes(a));
    if (siteIsThisUtility) {
      // Does the program title match this same utility?
      return title.includes(canonical) || aliases.some(a => title.includes(a));
    }
  }

  // Fallback: check if significant words overlap
  const utilityWords = utility.split(/\s+/).filter(w => w.length > 3);
  const matchCount = utilityWords.filter(w => title.includes(w)).length;
  return matchCount >= 2;
}

function isRelevantToEVCharging(item: any): boolean {
  const text = `${item.title ?? ''} ${item.plaintext ?? ''} ${item.text ?? ''}`.toLowerCase();

  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) return false;
  if (!EVSE_KEYWORDS.some(kw => text.includes(kw))) return false;

  const techs: string[] = item.technologies || [];
  if (techs.length > 0 && !techs.includes('ELEC') && !techs.includes('PHEV') && !techs.includes('HEV')) return false;

  const cats: any[] = item.categories || [];
  const catCodes = cats.map((c: any) => c.code);
  if (item.type === 'Laws and Regulations' && !catCodes.includes('STATION')) return false;

  return true;
}

export interface FetchIncentivesOptions {
  stateCode: string;
  utilityCompanyId?: string | null;
  utilityName?: string | null;
  siteAddress?: string | null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMunicipalityName(title: string): string | null {
  const match = title.match(/\b(?:village|city|town|county|borough)\s+of\s+([a-z\s'.&-]+)/i);
  if (!match?.[1]) return null;
  return normalizeText(match[1]);
}

function municipalityMatchesSite(programTitle: string, siteAddress?: string | null): boolean {
  if (!siteAddress) return false;
  const municipality = extractMunicipalityName(programTitle);
  if (!municipality) return true;
  const normalizedAddress = normalizeText(siteAddress);
  return normalizedAddress.includes(municipality);
}

function parseEstimatedBenefit(text: string): string | null {
  const money = text.match(/\$\s?\d[\d,]*(?:\s*(?:-|to)\s*\$\s?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:port|charger|station|project|year|kw|kwh))?/i);
  if (money?.[0]) return money[0].replace(/\s+/g, ' ').trim();

  const percent = text.match(/\b\d{1,3}\s?%\b/);
  if (percent?.[0]) return percent[0].replace(/\s+/g, ' ').trim();

  return null;
}

function inferProgramCategory(type: string): 'federal' | 'state' | 'utility' | 'other' {
  const t = type.toLowerCase();
  if (t.includes('utility')) return 'utility';
  if (t.includes('state')) return 'state';
  if (t.includes('federal')) return 'federal';
  return 'other';
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
        const isIncentiveType = r.type === 'State Incentives' || r.type === 'Incentives' || r.type === 'Utility / Private Incentives';
        const isRelevantLaw = r.type === 'Laws and Regulations' && isRelevantToEVCharging(r);
        if (!isIncentiveType && !isRelevantLaw) return false;

        if (!isRelevantToEVCharging(r)) return false;
        if (r.status === 'repealed' || r.status === 'expired') return false;

        if (r.utility_id != null && opts.utilityCompanyId) {
          if (String(r.utility_id) !== String(opts.utilityCompanyId)) return false;
        }

        const title = r.title || '';
        if (isUtilitySpecificProgram(title)) {
          if (!opts.utilityName) return false;
          if (!utilityMatchesSite(title, opts.utilityName)) return false;
        }

        // Municipal incentives (e.g. "Village of Greenport") must match site address
        if (!municipalityMatchesSite(title, opts.siteAddress)) return false;

        return true;
      })
      .map((r: any) => {
        const programText = `${r.title ?? ''} ${r.plaintext ?? ''}`;
        return {
          id: r.id,
          title: r.title,
          state: r.state,
          type: r.type,
          description: r.plaintext?.slice(0, 240) || '',
          status: r.status || 'active',
          enacted_date: r.enacted_date,
          amended_date: r.amended_date,
          utilityId: r.utility_id,
          category: inferProgramCategory(r.type || ''),
          eligible: true,
          estimatedBenefit: parseEstimatedBenefit(programText),
        };
      });
  } catch (err) {
    console.error('Failed to fetch NREL incentives:', err);
    return [];
  }
}
