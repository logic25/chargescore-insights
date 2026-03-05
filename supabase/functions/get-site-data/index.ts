import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ArcGIS endpoints that may block browser referrers
const CEJST_URL = 'https://arcgis.netl.doe.gov/server/rest/services/Hosted/CCS_EJ_SJ_Data/FeatureServer/13/query';
const AFC_URL = 'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Corridor_Groups_NEVI__April_28/FeatureServer/0/query';
const NFHL_URL = 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query';

async function checkDac(lat: number, lng: number): Promise<boolean> {
  try {
    const url = new URL(CEJST_URL);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'SN_C,Identified_as_disadvantaged');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.error || !data?.features?.length) return false;
    const attrs = data.features[0].attributes;
    const val = attrs?.SN_C ?? attrs?.Identified_as_disadvantaged;
    return val === 1 || val === '1' || val === true || val === 'True';
  } catch { return false; }
}

async function checkCorridor(lat: number, lng: number): Promise<boolean> {
  try {
    const latBuffer = 0.029;
    const lngBuffer = 0.036;
    const envelope = `${lng - lngBuffer},${lat - latBuffer},${lng + lngBuffer},${lat + latBuffer}`;
    const url = new URL(AFC_URL);
    url.searchParams.set('geometry', envelope);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'OBJECTID');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('returnCountOnly', 'true');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.error) return false;
    return (data?.count ?? 0) > 0;
  } catch { return false; }
}

interface FloodResult {
  floodZone: string | null;
  floodZoneSubtype: string | null;
  isHighRisk: boolean;
}

async function checkFloodZone(lat: number, lng: number): Promise<FloodResult> {
  const empty = { floodZone: null, floodZoneSubtype: null, isHighRisk: false };
  try {
    const url = new URL(NFHL_URL);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'FLD_ZONE,ZONE_SUBTY');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return empty;
    const data = await res.json();
    if (!data?.features?.length) return empty;
    const attrs = data.features[0].attributes;
    const zone = attrs.FLD_ZONE ?? null;
    const subtype = attrs.ZONE_SUBTY ?? null;
    const isHighRisk = zone ? /^[AV]/i.test(zone) : false;
    return { floodZone: zone, floodZoneSubtype: subtype, isHighRisk };
  } catch { return empty; }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'lat and lng required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run all checks in parallel
    const [isDAC, isOnCorridor, flood] = await Promise.all([
      checkDac(lat, lng),
      checkCorridor(lat, lng),
      checkFloodZone(lat, lng),
    ]);

    return new Response(JSON.stringify({
      isDAC,
      isOnCorridor,
      ...flood,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-site-data error', err);
    return new Response(JSON.stringify({
      isDAC: false, isOnCorridor: false,
      floodZone: null, floodZoneSubtype: null, isHighRisk: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
