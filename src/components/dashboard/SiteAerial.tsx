import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, CircleDot, X, Undo2, Trash2, Check, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

  // AI counter state
  const [aiCounting, setAiCounting] = useState(false);
  const [aiResult, setAiResult] = useState<{ count: number; confidence: string; notes: string } | null>(null);

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

    // Reset AI result on location change
    setAiResult(null);

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
      map.dragging.enable();

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
      handleClear();
    }
    setCountMode(prev => !prev);
  }, [countMode, confirmed, handleClear]);

  // AI auto-count
  const handleAiCount = useCallback(async () => {
    setAiCounting(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('count-parking-spots', {
        body: { lat, lng },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data);
      if (data?.count > 0) {
        onSpotsConfirmed?.(data.count);
        toast.success(`AI detected ${data.count} parking spots (${data.confidence} confidence)`);
      } else {
        toast.info('AI could not detect parking spots clearly. Try manual count.');
      }
    } catch (e: any) {
      console.error('AI count error:', e);
      if (e?.message?.includes('429') || e?.status === 429) {
        toast.error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (e?.message?.includes('402') || e?.status === 402) {
        toast.error('AI credits exhausted. Please add credits in workspace settings.');
      } else {
        toast.error('AI counting failed. Try manual count instead.');
      }
    } finally {
      setAiCounting(false);
    }
  }, [lat, lng, onSpotsConfirmed]);

  const confidenceColor = aiResult?.confidence === 'high' ? 'bg-green-600/80' : aiResult?.confidence === 'medium' ? 'bg-amber-600/80' : 'bg-red-600/80';

  return (
    <div className="overflow-hidden h-full">
      <div className="relative h-full min-h-[360px]">
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
            <>
              {/* AI Auto Count button */}
              <button type="button" onClick={handleAiCount} disabled={aiCounting}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary/90 text-white hover:bg-primary disabled:opacity-60">
                {aiCounting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiCounting ? 'Counting…' : 'AI Count'}
              </button>
              {/* Manual Count button */}
              <button type="button" onClick={toggleCount}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-black/60 text-white hover:bg-black/80">
                <CircleDot className="h-3 w-3" />
                {confirmed ? `${spots.length} Spots ✓` : 'Manual Count'}
              </button>
            </>
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

        {/* AI result badge */}
        {!countMode && aiResult && aiResult.count > 0 && (
          <div className={`absolute bottom-2 right-2 z-[1000] rounded-lg ${confidenceColor} px-3 py-2 backdrop-blur-sm`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-white" />
              <span className="text-[10px] text-white/80">AI Count</span>
            </div>
            <div className="font-mono text-xl font-bold text-white">{aiResult.count} spots</div>
            <div className="text-[10px] text-white/70">{aiResult.confidence} confidence</div>
            {aiResult.notes && <div className="text-[9px] text-white/50 max-w-[180px] truncate mt-0.5">{aiResult.notes}</div>}
          </div>
        )}

        {/* Confirmed count badge (shown when not in count mode, manual) */}
        {!countMode && confirmed && spots.length > 0 && !aiResult && (
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

        {/* AI counting spinner overlay */}
        {aiCounting && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="rounded-xl bg-black/80 px-6 py-4 text-center backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium text-white mt-2">AI analyzing satellite imagery…</p>
              <p className="text-[10px] text-white/60 mt-1">Counting parking spots</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAerial;
