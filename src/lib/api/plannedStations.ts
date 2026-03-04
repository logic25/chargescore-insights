import { haversineDistance } from '@/lib/geo';

const NREL_API_KEY = 'ttwrfmgTXzqUEZctNUcKtCbN2gnJhnST68fj6Oe9';

export interface PlannedStationData {
  plannedCount: number;
  totalPlannedPorts: number;
  nearestPlannedMiles: number | null;
}

export async function fetchPlannedStations(lat: number, lng: number, radiusMiles: number = 5): Promise<PlannedStationData> {
  try {
    const params = new URLSearchParams({
      api_key: NREL_API_KEY,
      fuel_type: 'ELEC',
      ev_charging_level: 'dc_fast',
      status: 'P',
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: radiusMiles.toString(),
      limit: '200',
    });

    const res = await fetch(`https://developer.nrel.gov/api/alt-fuel-stations/v1.json?${params}`);
    if (!res.ok) throw new Error(`NLR API error: ${res.status}`);
    const data = await res.json();
    const rawStations = data.fuel_stations || [];

    // Calculate real distances and filter to actual radius
    const stations = rawStations
      .map((s: any) => ({
        ...s,
        _distance: s.distance ?? haversineDistance(lat, lng, s.latitude, s.longitude),
      }))
      .filter((s: any) => s._distance <= radiusMiles)
      .sort((a: any, b: any) => a._distance - b._distance);

    const plannedCount = stations.length;
    const totalPlannedPorts = stations.reduce((sum: number, s: any) => sum + (s.ev_dc_fast_num || 0), 0);
    const nearestPlannedMiles = stations.length > 0 ? stations[0]._distance : null;

    return { plannedCount, totalPlannedPorts, nearestPlannedMiles };
  } catch (err) {
    console.error('Failed to fetch planned stations:', err);
    return { plannedCount: 0, totalPlannedPorts: 0, nearestPlannedMiles: null };
  }
}
