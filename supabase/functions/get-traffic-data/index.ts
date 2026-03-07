import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HPMS_BASE = 'https://datahub.transportation.gov/resource/4dez-3n4e.json';

// State-level Socrata AADT datasets (free, no key required)
const STATE_AADT_SOURCES: Record<string, { url: string; countyField: string; roadField: string; aadtField: string; yearField: string }> = {
  NY: {
    url: 'https://data.ny.gov/resource/6amx-2pbv.json',
    countyField: 'county',
    roadField: 'road_name',
    aadtField: 'count',
    yearField: 'aadt_year',
  },
  NJ: {
    url: 'https://data.nj.gov/resource/4fhp-re7g.json',
    countyField: 'county',
    roadField: 'sri_std_rt',
    aadtField: 'aadt',
    yearField: 'year_',
  },
  CT: {
    url: 'https://data.ct.gov/resource/kbxi-4ia7.json',
    countyField: 'town',
    roadField: 'route',
    aadtField: 'aadt',
    yearField: 'year',
  },
};

/**
 * Extract street name from a formatted address for fuzzy matching.
 * e.g. "1525 86th Street, Brooklyn, NY" → "86TH ST"
 */
function extractStreetName(address: string): string | null {
  // Take the first part before the comma
  const firstPart = address.split(',')[0]?.trim() || '';
  // Remove the house number (leading digits + optional dash/letters)
  const withoutNumber = firstPart.replace(/^\d+[-\w]*\s+/, '').toUpperCase();
  // Normalize common suffixes
  return withoutNumber
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bPARKWAY\b/g, 'PKWY')
    .replace(/\bPLACE\b/g, 'PL')
    .replace(/\bCOURT\b/g, 'CT')
    .replace(/\bLANE\b/g, 'LN')
    .trim() || null;
}

/**
 * Extract county from FCC Census API result or address for state-level lookup.
 */
function extractCountyFromAddress(address: string): string | null {
  // Common patterns: "..., Kings County, ..." or "..., Brooklyn, ..."
  const parts = address.split(',').map(p => p.trim());
  // NYC borough mapping
  const boroughToCounty: Record<string, string> = {
    'BROOKLYN': 'Kings',
    'MANHATTAN': 'New York',
    'QUEENS': 'Queens',
    'BRONX': 'Bronx',
    'STATEN ISLAND': 'Richmond',
  };
  for (const part of parts) {
    const upper = part.toUpperCase();
    if (boroughToCounty[upper]) return boroughToCounty[upper];
    if (upper.includes('COUNTY')) return part.replace(/\s*county\s*/i, '').trim();
  }
  return null;
}

/**
 * Try state ArcGIS AADT FeatureServers (geospatial query by lat/lng envelope).
 * These support spatial queries unlike Socrata.
 */
const ARCGIS_AADT_SOURCES: Record<string, { url: string; aadtField: string; roadField: string; yearField: string }> = {
  FL: {
    url: 'https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Annual_Average_Daily_Traffic_TDA/FeatureServer/0/query',
    aadtField: 'AADT',
    roadField: 'ROADWAY',
    yearField: 'YEAR_',
  },
};

async function fetchArcGisAadt(
  state: string,
  lat: number,
  lng: number,
): Promise<{ aadt: number | null; routeId: string | null; year: number | null }> {
  const source = ARCGIS_AADT_SOURCES[state];
  if (!source) return { aadt: null, routeId: null, year: null };

  // ~500m envelope around the point
  const delta = 0.005;
  const envelope = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

  try {
    const url = new URL(source.url);
    url.searchParams.set('geometry', envelope);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', `${source.aadtField},${source.roadField},${source.yearField}`);
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('orderByFields', `${source.aadtField} DESC`);
    url.searchParams.set('resultRecordCount', '3');
    url.searchParams.set('f', 'json');

    console.log('ArcGIS AADT query:', url.toString());

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error('ArcGIS AADT error', res.status, await res.text());
      return { aadt: null, routeId: null, year: null };
    }

    const data = await res.json();
    const features = data?.features;
    if (!features?.length) return { aadt: null, routeId: null, year: null };

    const attrs = features[0].attributes;
    return {
      aadt: attrs[source.aadtField] ?? null,
      routeId: attrs[source.roadField] ?? null,
      year: attrs[source.yearField] ?? null,
    };
  } catch (err) {
    console.error('ArcGIS AADT fetch failed', err);
    return { aadt: null, routeId: null, year: null };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusMeters = 500, state, address } = await req.json();

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'lat and lng required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appToken = Deno.env.get('SOCRATA_APP_TOKEN');

    // Try federal HPMS first (multiple radii: 500m, 2000m, 5000m)
    const radii = [radiusMeters, 2000, 5000];

    for (const r of radii) {
      try {
        const url = new URL(HPMS_BASE);
        url.searchParams.set('$where', `within_circle(the_geom, ${lat}, ${lng}, ${r})`);
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
                  source: 'hpms',
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
            source: 'hpms',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (err) {
        console.error(`HPMS radius ${r}m failed`, err);
      }
    }

    // Fallback: state-level Socrata AADT dataset
    if (state && address) {
      console.log(`HPMS returned no results, trying state-level fallback for ${state}`);
      const stateResult = await fetchStateAadt(state, address);
      if (stateResult.aadt) {
        return new Response(JSON.stringify({
          ...stateResult,
          source: `state_dot_${state.toLowerCase()}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // No results at any source
    return new Response(JSON.stringify({ aadt: null, routeId: null, year: null, source: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-traffic-data error', err);
    return new Response(JSON.stringify({ aadt: null, routeId: null, year: null, source: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
