import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { getSatelliteImageUrl } from '@/lib/api/googleMaps';

interface SiteAerialProps {
  lat: number;
  lng: number;
}

const SiteAerial = ({ lat, lng }: SiteAerialProps) => {
  const satelliteUrl = useMemo(() => getSatelliteImageUrl(lat, lng), [lat, lng]);

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
            <p className="text-sm text-muted-foreground">Set VITE_GOOGLE_MAPS_KEY to see satellite view</p>
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
