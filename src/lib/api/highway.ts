/**
 * Nearest highway proximity via NTAD National Highway System ArcGIS FeatureServer.
 * Free service, no key required.
 * Finds nearest NHS road segment and calculates approximate distance.
 */

const NHS_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Highway_System/FeatureServer/0/query';

export interface HighwayProximity {
  distanceMiles: number | null;
  routeName: string | null;
  isInterstate: boolean;
}

const empty: HighwayProximity = {
  distanceMiles: null,
  routeName: null,
  isInterstate: false,
};

export async function fetchNearestHighway(lat: number, lng: number): Promise<HighwayProximity> {
  try {
    // Search within ~5 mile envelope
    const latBuffer = 0.072;  // ~5 miles
    const lngBuffer = 0.09;
    const envelope = `${lng - lngBuffer},${lat - latBuffer},${lng + lngBuffer},${lat + latBuffer}`;

    const url = new URL(NHS_URL);
    url.searchParams.set('geometry', envelope);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'SIGN1,LNAME,NHS');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('resultRecordCount', '5');
    url.searchParams.set('orderByFields', 'NHS DESC');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return empty;

    const data = await res.json();
    const features = data?.features;
    if (!features?.length) return empty;

    // Find nearest feature by checking geometry
    let nearest = features[0];
    let minDist = Infinity;

    for (const feat of features) {
      const geom = feat.geometry;
      if (!geom?.paths) continue;
      for (const path of geom.paths) {
        for (const [px, py] of path) {
          const d = Math.sqrt((px - lng) ** 2 + (py - lat) ** 2);
          if (d < minDist) {
            minDist = d;
            nearest = feat;
          }
        }
      }
    }

    // Convert degrees to approximate miles (1 degree ≈ 69 miles at this latitude)
    const distMiles = minDist * 69;

    const attrs = nearest.attributes;
    const sign = attrs.SIGN1?.trim() || null;
    const lname = attrs.LNAME?.trim() || null;
    const routeName = sign || lname || null;
    // NHS values: 1=Interstate, 2=Other NHS, etc.
    const isInterstate = attrs.NHS === 1 || (routeName?.startsWith('I-') ?? false);

    return {
      distanceMiles: Math.round(distMiles * 10) / 10,
      routeName,
      isInterstate,
    };
  } catch (err) {
    console.error('Highway proximity check failed:', err);
    return empty;
  }
}
