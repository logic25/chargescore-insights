import type { NearbyStation } from '@/types/chargeScore';

const NREL_API_KEY = 'DEMO_KEY';
const NREL_BASE = 'https://developer.nrel.gov/api/alt-fuel-stations/v1.json';

export async function fetchNearbyStations(lat: number, lng: number, radiusMiles: number = 5): Promise<NearbyStation[]> {
  const params = new URLSearchParams({
    api_key: NREL_API_KEY,
    fuel_type: 'ELEC',
    latitude: lat.toString(),
    longitude: lng.toString(),
    radius: radiusMiles.toString(),
    status: 'E',
    limit: '50',
  });

  try {
    const res = await fetch(`${NREL_BASE}?${params}`);
    if (!res.ok) throw new Error(`NREL API error: ${res.status}`);
    const data = await res.json();

    return (data.fuel_stations || []).map((s: any) => ({
      id: String(s.id),
      name: s.station_name || 'Unknown Station',
      network: s.ev_network || 'Unknown',
      chargerType: mapChargerType(s),
      numPorts: (s.ev_dc_fast_num || 0) + (s.ev_level2_evse_num || 0) + (s.ev_level1_evse_num || 0),
      lat: s.latitude,
      lng: s.longitude,
      distanceMiles: s.distance || 0,
    }));
  } catch (err) {
    console.error('Failed to fetch NREL stations:', err);
    return [];
  }
}

function mapChargerType(station: any): 'L2' | 'DCFC' | 'Tesla' {
  if (station.ev_network === 'Tesla' || station.ev_network === 'Tesla Destination') return 'Tesla';
  if ((station.ev_dc_fast_num || 0) > 0) return 'DCFC';
  return 'L2';
}
