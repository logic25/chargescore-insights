/**
 * Parcel / lot data via ArcGIS FeatureServers.
 * 1) NYC MapPLUTO for the 5 boroughs (free, no key).
 * 2) NYS Tax Parcels for the rest of NY state (free, no key) — official NY.gov service.
 * Returns lot area (sq ft), building area, owner name for the tax lot.
 */

const PLUTO_QUERY =
  'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query';

// Official NYS ITS GIS service — layer 0 is footprints, parcels are at the service-level query endpoint
const NYS_PARCELS_QUERY =
  'https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/query';

export interface ParcelResult {
  lotArea: number | null;       // sq ft
  bldgArea: number | null;      // sq ft
  address: string | null;
  ownerName: string | null;
  landUse: string | null;
  bbl: string | null;
  source: 'mappluto' | 'nys_parcels' | null;
}

const empty: ParcelResult = {
  lotArea: null, bldgArea: null, address: null,
  ownerName: null, landUse: null, bbl: null, source: null,
};

/**
 * Query MapPLUTO by point (NYC 5 boroughs).
 */
async function fetchMapPluto(lat: number, lng: number): Promise<ParcelResult> {
  try {
    const url = new URL(PLUTO_QUERY);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', 'LotArea,BldgArea,Address,OwnerName,LandUse,BBL');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('f', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) return empty;

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
      source: 'mappluto',
    };
  } catch (err) {
    console.error('MapPLUTO query failed', err);
    return empty;
  }
}

/**
 * Query NYS Tax Parcels by point (all participating NY counties).
 * Uses service-level query which searches across all layers.
 * Also tries individual layer queries as fallback.
 */
async function fetchNysParcels(lat: number, lng: number): Promise<ParcelResult> {
  // Try multiple layer endpoints since different counties may be on different layers
  const layerUrls = [
    'https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/0/query',
    'https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/1/query',
  ];

  for (const baseUrl of layerUrls) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('geometry', `${lng},${lat}`);
      url.searchParams.set('geometryType', 'esriGeometryPoint');
      url.searchParams.set('inSR', '4326');
      url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
      url.searchParams.set('outFields', '*');
      url.searchParams.set('returnGeometry', 'false');
      url.searchParams.set('f', 'json');

      const res = await fetch(url.toString());
      if (!res.ok) continue;

      const data = await res.json();
      const features = data?.features;
      if (!features?.length) continue;

      const attrs = features[0].attributes;
      // Field names vary — check common ones
      const sqFt = attrs.SQ_FT ?? attrs.SHAPE_Area ?? (attrs.CALC_ACRES ? Math.round(attrs.CALC_ACRES * 43560) : null);

      return {
        lotArea: sqFt ? Math.round(Number(sqFt)) : null,
        bldgArea: attrs.BLDG_SQ_FT ?? attrs.BldgArea ?? null,
        address: attrs.PARCEL_ADDR ?? attrs.ADDR ?? attrs.Address ?? null,
        ownerName: attrs.OWNER_TYPE ?? attrs.NAME ?? attrs.OwnerName ?? null,
        landUse: attrs.PROP_CLASS ?? attrs.LAND_USE ?? attrs.LandUse ?? null,
        bbl: null,
        source: 'nys_parcels',
      };
    } catch (err) {
      console.error(`NYS Tax Parcels query failed for ${baseUrl}`, err);
    }
  }

  return empty;
}

/**
 * Try MapPLUTO first (NYC), then fall back to NYS Tax Parcels for other NY locations.
 */
export async function fetchParcelInfo(lat: number, lng: number, state?: string): Promise<ParcelResult> {
  // Try MapPLUTO first
  const plutoResult = await fetchMapPluto(lat, lng);
  if (plutoResult.lotArea) return plutoResult;

  // Fall back to NYS Tax Parcels if in NY state
  if (state === 'NY') {
    return fetchNysParcels(lat, lng);
  }

  return empty;
}
