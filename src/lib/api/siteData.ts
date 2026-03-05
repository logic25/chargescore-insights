/**
 * Combined site data check — DAC status, Alt Fuel Corridor, and FEMA Flood Zone.
 * Proxied through edge function to avoid ArcGIS referrer restrictions and FEMA CORS.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SiteDataResult {
  isDAC: boolean;
  isOnCorridor: boolean;
  floodZone: string | null;
  floodZoneSubtype: string | null;
  isHighRisk: boolean;
}

const empty: SiteDataResult = {
  isDAC: false,
  isOnCorridor: false,
  floodZone: null,
  floodZoneSubtype: null,
  isHighRisk: false,
};

export async function fetchSiteData(lat: number, lng: number): Promise<SiteDataResult> {
  try {
    const { data, error } = await supabase.functions.invoke('get-site-data', {
      body: { lat, lng },
    });

    if (error) {
      console.warn('Site data edge function error', error);
      return empty;
    }

    return {
      isDAC: data?.isDAC ?? false,
      isOnCorridor: data?.isOnCorridor ?? false,
      floodZone: data?.floodZone ?? null,
      floodZoneSubtype: data?.floodZoneSubtype ?? null,
      isHighRisk: data?.isHighRisk ?? false,
    };
  } catch (err) {
    console.error('fetchSiteData failed', err);
    return empty;
  }
}
