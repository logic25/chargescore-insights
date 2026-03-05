/**
 * FHWA Alternative Fuel Corridors — check if a location is on/near a designated EV corridor.
 * Free ArcGIS service, no key required.
 * Uses a ~1-mile bounding box around the point (envelope geometry).
 */

const AFC_URL =
  'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/NEVI_Corridor_Groups_December9/FeatureServer/0/query';

export async function fetchIsOnAltFuelCorridor(lat: number, lng: number): Promise<boolean> {
  try {
    // ~1 mile ≈ 0.0145 degrees latitude, ~0.018 degrees longitude at mid-latitudes
    const latBuffer = 0.0145;
    const lngBuffer = 0.018;
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
    return (data?.count ?? 0) > 0;
  } catch (err) {
    console.error('Alt Fuel Corridor check failed:', err);
    return false;
  }
}
