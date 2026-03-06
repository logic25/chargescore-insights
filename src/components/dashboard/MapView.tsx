import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { NearbyStation } from '@/types/chargeScore';

interface MapViewProps {
  lat: number;
  lng: number;
  stations: NearbyStation[];
  loading?: boolean;
  radius: number;
  onRadiusChange: (r: number) => void;
}

const NETWORK_PATTERNS: { pattern: RegExp; color: string }[] = [
  { pattern: /tesla/i, color: '#ef4444' },
  { pattern: /chargepoint/i, color: '#3b82f6' },
  { pattern: /blink/i, color: '#3b82f6' },
  { pattern: /evgo/i, color: '#22c55e' },
  { pattern: /electrify\s*america/i, color: '#22c55e' },
];

function getStationColor(station: NearbyStation): string {
  for (const { pattern, color } of NETWORK_PATTERNS) {
    if (pattern.test(station.network)) return color;
  }
  return '#888888';
}

const RADIUS_OPTIONS = [5, 10, 15];

const MapView = ({ lat, lng, stations, loading, radius, onRadiusChange }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current).setView([lat, lng], radius <= 5 ? 13 : radius <= 10 ? 11 : 10);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Property marker
    const propertyIcon = L.divIcon({
      html: `<div style="width:20px;height:20px;background:#00d4aa;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: '',
    });
    L.marker([lat, lng], { icon: propertyIcon })
      .addTo(map)
      .bindPopup('<strong>Your Property</strong>');

    // Station markers
    stations.forEach((station) => {
      const color = getStationColor(station);
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });
      L.marker([station.lat, station.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:DM Sans,sans-serif;font-size:13px;">
            <strong>${station.name}</strong><br/>
            Network: ${station.network}<br/>
            Type: ${station.chargerType}<br/>
            Ports: ${station.numPorts}<br/>
            Distance: ${station.distanceMiles.toFixed(1)} mi
          </div>`
        );
    });

    // Fix tiles when tab becomes visible
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, stations, radius]);

  return (
    <div className="overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Competition Map
          <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
            ({stations.length} stations)
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {/* Radius selector */}
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onRadiusChange(r)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  radius === r
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} /> Tesla</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#3b82f6' }} /> ChargePoint/Blink</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} /> EVgo/EA</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#888' }} /> Other</span>
          </div>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="h-full min-h-[360px] w-full" />
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading stations…
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
