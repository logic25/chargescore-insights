/**
 * HPMS (FHWA) – Annual Average Daily Traffic
 * Proxied through edge function to avoid CORS issues and support app tokens.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AadtResult {
  aadt: number | null;
  routeId: string | null;
  year: number | null;
}

/**
 * Fetch AADT for the nearest road segment within `radiusMeters` of (lat, lng).
 */
export async function fetchAadt(
  lat: number,
  lng: number,
  radiusMeters = 500,
): Promise<AadtResult> {
  try {
    const { data, error } = await supabase.functions.invoke('get-traffic-data', {
      body: { lat, lng, radiusMeters },
    });

    if (error) {
      console.warn('AADT edge function error', error);
      return { aadt: null, routeId: null, year: null };
    }

    return {
      aadt: data?.aadt ?? null,
      routeId: data?.routeId ?? null,
      year: data?.year ?? null,
    };
  } catch (err) {
    console.error('fetchAadt failed', err);
    return { aadt: null, routeId: null, year: null };
  }
}
