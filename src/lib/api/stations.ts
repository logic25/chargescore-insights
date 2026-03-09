import type { NearbyStation } from '@/types/chargeRank';
import { haversineDistance } from '@/lib/geo';
import { nrelFetch } from './nrelProxy';

export async function fetchNearbyStations(lat: number, lng: number, radiusMiles: number = 10): Promise<NearbyStation[]> {
  try {
    const data = await nrelFetch('alt-fuel-stations/v1/nearest.json', {
      fuel_type: 'ELEC',
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: radiusMiles.toString(),
      status: 'E',
      limit: '200',
    });

    return (data.fuel_stations || [])
      .map((s: any) => {
        const dist = s.distance ?? haversineDistance(lat, lng, s.latitude, s.longitude);
        return {
          id: String(s.id),
          name: s.station_name || 'Unknown Station',
          network: s.ev_network || 'Unknown',
          chargerType: mapChargerType(s),
          numPorts: (s.ev_dc_fast_num || 0) + (s.ev_level2_evse_num || 0) + (s.ev_level1_evse_num || 0),
          lat: s.latitude,
          lng: s.longitude,
          distanceMiles: dist,
        };
      })
      .filter((s: NearbyStation) => s.distanceMiles <= radiusMiles)
      .sort((a: NearbyStation, b: NearbyStation) => a.distanceMiles - b.distanceMiles);
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
