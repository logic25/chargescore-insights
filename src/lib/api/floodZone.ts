/**
 * FEMA National Flood Hazard Layer (NFHL) — check flood zone for a location.
 * Proxied through edge function to avoid CORS issues.
 */

import { supabase } from '@/integrations/supabase/client';

export interface FloodZoneResult {
  floodZone: string | null;
  floodZoneSubtype: string | null;
  isHighRisk: boolean;
}

const empty: FloodZoneResult = {
  floodZone: null,
  floodZoneSubtype: null,
  isHighRisk: false,
};

export async function fetchFloodZone(lat: number, lng: number): Promise<FloodZoneResult> {
  try {
    const { data, error } = await supabase.functions.invoke('get-flood-zone', {
      body: { lat, lng },
    });

    if (error) {
      console.warn('Flood zone edge function error', error);
      return empty;
    }

    return {
      floodZone: data?.floodZone ?? null,
      floodZoneSubtype: data?.floodZoneSubtype ?? null,
      isHighRisk: data?.isHighRisk ?? false,
    };
  } catch (err) {
    console.error('fetchFloodZone failed', err);
    return empty;
  }
}
