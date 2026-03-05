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

    const appToken = Deno.env.get('SOCRATA_APP_TOKEN');

    // Try multiple radii: 500m, 2000m, 5000m
    const radii = [radiusMeters, 2000, 5000];

    for (const r of radii) {
      const url = new URL(HPMS_BASE);
      url.searchParams.set('$where', `within_circle(the_geom, ${lat}, ${lng}, ${r})`);
      // Try both common field names — aadt_vn (value numeric) and aadt
      url.searchParams.set('$select', 'aadt_vn, aadt, route_id, route_name, year_record');
      url.searchParams.set('$order', 'aadt_vn DESC NULL LAST, aadt DESC NULL LAST');
      url.searchParams.set('$limit', '5');
      if (appToken) url.searchParams.set('$$app_token', appToken);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        console.error(`HPMS API error at ${r}m`, res.status, text);
        
        // If the field names caused an error, try simpler query
        if (res.status === 400) {
          const url2 = new URL(HPMS_BASE);
          url2.searchParams.set('$where', `within_circle(the_geom, ${lat}, ${lng}, ${r})`);
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
        continue;
      }

      const rows = await res.json();
      if (rows.length) {
        const top = rows[0];
        const aadtValue = top.aadt_vn ?? top.aadt ?? null;
        return new Response(JSON.stringify({
          aadt: aadtValue ? parseInt(String(aadtValue), 10) : null,
          routeId: top.route_id ?? top.route_name ?? null,
          year: top.year_record ? parseInt(top.year_record, 10) : null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // No results at any radius
    return new Response(JSON.stringify({ aadt: null, routeId: null, year: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-traffic-data error', err);
    return new Response(JSON.stringify({ aadt: null, routeId: null, year: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
