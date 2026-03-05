/**
 * FHWA Alternative Fuel Corridors — check if a location is on/near a designated EV corridor.
 * Free ArcGIS service, no key required.
 * Uses the April 2025 Corridor Groups layer (public, no token needed).
 */

const AFC_URL =
  'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Corridor_Groups_NEVI__April_28/FeatureServer/0/query';

export async function fetchIsOnAltFuelCorridor(lat: number, lng: number): Promise<boolean> {
  try {
    // ~2 mile bounding box
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
    if (data?.error) {
      console.error('Alt Fuel Corridor API error:', data.error);
      return false;
    }
    return (data?.count ?? 0) > 0;
  } catch (err) {
    console.error('Alt Fuel Corridor check failed:', err);
    return false;
  }
}
