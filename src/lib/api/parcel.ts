/**
 * NYC MapPLUTO – Parcel / lot data via ArcGIS FeatureServer
 * Free, no key required.
 * Returns lot area (sq ft), building area, owner name for the tax lot
 * containing the given lat/lng.
 */

const PLUTO_QUERY =
  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query';

export interface ParcelResult {
  lotArea: number | null;       // sq ft
  bldgArea: number | null;      // sq ft
  address: string | null;
  ownerName: string | null;
  landUse: string | null;
  bbl: string | null;
}

/**
 * Query MapPLUTO by point (lat, lng).
 * Only works for NYC (5 boroughs). Returns null fields for locations outside NYC.
 */
export async function fetchParcelInfo(
  lat: number,
  lng: number,
): Promise<ParcelResult> {
  const empty: ParcelResult = {
    lotArea: null,
    bldgArea: null,
    address: null,
    ownerName: null,
    landUse: null,
    bbl: null,
  };

  try {
    const url = new URL(PLUTO_QUERY);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set(
      'outFields',
      'LotArea,BldgArea,Address,OwnerName,LandUse,BBL',
    );
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn('MapPLUTO query error', res.status);
      return empty;
    }

    const data = await res.json();
    const features = data?.features;
    if (!features?.length) return empty;

    const attrs = features[0].attributes;
    return {
      lotArea: attrs.LotArea ?? null,
      bldgArea: attrs.BldgArea ?? null,
      address: attrs.Address ?? null,
      ownerName: attrs.OwnerName ?? null,
      landUse: attrs.LandUse ?? null,
      bbl: attrs.BBL ? String(attrs.BBL) : null,
    };
  } catch (err) {
    console.error('fetchParcelInfo failed', err);
    return empty;
  }
}
