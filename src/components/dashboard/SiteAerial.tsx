import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { getSatelliteImageUrl } from '@/lib/api/googleMaps';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';

interface SiteAerialProps {
  lat: number;
  lng: number;
}

const SiteAerial = ({ lat, lng }: SiteAerialProps) => {
  const { key, loading } = useGoogleMapsKey();
  const satelliteUrl = useMemo(() => getSatelliteImageUrl(lat, lng, 19, key), [lat, lng, key]);

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center bg-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="relative">
        {satelliteUrl ? (
          <img
            src={satelliteUrl}
            alt={`Satellite view at ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
            className="h-[300px] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[300px] w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Satellite view unavailable</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-white">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SiteAerial;
