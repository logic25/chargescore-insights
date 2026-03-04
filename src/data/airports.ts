export const MAJOR_AIRPORTS = [
  { code: 'ATL', name: 'Hartsfield-Jackson', lat: 33.6407, lng: -84.4277 },
  { code: 'DFW', name: 'Dallas/Fort Worth', lat: 32.8998, lng: -97.0403 },
  { code: 'DEN', name: 'Denver Intl', lat: 39.8561, lng: -104.6737 },
  { code: 'ORD', name: "O'Hare", lat: 41.9742, lng: -87.9073 },
  { code: 'LAX', name: 'Los Angeles Intl', lat: 33.9425, lng: -118.4081 },
  { code: 'JFK', name: 'John F. Kennedy', lat: 40.6413, lng: -73.7781 },
  { code: 'LGA', name: 'LaGuardia', lat: 40.7769, lng: -73.8740 },
  { code: 'EWR', name: 'Newark Liberty', lat: 40.6895, lng: -74.1745 },
  { code: 'SFO', name: 'San Francisco Intl', lat: 37.6213, lng: -122.3790 },
  { code: 'SEA', name: 'Seattle-Tacoma', lat: 47.4502, lng: -122.3088 },
  { code: 'MCO', name: 'Orlando Intl', lat: 28.4312, lng: -81.3081 },
  { code: 'LAS', name: 'Harry Reid Intl', lat: 36.0840, lng: -115.1537 },
  { code: 'MIA', name: 'Miami Intl', lat: 25.7959, lng: -80.2870 },
  { code: 'CLT', name: 'Charlotte Douglas', lat: 35.2141, lng: -80.9431 },
  { code: 'PHX', name: 'Phoenix Sky Harbor', lat: 33.4373, lng: -112.0078 },
  { code: 'IAH', name: 'George Bush Houston', lat: 29.9902, lng: -95.3368 },
  { code: 'BOS', name: 'Logan', lat: 42.3656, lng: -71.0096 },
  { code: 'MSP', name: 'Minneapolis-St Paul', lat: 44.8848, lng: -93.2223 },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood', lat: 26.0726, lng: -80.1527 },
  { code: 'DTW', name: 'Detroit Metro', lat: 42.2124, lng: -83.3534 },
  { code: 'PHL', name: 'Philadelphia Intl', lat: 39.8721, lng: -75.2411 },
  { code: 'SLC', name: 'Salt Lake City', lat: 40.7899, lng: -111.9791 },
  { code: 'DCA', name: 'Reagan National', lat: 38.8512, lng: -77.0402 },
  { code: 'IAD', name: 'Dulles', lat: 38.9531, lng: -77.4565 },
  { code: 'BWI', name: 'Baltimore-Washington', lat: 39.1754, lng: -76.6684 },
  { code: 'SAN', name: 'San Diego Intl', lat: 32.7338, lng: -117.1933 },
  { code: 'TPA', name: 'Tampa Intl', lat: 27.9756, lng: -82.5333 },
  { code: 'PDX', name: 'Portland Intl', lat: 45.5898, lng: -122.5951 },
  { code: 'BNA', name: 'Nashville Intl', lat: 36.1263, lng: -86.6774 },
  { code: 'AUS', name: 'Austin-Bergstrom', lat: 30.1975, lng: -97.6664 },
  { code: 'STL', name: 'St. Louis Lambert', lat: 38.7487, lng: -90.3700 },
  { code: 'HNL', name: 'Daniel K. Inouye', lat: 21.3187, lng: -157.9225 },
  { code: 'OAK', name: 'Oakland Intl', lat: 37.7213, lng: -122.2208 },
  { code: 'MDW', name: 'Chicago Midway', lat: 41.7868, lng: -87.7522 },
  { code: 'RDU', name: 'Raleigh-Durham', lat: 35.8801, lng: -78.7880 },
  { code: 'SJC', name: 'San Jose Intl', lat: 37.3639, lng: -121.9289 },
  { code: 'DAL', name: 'Dallas Love Field', lat: 32.8471, lng: -96.8518 },
  { code: 'HOU', name: 'Houston Hobby', lat: 29.6454, lng: -95.2789 },
  { code: 'SMF', name: 'Sacramento Intl', lat: 38.6954, lng: -121.5908 },
  { code: 'IND', name: 'Indianapolis Intl', lat: 39.7173, lng: -86.2944 },
  { code: 'CLE', name: 'Cleveland Hopkins', lat: 41.4117, lng: -81.8498 },
  { code: 'PIT', name: 'Pittsburgh Intl', lat: 40.4957, lng: -80.2327 },
  { code: 'CMH', name: 'John Glenn Columbus', lat: 39.9981, lng: -82.8919 },
  { code: 'MCI', name: 'Kansas City Intl', lat: 39.2976, lng: -94.7139 },
  { code: 'RSW', name: 'Southwest Florida', lat: 26.5362, lng: -81.7552 },
  { code: 'SAT', name: 'San Antonio Intl', lat: 29.5337, lng: -98.4698 },
  { code: 'SNA', name: 'John Wayne', lat: 33.6762, lng: -117.8674 },
  { code: 'MKE', name: 'Milwaukee Mitchell', lat: 42.9472, lng: -87.8966 },
  { code: 'JAX', name: 'Jacksonville Intl', lat: 30.4941, lng: -81.6879 },
  { code: 'ABQ', name: 'Albuquerque Intl', lat: 35.0402, lng: -106.6090 },
];

export function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestAirport(lat: number, lng: number): { code: string; name: string; lat: number; lng: number; distance: number } {
  let nearest = { code: '', name: '', lat: 0, lng: 0, distance: Infinity };
  for (const airport of MAJOR_AIRPORTS) {
    const dist = haversineDistanceMiles(lat, lng, airport.lat, airport.lng);
    if (dist < nearest.distance) {
      nearest = { ...airport, distance: dist };
    }
  }
  return nearest;
}
