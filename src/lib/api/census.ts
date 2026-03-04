// FCC Census Block Lookup + Census ACS data fetching

export interface CensusTractData {
  tractFips: string;
  multiFamilyPct: number | null;
  popDensity: number | null;
}

export async function fetchCensusTractFips(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`);
    const data = await res.json();
    const fips = data?.Block?.FIPS;
    return fips ? fips.substring(0, 11) : null;
  } catch (err) {
    console.error('FCC Census lookup failed:', err);
    return null;
  }
}

export async function fetchMultiFamilyPct(tractFips: string): Promise<number | null> {
  try {
    const state = tractFips.substring(0, 2);
    const county = tractFips.substring(2, 5);
    const tract = tractFips.substring(5, 11);

    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=B25024_001E,B25024_007E,B25024_008E,B25024_009E&for=tract:${tract}&in=state:${state}%20county:${county}`
    );
    const data = await res.json();
    if (data.length > 1) {
      const row = data[1];
      const totalUnits = parseInt(row[0]);
      const multiFamilyUnits = parseInt(row[1]) + parseInt(row[2]) + parseInt(row[3]);
      if (totalUnits > 0) return Math.round((multiFamilyUnits / totalUnits) * 100);
    }
    return null;
  } catch (err) {
    console.error('Census ACS multi-family lookup failed:', err);
    return null;
  }
}

export async function fetchPopDensity(tractFips: string): Promise<number | null> {
  try {
    const state = tractFips.substring(0, 2);
    const county = tractFips.substring(2, 5);
    const tract = tractFips.substring(5, 11);

    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=tract:${tract}&in=state:${state}%20county:${county}`
    );
    const data = await res.json();
    if (data.length > 1) {
      const population = parseInt(data[1][0]);
      // Average US census tract is ~4 sq mi, urban tracts much smaller (~0.5 sq mi)
      // Use population as rough proxy — will refine with TIGERweb area later
      return population;
    }
    return null;
  } catch (err) {
    console.error('Census population lookup failed:', err);
    return null;
  }
}
