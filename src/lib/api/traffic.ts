/**
 * HPMS (FHWA) – Annual Average Daily Traffic via Socrata Open Data API
 * Dataset: data.transportation.gov  (resource id: 4dez-3n4e)
 * Free, no key required (but accepts an app token for higher rate limits).
 */

const HPMS_BASE = 'https://datahub.transportation.gov/resource/4dez-3n4e.json';

export interface AadtResult {
  aadt: number | null;
  routeId: string | null;
  year: number | null;
}

/**
 * Fetch AADT for the nearest road segment within `radiusMeters` of (lat, lng).
 * Returns the highest AADT found (closest major road wins).
 */
export async function fetchAadt(
  lat: number,
  lng: number,
  radiusMeters = 500,
): Promise<AadtResult> {
  try {
    const url = new URL(HPMS_BASE);
    url.searchParams.set(
      '$where',
      `within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`,
    );
    url.searchParams.set('$select', 'aadt_vn, route_id, year_record');
    url.searchParams.set('$order', 'aadt_vn DESC');
    url.searchParams.set('$limit', '5');

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn('HPMS API error', res.status);
      return { aadt: null, routeId: null, year: null };
    }

    const rows: Array<{
      aadt_vn?: string;
      route_id?: string;
      year_record?: string;
    }> = await res.json();

    if (!rows.length) {
      // Widen search radius and try once more
      if (radiusMeters < 2000) {
        return fetchAadt(lat, lng, 2000);
      }
      return { aadt: null, routeId: null, year: null };
    }

    const top = rows[0];
    return {
      aadt: top.aadt_vn ? parseInt(top.aadt_vn, 10) : null,
      routeId: top.route_id ?? null,
      year: top.year_record ? parseInt(top.year_record, 10) : null,
    };
  } catch (err) {
    console.error('fetchAadt failed', err);
    return { aadt: null, routeId: null, year: null };
  }
}
