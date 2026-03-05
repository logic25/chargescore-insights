import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ParkingMeasureProps {
  lat: number;
  lng: number;
  onMeasured: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

const ParkingLotMeasure = ({ lat, lng, onMeasured }: ParkingMeasureProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [lotSqFt, setLotSqFt] = useState<number | null>(null);
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Calculate area of polygon using Shoelace formula on projected coordinates
  function calculateArea(latlngs: L.LatLng[]): number {
    if (latlngs.length < 3) return 0;
    const map = mapRef.current;
    if (!map) return 0;

    // Project to pixel coordinates for area calculation
    const projected = latlngs.map(ll => map.latLngToLayerPoint(ll));
    let area = 0;
    for (let i = 0; i < projected.length; i++) {
      const j = (i + 1) % projected.length;
      area += projected[i].x * projected[j].y;
      area -= projected[j].x * projected[i].y;
    }
    area = Math.abs(area) / 2;

    // Convert pixel area to real-world area using scale
    // At the current zoom level, get meters per pixel
    const center = latlngs[0];
    const metersPerPixel = 40075016.686 * Math.abs(Math.cos(center.lat * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
    const areaMeters = area * metersPerPixel * metersPerPixel;
    return Math.round(areaMeters * 10.764); // sq meters to sq feet
  }

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      attributionControl: false,
    }).setView([lat, lng], 19);
    mapRef.current = map;

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 }
    ).addTo(map);

    // Click handler to add points
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPoints(prev => {
        const newPoints = [...prev, e.latlng];
        return newPoints;
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  // Update polygon & markers when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }

    if (points.length === 0) return;

    // Draw vertex markers
    points.forEach((p) => {
      const marker = L.circleMarker(p, {
        radius: 5,
        color: '#00d4aa',
        fillColor: '#00d4aa',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      markersRef.current.push(marker);
    });

    if (points.length < 3) {
      // Draw polyline
      polylineRef.current = L.polyline(points, {
        color: '#00d4aa',
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);
    } else {
      // Draw polygon
      polygonRef.current = L.polygon(points, {
        color: '#00d4aa',
        fillColor: '#00d4aa',
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map);

      const areaSqFt = calculateArea(points);
      setLotSqFt(areaSqFt);
      const totalSpots = Math.floor(areaSqFt / 340);
      const availableForChargers = Math.floor(totalSpots * 0.33);
      onMeasured({ lotSqFt: areaSqFt, totalSpots, availableForChargers });
    }
  }, [points]);

  const handleClear = () => {
    setPoints([]);
    setLotSqFt(null);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">
          Click corners of your parking lot
          <span className="ml-2 text-xs text-muted-foreground">(min 3 points)</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={points.length === 0}
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={points.length === 0}
            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={containerRef} className="h-[400px] w-full rounded-lg border border-border" />
      {lotSqFt !== null && lotSqFt > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <div className="font-mono text-xl font-bold text-foreground">{lotSqFt.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Lot Area (sq ft)</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <div className="font-mono text-xl font-bold text-foreground">{Math.floor(lotSqFt / 340)}</div>
            <div className="text-[10px] text-muted-foreground">Est. Total Spots</div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <div className="font-mono text-xl font-bold text-primary">{Math.floor(lotSqFt / 340 * 0.33)}</div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              Available for Chargers
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">
                  Industry standard: 1 parking spot per 340 sq ft (including drive lanes). We recommend no more than 33% of spots for EV chargers to avoid impacting regular parking. Tesla requires minimum 8 dedicated spaces.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingLotMeasure;
