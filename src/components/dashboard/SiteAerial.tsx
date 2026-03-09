import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, CircleDot, X, Undo2, Trash2, Check, Sparkles, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteAerialProps {
  lat: number;
  lng: number;
  lotSizeSqFt?: number | null;
  address?: string;
  onSpotsCounted?: (count: number) => void;
  onSpotsConfirmed?: (count: number) => void;
}

/**
 * Generate a grid of points within the visible map bounds, offset from center.
 * Used to visualize AI-counted spots on the map.
 */
function generateSpotGrid(center: L.LatLng, count: number, map: L.Map): L.LatLng[] {
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  // Use ~60% of the visible area, centered
  const latSpan = (ne.lat - sw.lat) * 0.6;
  const lngSpan = (ne.lng - sw.lng) * 0.6;
  const baseLat = center.lat - latSpan / 2;
  const baseLng = center.lng - lngSpan / 2;

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(count * 1.5));
  const rows = Math.ceil(count / cols);
  const latStep = latSpan / (rows + 1);
  const lngStep = lngSpan / (cols + 1);

  const points: L.LatLng[] = [];
  for (let r = 1; r <= rows && points.length < count; r++) {
    for (let c = 1; c <= cols && points.length < count; c++) {
      // Add slight jitter for natural look
      const jitterLat = (Math.random() - 0.5) * latStep * 0.3;
      const jitterLng = (Math.random() - 0.5) * lngStep * 0.3;
      points.push(L.latLng(
        baseLat + r * latStep + jitterLat,
        baseLng + c * lngStep + jitterLng
      ));
    }
  }
  return points;
}

const SiteAerial = ({ lat, lng, onSpotsCounted, onSpotsConfirmed }: SiteAerialProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [countMode, setCountMode] = useState(false);
  const [editMode, setEditMode] = useState(false); // edit AI spots
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
  const [aiEdited, setAiEdited] = useState(false); // tracks if user modified AI spots

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

    setAiResult(null);
    setAiEdited(false);
    setSpots([]);
    setConfirmed(false);
    setEditMode(false);

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  // Click handler for count mode OR edit mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    const isActive = countMode || editMode;

    if (isActive) {
      map.dragging.enable();
      const container = map.getContainer();

      const onMouseDown = (e: MouseEvent) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
      };
      const onMouseMove = () => {
        if (dragStartRef.current) isDraggingRef.current = true;
      };
      const onMouseUp = () => { dragStartRef.current = null; };

      container.addEventListener('mousedown', onMouseDown);
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseup', onMouseUp);

      const handler = (e: L.LeafletMouseEvent) => {
        if (!isDraggingRef.current) {
          setSpots(prev => [...prev, e.latlng]);
          setConfirmed(false);
          if (editMode) setAiEdited(true);
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
  }, [countMode, editMode]);

  // Draw spot markers — clickable to delete in edit/count mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    labelsRef.current.forEach(m => m.remove());
    labelsRef.current = [];

    const isActive = countMode || editMode;
    const isAiSpot = aiResult && !aiEdited && !countMode;

    spots.forEach((p, i) => {
      const marker = L.circleMarker(p, {
        radius: 8,
        color: '#fff',
        fillColor: confirmed ? '#22c55e' : isAiSpot ? '#8b5cf6' : '#00d4aa',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      // Allow clicking markers to delete them in edit/count mode
      if (isActive) {
        map.getContainer().style.cursor = 'crosshair';
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSpots(prev => prev.filter((_, idx) => idx !== i));
          setConfirmed(false);
          if (editMode) setAiEdited(true);
        });
        // Add a subtle pulse effect on hover
        marker.on('mouseover', () => {
          marker.setStyle({ fillColor: '#ef4444', fillOpacity: 1 });
        });
        marker.on('mouseout', () => {
          marker.setStyle({
            fillColor: confirmed ? '#22c55e' : isAiSpot ? '#8b5cf6' : '#00d4aa',
            fillOpacity: 0.9,
          });
        });
      }

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
  }, [spots, confirmed, countMode, editMode, aiResult, aiEdited, onSpotsCounted]);

  const handleClear = useCallback(() => { setSpots([]); setConfirmed(false); setAiEdited(true); }, []);
  const handleUndo = useCallback(() => { setSpots(prev => prev.slice(0, -1)); setConfirmed(false); if (editMode) setAiEdited(true); }, [editMode]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    onSpotsConfirmed?.(spots.length);
    setCountMode(false);
    setEditMode(false);
  }, [spots.length, onSpotsConfirmed]);

  const toggleCount = useCallback(() => {
    if (countMode && !confirmed) {
      handleClear();
    }
    setEditMode(false);
    setCountMode(prev => !prev);
  }, [countMode, confirmed, handleClear]);

  // Enter edit mode for AI spots
  const handleEditAiSpots = useCallback(() => {
    setEditMode(true);
    setConfirmed(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (editMode && !aiEdited && aiResult) {
      // Restore original AI grid
      const map = mapRef.current;
      if (map) {
        const grid = generateSpotGrid(L.latLng(lat, lng), aiResult.count, map);
        setSpots(grid);
      }
    }
    setEditMode(false);
    setCountMode(false);
  }, [editMode, aiEdited, aiResult, lat, lng]);

  // AI auto-count — now places visual markers
  const handleAiCount = useCallback(async () => {
    setAiCounting(true);
    setAiResult(null);
    setAiEdited(false);
    setSpots([]);
    try {
      const { data, error } = await supabase.functions.invoke('count-parking-spots', {
        body: { lat, lng },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data);
      if (data?.count > 0) {
        // Place markers on map
        const map = mapRef.current;
        if (map) {
          const grid = generateSpotGrid(L.latLng(lat, lng), data.count, map);
          setSpots(grid);
        }
        toast.success(`AI detected ${data.count} parking spots (${data.confidence} confidence). Tap "Edit" to adjust.`);
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
  }, [lat, lng]);

  const confidenceColor = aiResult?.confidence === 'high' ? 'bg-green-600/80' : aiResult?.confidence === 'medium' ? 'bg-amber-600/80' : 'bg-red-600/80';

  const isEditing = countMode || editMode;

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

        {/* Top-right controls */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5">
          {isEditing && (
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
          {!isEditing && (
            <>
              {/* AI Auto Count button */}
              <button type="button" onClick={handleAiCount} disabled={aiCounting}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary/90 text-white hover:bg-primary disabled:opacity-60">
                {aiCounting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiCounting ? 'Counting…' : 'AI Count'}
              </button>
              {/* Edit AI spots (only if AI result with spots visible) */}
              {aiResult && aiResult.count > 0 && spots.length > 0 && !confirmed && (
                <button type="button" onClick={handleEditAiSpots}
                  className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-violet-600/90 text-white hover:bg-violet-700">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {/* Manual Count button */}
              <button type="button" onClick={toggleCount}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-black/60 text-white hover:bg-black/80">
                <CircleDot className="h-3 w-3" />
                {confirmed ? `${spots.length} Spots ✓` : 'Manual Count'}
              </button>
            </>
          )}
          {isEditing && (
            <button type="button" onClick={handleCancelEdit}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary text-primary-foreground">
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>

        {/* Instructions */}
        {isEditing && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2.5 py-1.5 backdrop-blur-sm max-w-[220px]">
            <span className="text-[10px] font-medium text-white leading-tight block">
              {editMode
                ? spots.length === 0
                  ? 'Tap to add spots • Click existing to remove'
                  : `${spots.length} spot${spots.length !== 1 ? 's' : ''} • Tap to add, click marker to remove`
                : spots.length === 0
                  ? 'Tap each parking spot • Pan to move around'
                  : `${spots.length} spot${spots.length !== 1 ? 's' : ''} marked • Tap to add, click marker to remove`}
            </span>
          </div>
        )}

        {/* AI result badge — shown when AI spots are on map but not editing */}
        {!isEditing && aiResult && aiResult.count > 0 && spots.length > 0 && (
          <div className={`absolute bottom-2 right-2 z-[1000] rounded-lg ${confidenceColor} px-3 py-2 backdrop-blur-sm`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-white" />
              <span className="text-[10px] text-white/80">AI Count{aiEdited ? ' (edited)' : ''}</span>
            </div>
            <div className="font-mono text-xl font-bold text-white">{spots.length} spots</div>
            <div className="text-[10px] text-white/70">{aiResult.confidence} confidence</div>
            {aiResult.notes && <div className="text-[9px] text-white/50 max-w-[180px] truncate mt-0.5">{aiResult.notes}</div>}
            {!confirmed && (
              <button type="button" onClick={handleConfirm}
                className="mt-1.5 w-full rounded bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30 transition-colors">
                ✓ Use this count
              </button>
            )}
            {confirmed && (
              <div className="mt-1 text-[10px] text-white/90 font-semibold">✓ Confirmed</div>
            )}
          </div>
        )}

        {/* Confirmed count badge (manual count, no AI) */}
        {!isEditing && confirmed && spots.length > 0 && !aiResult && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-green-700/80 px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] text-white/80">Confirmed Count</div>
            <div className="font-mono text-xl font-bold text-white">{spots.length} spots</div>
          </div>
        )}

        {/* Live count while editing */}
        {isEditing && spots.length > 0 && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="font-mono text-2xl font-bold text-primary">{spots.length}</div>
            <div className="text-[10px] text-white/70">
              {editMode ? 'spots (editing)' : 'spots counted'}
            </div>
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
