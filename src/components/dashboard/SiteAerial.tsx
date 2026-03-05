import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, CircleDot, X, Undo2, Trash2, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteAerialProps {
  lat: number;
  lng: number;
  onSpotsCounted?: (count: number) => void;
  onSpotsConfirmed?: (count: number) => void;
}

const SiteAerial = ({ lat, lng, onSpotsCounted, onSpotsConfirmed }: SiteAerialProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [countMode, setCountMode] = useState(false);
  const [spots, setSpots] = useState<L.LatLng[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const labelsRef = useRef<L.Marker[]>([]);
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

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

  // Toggle count mode — keep dragging enabled, distinguish click vs drag
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    if (countMode) {
      // Keep dragging enabled for panning
      map.dragging.enable();

      // Track drag vs click via mousedown/mouseup distance
      const container = map.getContainer();

      const onMouseDown = (e: MouseEvent) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
      };
      const onMouseMove = () => {
        if (dragStartRef.current) isDraggingRef.current = true;
      };
      const onMouseUp = () => {
        dragStartRef.current = null;
      };

      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseup', onMouseUp);

      const handler = (e: L.LeafletMouseEvent) => {
        // Only place a spot if this was a click, not a drag
        if (!isDraggingRef.current) {
          setSpots(prev => [...prev, e.latlng]);
          setConfirmed(false);
        }
        isDraggingRef.current = false;
      };
      clickHandlerRef.current = handler;
      map.on('click', handler);

      return () => {
        container.removeEventListener('mousedown', onMouseDown);
        container.removeEventListener('mousemove', onMouseMove);
        container.removeEventListener('mouseup', onMouseUp);
        if (clickHandlerRef.current) map.off('click', clickHandlerRef.current);
      };
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    }
  }, [countMode]);

  // Draw spot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    labelsRef.current.forEach(m => m.remove());
    labelsRef.current = [];

    spots.forEach((p, i) => {
      const marker = L.circleMarker(p, {
        radius: 8, color: '#fff', fillColor: confirmed ? '#22c55e' : '#00d4aa', fillOpacity: 0.9, weight: 2,
      }).addTo(map);
      markersRef.current.push(marker);

      const label = L.marker(p, {
        icon: L.divIcon({
          html: `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.9);">${i + 1}</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          className: '',
        }),
        interactive: false,
      }).addTo(map);
      labelsRef.current.push(label);
    });

    onSpotsCounted?.(spots.length);
  }, [spots, confirmed, onSpotsCounted]);

  const handleClear = useCallback(() => { setSpots([]); setConfirmed(false); }, []);
  const handleUndo = useCallback(() => { setSpots(prev => prev.slice(0, -1)); setConfirmed(false); }, []);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    onSpotsConfirmed?.(spots.length);
    setCountMode(false);
  }, [spots.length, onSpotsConfirmed]);

  const toggleCount = useCallback(() => {
    if (countMode && !confirmed) {
      // Exiting without confirming — clear
      handleClear();
    }
    setCountMode(prev => !prev);
  }, [countMode, confirmed, handleClear]);

  return (
    <div className="overflow-hidden">
      <div className="relative h-[360px] lg:h-[560px]">
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
              <button type="button" onClick={handleUndo} disabled={spots.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors">
                <Undo2 className="h-3 w-3" /> Undo
              </button>
              <button type="button" onClick={handleClear} disabled={spots.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
              {spots.length > 0 && (
                <button type="button" onClick={handleConfirm}
                  className="flex items-center gap-1 rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm hover:bg-green-700 transition-colors">
                  <Check className="h-3 w-3" /> Confirm {spots.length}
                </button>
              )}
            </>
          )}
          {!countMode && (
            <button type="button" onClick={toggleCount}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-black/60 text-white hover:bg-black/80">
              <CircleDot className="h-3 w-3" />
              {confirmed ? `${spots.length} Spots ✓` : 'Count Spots'}
            </button>
          )}
          {countMode && (
            <button type="button" onClick={toggleCount}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary text-primary-foreground">
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>

        {/* Instructions */}
        {countMode && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-white">
              {spots.length === 0
                ? 'Tap each parking spot • Pan to move around'
                : `${spots.length} spot${spots.length !== 1 ? 's' : ''} marked • Pan to see more`}
            </span>
          </div>
        )}

        {/* Confirmed count badge (shown when not in count mode) */}
        {!countMode && confirmed && spots.length > 0 && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-green-700/80 px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] text-white/80">Confirmed Count</div>
            <div className="font-mono text-xl font-bold text-white">{spots.length} spots</div>
          </div>
        )}

        {/* Live count while counting */}
        {countMode && spots.length > 0 && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="font-mono text-2xl font-bold text-primary">{spots.length}</div>
            <div className="text-[10px] text-white/70">spots counted</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAerial;
