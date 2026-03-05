import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Pencil, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteAerialProps {
  lat: number;
  lng: number;
  onMeasured?: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

function calculateArea(latlngs: L.LatLng[], map: L.Map): number {
  if (latlngs.length < 3) return 0;
  const projected = latlngs.map(ll => map.latLngToLayerPoint(ll));
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }
  area = Math.abs(area) / 2;
  const center = latlngs[0];
  const metersPerPixel = 40075016.686 * Math.abs(Math.cos(center.lat * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
  const areaMeters = area * metersPerPixel * metersPerPixel;
  return Math.round(areaMeters * 10.764);
}

const SiteAerial = ({ lat, lng, onMeasured }: SiteAerialProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [lotSqFt, setLotSqFt] = useState<number | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
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

  // Toggle draw mode click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous handler
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    if (drawMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
      const handler = (e: L.LeafletMouseEvent) => {
        setPoints(prev => [...prev, e.latlng]);
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
  }, [drawMode]);

  // Draw polygon/polyline when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }

    if (points.length === 0) { setLotSqFt(null); return; }

    points.forEach((p) => {
      const marker = L.circleMarker(p, {
        radius: 5, color: '#00d4aa', fillColor: '#00d4aa', fillOpacity: 1, weight: 2,
      }).addTo(map);
      markersRef.current.push(marker);
    });

    if (points.length < 3) {
      polylineRef.current = L.polyline(points, {
        color: '#00d4aa', weight: 2, dashArray: '6 4',
      }).addTo(map);
    } else {
      polygonRef.current = L.polygon(points, {
        color: '#00d4aa', fillColor: '#00d4aa', fillOpacity: 0.25, weight: 2,
      }).addTo(map);

      const areaSqFt = calculateArea(points, map);
      setLotSqFt(areaSqFt);
      const totalSpots = Math.floor(areaSqFt / 340);
      const availableForChargers = Math.floor(totalSpots * 0.33);
      onMeasured?.({ lotSqFt: areaSqFt, totalSpots, availableForChargers });
    }
  }, [points, onMeasured]);

  const handleClear = useCallback(() => { setPoints([]); setLotSqFt(null); }, []);
  const handleUndo = useCallback(() => setPoints(prev => prev.slice(0, -1)), []);

  const toggleDraw = useCallback(() => {
    if (drawMode) {
      // Exiting draw mode — clear drawings
      handleClear();
    }
    setDrawMode(prev => !prev);
  }, [drawMode, handleClear]);

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

        {/* Draw mode toggle */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5">
          {drawMode && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                disabled={points.length === 0}
                className="rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={points.length === 0}
                className="rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors"
              >
                Clear
              </button>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDraw}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors ${
                  drawMode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-black/60 text-white hover:bg-black/80'
                }`}
              >
                {drawMode ? <X className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                {drawMode ? 'Exit Draw' : 'Measure Lot'}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              {drawMode ? 'Click map corners to draw your parking lot outline (min 3 points)' : 'Draw on the map to measure your parking lot area'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Draw mode instructions */}
        {drawMode && points.length < 3 && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-white">
              Click {3 - points.length} more corner{3 - points.length !== 1 ? 's' : ''} to measure
            </span>
          </div>
        )}

        {/* Measurement result overlay */}
        {lotSqFt !== null && lotSqFt > 0 && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] text-white/70">Measured Area</div>
            <div className="font-mono text-sm font-bold text-primary">{lotSqFt.toLocaleString()} sq ft</div>
            <div className="text-[10px] text-white/70">~{Math.floor(lotSqFt / 340)} spots</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAerial;
