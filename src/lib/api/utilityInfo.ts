/**
 * NREL Utility Rates API — get utility name and commercial rate for a location.
 * Uses the same NREL API key as other calls. No additional key needed.
 */

const NREL_API_KEY = 'ttwrfmgTXzqUEZctNUcKtCbN2gnJhnST68fj6Oe9';

export interface UtilityInfo {
  utilityName: string | null;
  commercialRate: number | null; // $/kWh
  companyId: string | null;     // NREL utility company_id for incentive matching
}

export async function fetchUtilityInfo(lat: number, lng: number): Promise<UtilityInfo> {
  try {
    const url = `https://developer.nrel.gov/api/utility_rates/v3.json?api_key=${NREL_API_KEY}&lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NREL Utility Rates error: ${res.status}`);
    const data = await res.json();
    const outputs = data?.outputs;
    return {
      utilityName: outputs?.utility_name ?? null,
      commercialRate: outputs?.commercial ?? null,
      companyId: outputs?.company_id ?? null,
    };
  } catch (err) {
    console.error('Utility info fetch failed:', err);
    return { utilityName: null, commercialRate: null, companyId: null };
  }
}
}
