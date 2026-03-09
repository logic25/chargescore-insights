/**
 * NREL Utility Rates API — get utility name and commercial rate for a location.
 */
import { nrelFetch } from './nrelProxy';

export interface UtilityInfo {
  utilityName: string | null;
  commercialRate: number | null;
  companyId: string | null;
}

export async function fetchUtilityInfo(lat: number, lng: number): Promise<UtilityInfo> {
  try {
    const data = await nrelFetch('utility_rates/v3.json', {
      lat: lat.toString(),
      lon: lng.toString(),
    });
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
