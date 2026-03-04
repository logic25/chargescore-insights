import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';

interface ParkingMeasureProps {
  lat: number;
  lng: number;
  onMeasured: (data: { lotSqFt: number; totalSpots: number; availableForChargers: number }) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMapsDrawing(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.drawing) {
      resolve();
      return;
    }
    if (!apiKey) {
      reject(new Error('No API key'));
      return;
    }
    // Check if script already loading
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      // Wait for it to load
      const check = setInterval(() => {
        if (window.google?.maps?.drawing) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Timeout')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps?.drawing) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error('Timeout')); }, 5000);
    };
    script.onerror = () => reject(new Error('Failed to load'));
    document.head.appendChild(script);
  });
}

const ParkingLotMeasure = ({ lat, lng, onMeasured }: ParkingMeasureProps) => {
  const { key: googleMapsKey, loading: keyLoading } = useGoogleMapsKey();
  const mapRef = useRef<HTMLDivElement>(null);
  const [lotSqFt, setLotSqFt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (keyLoading) return;
    if (!googleMapsKey) {
      setError(true);
      return;
    }
    loadGoogleMapsDrawing(googleMapsKey)
      .then(() => setReady(true))
      .catch(() => setError(true));
  }, [keyLoading, googleMapsKey]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps?.drawing) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 19,
      mapTypeId: 'satellite',
      tilt: 0,
    });

    const drawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: '#00d4aa',
        fillOpacity: 0.3,
        strokeColor: '#00d4aa',
        strokeWeight: 2,
        editable: true,
        draggable: true,
      },
    });
    drawingManager.setMap(map);

    const handlePolygon = (polygon: any) => {
      const areaMeters = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
      const areaSqFt = Math.round(areaMeters * 10.764);
      const totalSpots = Math.floor(areaSqFt / 340);
      const availableForChargers = Math.floor(totalSpots * 0.33);
      setLotSqFt(areaSqFt);
      onMeasured({ lotSqFt: areaSqFt, totalSpots, availableForChargers });
      drawingManager.setDrawingMode(null);

      ['set_at', 'insert_at', 'remove_at'].forEach(event => {
        window.google.maps.event.addListener(polygon.getPath(), event, () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
          const newSqFt = Math.round(newArea * 10.764);
          const newSpots = Math.floor(newSqFt / 340);
          const newAvailable = Math.floor(newSpots * 0.33);
          setLotSqFt(newSqFt);
          onMeasured({ lotSqFt: newSqFt, totalSpots: newSpots, availableForChargers: newAvailable });
        });
      });
    };

    window.google.maps.event.addListener(drawingManager, 'polygoncomplete', handlePolygon);

    return () => {
      drawingManager.setMap(null);
    };
  }, [ready, lat, lng, onMeasured]);

  if (error && !keyLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {!googleMapsKey
            ? 'Google Maps API key not configured'
            : 'Drawing tool failed to load'}
        </p>
        <p className="text-xs text-muted-foreground/60">
          {!googleMapsKey
            ? 'Configure GOOGLE_MAPS_KEY in backend secrets. Required APIs: Maps JavaScript, Static Maps, Places.'
            : 'Check browser console for errors. Ensure Maps JavaScript API with Drawing and Geometry libraries is enabled.'}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-border bg-muted/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading map…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">
        Draw around your parking lot to measure it
        <span className="ml-2 text-xs text-muted-foreground">(click corners, then close the shape)</span>
      </div>
      <div ref={mapRef} className="h-[400px] w-full rounded-lg border border-border" />
      {lotSqFt && (
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
