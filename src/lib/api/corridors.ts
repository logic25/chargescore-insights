/**
 * FHWA Alternative Fuel Corridors — check if a location is on/near a designated EV corridor.
 * Free ArcGIS service, no key required.
 * Uses a 1-mile buffer around the point.
 */

const AFC_URL =
  'https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Corridor_Groups_NEVI__April_28/FeatureServer/0/query';

export async function fetchIsOnAltFuelCorridor(lat: number, lng: number): Promise<boolean> {
  try {
    const url = new URL(AFC_URL);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('distance', '1609'); // ~1 mile in meters
    url.searchParams.set('units', 'esriSRUnit_Meter');
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
