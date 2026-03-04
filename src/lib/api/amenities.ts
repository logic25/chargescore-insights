// Fetch nearby amenities count using Google Places API
/* eslint-disable @typescript-eslint/no-explicit-any */

declare const google: any;

export function fetchNearbyAmenities(lat: number, lng: number): Promise<number> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined' || !google?.maps?.places) {
      resolve(5);
      return;
    }

    try {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.nearbySearch({
        location: { lat, lng },
        radius: 400,
        type: 'restaurant',
      }, (results: any) => {
        resolve(results?.length || 0);
      });
    } catch {
      resolve(5);
    }
  });
}
