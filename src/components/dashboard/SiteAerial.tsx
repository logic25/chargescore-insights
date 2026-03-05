import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, CircleDot, X, Undo2, Trash2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteAerialProps {
  lat: number;
  lng: number;
  onSpotsCounted?: (count: number) => void;
}

const SiteAerial = ({ lat, lng, onSpotsCounted }: SiteAerialProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [countMode, setCountMode] = useState(false);
  const [spots, setSpots] = useState<L.LatLng[]>([]);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const labelsRef = useRef<L.Marker[]>([]);
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([lat, lng], 19);
    mapRef.current = map;

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 }
    ).addTo(map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.marker([lat, lng], { icon }).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  // Toggle count mode click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    if (countMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
      const handler = (e: L.LeafletMouseEvent) => {
        setSpots(prev => [...prev, e.latlng]);
      };
      clickHandlerRef.current = handler;
      map.on('click', handler);
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    }

    return () => {
      if (clickHandlerRef.current && map) {
        map.off('click', clickHandlerRef.current);
      }
    };
  }, [countMode]);

  // Draw spot markers when spots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers & labels
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    labelsRef.current.forEach(m => m.remove());
    labelsRef.current = [];

    spots.forEach((p, i) => {
      const marker = L.circleMarker(p, {
        radius: 7, color: '#fff', fillColor: '#00d4aa', fillOpacity: 0.9, weight: 2,
      }).addTo(map);
      markersRef.current.push(marker);

      const label = L.marker(p, {
        icon: L.divIcon({
          html: `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);">${i + 1}</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        }),
        interactive: false,
      }).addTo(map);
      labelsRef.current.push(label);
    });

    onSpotsCounted?.(spots.length);
  }, [spots, onSpotsCounted]);

  const handleClear = useCallback(() => { setSpots([]); }, []);
  const handleUndo = useCallback(() => setSpots(prev => prev.slice(0, -1)), []);

  const toggleCount = useCallback(() => {
    if (countMode) handleClear();
    setCountMode(prev => !prev);
  }, [countMode, handleClear]);

  return (
    <div className="overflow-hidden">
      <div className="relative h-[300px]">
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

        {/* Coordinate badge */}
        <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-white">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>

        {/* Count mode controls */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5">
          {countMode && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                disabled={spots.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors"
              >
                <Undo2 className="h-3 w-3" /> Undo
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={spots.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleCount}
            className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors ${
              countMode
                ? 'bg-primary text-primary-foreground'
                : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            {countMode ? <X className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
            {countMode ? 'Done Counting' : 'Count Spots'}
          </button>
        </div>

        {/* Count mode instructions */}
        {countMode && spots.length === 0 && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-white">
              Tap each parking spot to count
            </span>
          </div>
        )}

        {/* Spot count overlay */}
        {countMode && spots.length > 0 && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] text-white/70">Spots Counted</div>
            <div className="font-mono text-2xl font-bold text-primary">{spots.length}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAerial;
