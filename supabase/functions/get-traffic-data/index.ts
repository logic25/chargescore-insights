import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HPMS_BASE = 'https://datahub.transportation.gov/resource/4dez-3n4e.json';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusMeters = 500 } = await req.json();

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'lat and lng required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(HPMS_BASE);
    url.searchParams.set('$where', `within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`);
    url.searchParams.set('$select', 'aadt_vn, route_id, year_record');
    url.searchParams.set('$order', 'aadt_vn DESC');
    url.searchParams.set('$limit', '5');

    // Add app token if available
    const appToken = Deno.env.get('SOCRATA_APP_TOKEN');
    if (appToken) {
      url.searchParams.set('$$app_token', appToken);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error('HPMS API error', res.status, text);
      return new Response(JSON.stringify({ aadt: null, routeId: null, year: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = await res.json();

    if (!rows.length) {
      // Widen radius if small
      if (radiusMeters < 2000) {
        // Retry with wider radius
        const url2 = new URL(HPMS_BASE);
        url2.searchParams.set('$where', `within_circle(the_geom, ${lat}, ${lng}, 2000)`);
        url2.searchParams.set('$select', 'aadt_vn, route_id, year_record');
        url2.searchParams.set('$order', 'aadt_vn DESC');
        url2.searchParams.set('$limit', '5');
        if (appToken) url2.searchParams.set('$$app_token', appToken);

        const res2 = await fetch(url2.toString());
        if (res2.ok) {
          const rows2 = await res2.json();
          if (rows2.length) {
            const top = rows2[0];
            return new Response(JSON.stringify({
              aadt: top.aadt_vn ? parseInt(top.aadt_vn, 10) : null,
              routeId: top.route_id ?? null,
              year: top.year_record ? parseInt(top.year_record, 10) : null,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          await res2.text();
        }
      }
      return new Response(JSON.stringify({ aadt: null, routeId: null, year: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const top = rows[0];
    return new Response(JSON.stringify({
      aadt: top.aadt_vn ? parseInt(top.aadt_vn, 10) : null,
      routeId: top.route_id ?? null,
      year: top.year_record ? parseInt(top.year_record, 10) : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-traffic-data error', err);
    return new Response(JSON.stringify({ aadt: null, routeId: null, year: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
