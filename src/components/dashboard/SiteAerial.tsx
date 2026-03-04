import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface SiteAerialProps {
  lat: number;
  lng: number;
}

const SiteAerial = ({ lat, lng }: SiteAerialProps) => {
  const position = useMemo(() => [lat, lng] as [number, number], [lat, lng]);
  const key = useMemo(() => `${lat}-${lng}`, [lat, lng]);

  return (
    <div className="overflow-hidden">
      <div className="relative h-[300px]">
        <MapContainer
          key={key}
          center={position}
          zoom={18}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <Marker position={position} icon={defaultIcon} />
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
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
