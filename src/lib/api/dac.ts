/**
 * CEJST (Climate & Economic Justice Screening Tool) — Disadvantaged Community check
 * Free ArcGIS FeatureServer, no key required.
 * Returns true if the lat/lng falls in a census tract identified as disadvantaged.
 */

const CEJST_URL =
  'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/CEJST_2022/FeatureServer/0/query';

export async function fetchIsDisadvantagedCommunity(lat: number, lng: number): Promise<boolean> {
  try {
    const url = new URL(CEJST_URL);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'SN_C');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return false;

    const data = await res.json();
    const features = data?.features;
    if (!features?.length) return false;

    // SN_C = "Identified as disadvantaged" — 1 = yes
    const identified = features[0].attributes?.SN_C;
    return identified === 1 || identified === '1' || identified === true;
  } catch (err) {
    console.error('CEJST DAC check failed:', err);
    return false;
  }
}
