/**
 * FEMA National Flood Hazard Layer (NFHL) — check flood zone for a location.
 * Free ArcGIS MapServer, no key required.
 * Layer 28 = Flood Hazard Zones.
 */

const NFHL_URL =
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query';

export interface FloodZoneResult {
  floodZone: string | null;       // e.g., "X", "AE", "VE"
  floodZoneSubtype: string | null; // e.g., "AREA OF MINIMAL FLOOD HAZARD"
  isHighRisk: boolean;             // true for A/V zones
}

const empty: FloodZoneResult = {
  floodZone: null,
  floodZoneSubtype: null,
  isHighRisk: false,
};

export async function fetchFloodZone(lat: number, lng: number): Promise<FloodZoneResult> {
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
    const features = data?.features;
    if (!features?.length) return empty;

    const attrs = features[0].attributes;
    const zone = attrs.FLD_ZONE ?? null;
    const subtype = attrs.ZONE_SUBTY ?? null;

    // High-risk zones start with A or V (100-year floodplain)
    const isHighRisk = zone ? /^[AV]/i.test(zone) : false;

    return { floodZone: zone, floodZoneSubtype: subtype, isHighRisk };
  } catch (err) {
    console.error('FEMA flood zone check failed:', err);
    return empty;
  }
}
