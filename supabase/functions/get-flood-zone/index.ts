import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NFHL_URL =
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query';

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

    const url = new URL(NFHL_URL);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'FLD_ZONE,ZONE_SUBTY');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error('FEMA NFHL error', res.status, text);
      return new Response(JSON.stringify({ floodZone: null, floodZoneSubtype: null, isHighRisk: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const features = data?.features;

    if (!features?.length) {
      return new Response(JSON.stringify({ floodZone: null, floodZoneSubtype: null, isHighRisk: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const attrs = features[0].attributes;
    const zone = attrs.FLD_ZONE ?? null;
    const subtype = attrs.ZONE_SUBTY ?? null;
    const isHighRisk = zone ? /^[AV]/i.test(zone) : false;

    return new Response(JSON.stringify({ floodZone: zone, floodZoneSubtype: subtype, isHighRisk }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-flood-zone error', err);
    return new Response(JSON.stringify({ floodZone: null, floodZoneSubtype: null, isHighRisk: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
