const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export function getSatelliteImageUrl(lat: number, lng: number, zoom: number = 19): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x480&maptype=satellite&key=${GOOGLE_MAPS_KEY}&markers=color:red|${lat},${lng}`;
}

export function estimateParkingSpots(lotSqFt: number): { total: number; availableForChargers: number } {
  const totalSpots = Math.floor(lotSqFt / 340);
  const availableForChargers = Math.floor(totalSpots * 0.33);
  return { total: totalSpots, availableForChargers };
}
