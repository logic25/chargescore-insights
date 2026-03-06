// County-level EV registrations (approximate, within ~5-mile radius proxy)
// Sources: Atlas EV Hub, DOE AFDC, state DMV registration reports
// Major metro counties with high EV density are listed; others fall back to state estimates

const COUNTY_EV_ESTIMATES: Record<string, Record<string, number>> = {
  CA: {
    'Los Angeles': 8500, 'Orange': 6000, 'San Diego': 5200, 'Santa Clara': 9000,
    'San Francisco': 7500, 'Alameda': 6500, 'San Mateo': 7000, 'Contra Costa': 4500,
    'Sacramento': 3500, 'Riverside': 2800, 'San Bernardino': 2000, 'Ventura': 3200,
    'Marin': 5500, 'Sonoma': 3000, 'Santa Barbara': 2800, 'Placer': 3000,
    'San Luis Obispo': 2200, 'Monterey': 2000, 'Kern': 1200,
  },
  NY: {
    'Kings': 5200, 'Queens': 4800, 'New York': 6000, 'Bronx': 3500, 'Richmond': 3000,
    'Nassau': 4500, 'Suffolk': 3800, 'Westchester': 4200, 'Rockland': 2800,
    'Erie': 1800, 'Monroe': 1600, 'Albany': 1400, 'Dutchess': 2000,
    'Orange': 1800, 'Putnam': 1600, 'Ulster': 1200,
  },
  NJ: {
    'Bergen': 4500, 'Essex': 3800, 'Hudson': 4000, 'Middlesex': 3500,
    'Morris': 3800, 'Monmouth': 3200, 'Union': 3000, 'Somerset': 3500,
    'Passaic': 2500, 'Camden': 2000, 'Burlington': 2200, 'Mercer': 2800,
    'Ocean': 2000,
  },
  MA: {
    'Middlesex': 4500, 'Suffolk': 4000, 'Norfolk': 3800, 'Essex': 3200,
    'Worcester': 2500, 'Plymouth': 2200, 'Bristol': 1800, 'Hampden': 1200,
    'Hampshire': 1800, 'Barnstable': 2000,
  },
  FL: {
    'Miami-Dade': 3500, 'Broward': 3000, 'Palm Beach': 2800, 'Hillsborough': 2200,
    'Orange': 2500, 'Pinellas': 2000, 'Duval': 1800, 'Lee': 1600,
    'Sarasota': 1800, 'Brevard': 1500, 'Seminole': 1800, 'Collier': 2000,
  },
  TX: {
    'Travis': 3500, 'Harris': 2500, 'Dallas': 2800, 'Collin': 3000,
    'Tarrant': 2200, 'Bexar': 1800, 'Williamson': 2500, 'Denton': 2400,
    'Fort Bend': 2200, 'Montgomery': 1600, 'El Paso': 1000,
  },
  WA: {
    'King': 6500, 'Snohomish': 4200, 'Pierce': 3000, 'Kitsap': 2800,
    'Clark': 2500, 'Thurston': 2200, 'Whatcom': 2000, 'Spokane': 1500,
    'Island': 2500,
  },
  CO: {
    'Denver': 4000, 'Boulder': 4500, 'Jefferson': 3500, 'Arapahoe': 3200,
    'Douglas': 3500, 'Adams': 2500, 'Larimer': 2800, 'El Paso': 2000,
    'Broomfield': 3200, 'Weld': 1500,
  },
  IL: {
    'Cook': 3000, 'DuPage': 3500, 'Lake': 3200, 'Will': 2200,
    'Kane': 2000, 'McHenry': 1800, 'Winnebago': 1200, 'Champaign': 1500,
  },
  PA: {
    'Philadelphia': 2200, 'Montgomery': 2800, 'Chester': 3000, 'Delaware': 2500,
    'Bucks': 2500, 'Allegheny': 2000, 'Lancaster': 1500, 'Cumberland': 1400,
  },
  OR: {
    'Multnomah': 5000, 'Washington': 4500, 'Clackamas': 3800, 'Lane': 3000,
    'Deschutes': 2800, 'Marion': 2000, 'Jackson': 1800,
  },
  CT: {
    'Fairfield': 3500, 'Hartford': 2500, 'New Haven': 2200, 'Middlesex': 2000,
    'Litchfield': 1800, 'New London': 1600,
  },
  MD: {
    'Montgomery': 3500, 'Howard': 3200, 'Anne Arundel': 2500, 'Baltimore': 2200,
    'Prince George\'s': 2000, 'Frederick': 1800, 'Harford': 1600,
  },
  VA: {
    'Fairfax': 3800, 'Arlington': 4000, 'Loudoun': 3500, 'Prince William': 2500,
    'Albemarle': 2200, 'Henrico': 1800, 'Chesterfield': 1600,
  },
  AZ: {
    'Maricopa': 2500, 'Pima': 1800, 'Coconino': 1500, 'Yavapai': 1200,
  },
  GA: {
    'Fulton': 2500, 'DeKalb': 2200, 'Cobb': 2000, 'Gwinnett': 1800,
  },
  NC: {
    'Wake': 2500, 'Mecklenburg': 2200, 'Durham': 2000, 'Orange': 2200,
    'Buncombe': 1800, 'Guilford': 1500,
  },
  MN: {
    'Hennepin': 2800, 'Ramsey': 2500, 'Dakota': 2200, 'Washington': 2000,
    'Anoka': 1600,
  },
  MI: {
    'Washtenaw': 2200, 'Oakland': 2000, 'Wayne': 1500, 'Kent': 1400,
  },
  OH: {
    'Franklin': 1800, 'Cuyahoga': 1500, 'Hamilton': 1400, 'Summit': 1200,
    'Delaware': 2000,
  },
  HI: {
    'Honolulu': 3500, 'Maui': 2800, 'Hawaii': 2000,
  },
  NV: {
    'Clark': 2200, 'Washoe': 2000, 'Douglas': 1800,
  },
  UT: {
    'Salt Lake': 2500, 'Utah': 2200, 'Davis': 2000, 'Summit': 2200,
  },
  DC: {
    'District of Columbia': 3500,
  },
};

// State-level fallbacks (used when county not found)
const STATE_EV_ESTIMATES: Record<string, number> = {
  CA: 4500, WA: 2800, CO: 1800, MA: 1600, NJ: 1500,
  NY: 1400, FL: 1200, TX: 1100, IL: 1000, PA: 900,
  OR: 2200, CT: 1300, MD: 1200, VA: 1100, AZ: 1000,
  MN: 900, GA: 800, NC: 800, MI: 700, OH: 600,
  HI: 1800, VT: 1400, RI: 1100, NH: 900, ME: 700,
  NV: 1100, UT: 1000, DC: 1500, NM: 600, DE: 800,
};

/**
 * Get EV registration estimate, preferring county-level data when available.
 * Falls back to state-level, then national default.
 */
export function getEstimatedEvRegistrations(state: string, county?: string): number {
  if (county && COUNTY_EV_ESTIMATES[state]) {
    // Try exact match first, then try stripping " County" suffix
    const cleanCounty = county.replace(/\s+County$/i, '').trim();
    const countyData = COUNTY_EV_ESTIMATES[state];
    if (countyData[cleanCounty]) return countyData[cleanCounty];
    // Try case-insensitive match
    const match = Object.keys(countyData).find(k => k.toLowerCase() === cleanCounty.toLowerCase());
    if (match) return countyData[match];
  }
  return STATE_EV_ESTIMATES[state] || 500;
}

/**
 * Extract county name from a full address string.
 * Looks for "X County" pattern common in geocoded addresses.
 */
export function extractCountyFromAddress(address: string): string | undefined {
  // Match "County Name County" but not "County Road" etc.
  const match = address.match(/,\s*([A-Za-z\s.'-]+?)\s+County\b/i);
  if (match) return match[1].trim() + ' County';
  return undefined;
}
