import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, CircleDot, X, Undo2, Trash2, Check, Sparkles, Loader2, Pencil, PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ParcelGeometry } from '@/lib/api/parcel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteAerialProps {
  lat: number;
  lng: number;
  lotSizeSqFt?: number | null;
  address?: string;
  parcelGeometry?: ParcelGeometry | null;
  onSpotsCounted?: (count: number) => void;
  onSpotsConfirmed?: (count: number) => void;
}

/** Ray-casting point-in-polygon test */
function pointInPolygon(point: number[], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Calculate bounding box from ArcGIS rings */
function getBoundsFromRings(rings: number[][][]) {
  const ring = rings[0];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** Generate spots constrained to a parcel polygon */
function generateSpotsInParcel(rings: number[][][], count: number): L.LatLng[] {
  // Convert ArcGIS [lng, lat] to [lat, lng]
  const polygon = rings[0].map(([lng, lat]) => [lat, lng]);
  const bounds = getBoundsFromRings(rings);
  
  const spots: L.LatLng[] = [];
  const gridSize = Math.ceil(Math.sqrt(count * 4)); // Oversample
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
  const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;

  for (let r = 0; r < gridSize && spots.length < count; r++) {
    for (let c = 0; c < gridSize && spots.length < count; c++) {
      const lat = bounds.minLat + latStep * (r + 0.5) + (Math.random() - 0.5) * latStep * 0.3;
      const lng = bounds.minLng + lngStep * (c + 0.5) + (Math.random() - 0.5) * lngStep * 0.3;
      if (pointInPolygon([lat, lng], polygon)) {
        spots.push(L.latLng(lat, lng));
      }
    }
  }
  return spots.slice(0, count);
}

/** Fallback: generate spots in a grid around center */
function generateSpotGrid(center: L.LatLng, count: number, map: L.Map): L.LatLng[] {
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latSpan = (ne.lat - sw.lat) * 0.6;
  const lngSpan = (ne.lng - sw.lng) * 0.6;
  const baseLat = center.lat - latSpan / 2;
  const baseLng = center.lng - lngSpan / 2;
  const cols = Math.ceil(Math.sqrt(count * 1.5));
  const rows = Math.ceil(count / cols);
  const latStep = latSpan / (rows + 1);
  const lngStep = lngSpan / (cols + 1);
  const points: L.LatLng[] = [];
  for (let r = 1; r <= rows && points.length < count; r++) {
    for (let c = 1; c <= cols && points.length < count; c++) {
      const jLat = (Math.random() - 0.5) * latStep * 0.3;
      const jLng = (Math.random() - 0.5) * lngStep * 0.3;
      points.push(L.latLng(baseLat + r * latStep + jLat, baseLng + c * lngStep + jLng));
    }
  }
  return points;
}

const SiteAerial = ({ lat, lng, lotSizeSqFt, address, parcelGeometry, onSpotsCounted, onSpotsConfirmed }: SiteAerialProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [countMode, setCountMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [drawingBoundary, setDrawingBoundary] = useState(false);
  const [drawnBoundary, setDrawnBoundary] = useState<number[][][] | null>(null); // ArcGIS-like rings
  const [boundaryPoints, setBoundaryPoints] = useState<L.LatLng[]>([]);
  const [spots, setSpots] = useState<L.LatLng[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const labelsRef = useRef<L.Marker[]>([]);
  const parcelPolyRef = useRef<L.Polygon | null>(null);
  const boundaryMarkersRef = useRef<L.CircleMarker[]>([]);
  const boundaryPolyRef = useRef<L.Polygon | null>(null);
  const boundaryLineRef = useRef<L.Polyline | null>(null);
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [aiCounting, setAiCounting] = useState(false);
  const [aiResult, setAiResult] = useState<{ count: number; confidence: string; notes: string } | null>(null);
  const [aiEdited, setAiEdited] = useState(false);

  // The effective geometry for AI counting: user-drawn boundary takes priority (parking lot only)
  // Parcel geometry is just a reference — it covers the whole property including buildings
  const effectiveGeometry = drawnBoundary ? { rings: drawnBoundary } : null;

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
    setDrawingBoundary(false);
    setDrawnBoundary(null);
    setBoundaryPoints([]);

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  // Draw parcel boundary polygon when geometry is available
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (parcelPolyRef.current) {
      parcelPolyRef.current.remove();
      parcelPolyRef.current = null;
    }

    if (parcelGeometry?.rings) {
      const latlngs = parcelGeometry.rings[0].map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
      const poly = L.polygon(latlngs, {
        color: '#ffffff',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 1.5,
        dashArray: '4 4',
        opacity: 0.4,
      }).addTo(map);
      parcelPolyRef.current = poly;
    }
  }, [parcelGeometry]);

  // Draw user-drawn boundary
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    boundaryMarkersRef.current.forEach(m => m.remove());
    boundaryMarkersRef.current = [];
    if (boundaryPolyRef.current) { boundaryPolyRef.current.remove(); boundaryPolyRef.current = null; }
    if (boundaryLineRef.current) { boundaryLineRef.current.remove(); boundaryLineRef.current = null; }

    if (boundaryPoints.length === 0) return;

    boundaryPoints.forEach(p => {
      const m = L.circleMarker(p, {
        radius: 5, color: '#00d4aa', fillColor: '#00d4aa', fillOpacity: 1, weight: 2,
      }).addTo(map);
      boundaryMarkersRef.current.push(m);
    });

    if (boundaryPoints.length < 3) {
      boundaryLineRef.current = L.polyline(boundaryPoints, {
        color: '#00d4aa', weight: 2, dashArray: '6 4',
      }).addTo(map);
    } else {
      boundaryPolyRef.current = L.polygon(boundaryPoints, {
        color: '#00d4aa', fillColor: '#00d4aa', fillOpacity: 0.12, weight: 2, dashArray: '6 4',
      }).addTo(map);
    }
  }, [boundaryPoints]);

  // Click handler for count/edit/boundary modes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    const isActive = countMode || editMode || drawingBoundary;

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
        if (isDraggingRef.current) { isDraggingRef.current = false; return; }

        if (drawingBoundary) {
          setBoundaryPoints(prev => [...prev, e.latlng]);
        } else {
          setSpots(prev => [...prev, e.latlng]);
          setConfirmed(false);
          if (editMode) setAiEdited(true);
        }
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
  }, [countMode, editMode, drawingBoundary]);

  // Draw spot markers
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

      if (isActive) {
        map.getContainer().style.cursor = 'crosshair';
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSpots(prev => prev.filter((_, idx) => idx !== i));
          setConfirmed(false);
          if (editMode) setAiEdited(true);
        });
        marker.on('mouseover', () => { marker.setStyle({ fillColor: '#ef4444', fillOpacity: 1 }); });
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
    if (countMode && !confirmed) handleClear();
    setEditMode(false);
    setCountMode(prev => !prev);
  }, [countMode, confirmed, handleClear]);

  const handleEditAiSpots = useCallback(() => {
    setEditMode(true);
    setConfirmed(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (editMode && !aiEdited && aiResult) {
      const map = mapRef.current;
      if (map) {
        const grid = effectiveGeometry?.rings
          ? generateSpotsInParcel(effectiveGeometry.rings, aiResult.count)
          : generateSpotGrid(L.latLng(lat, lng), aiResult.count, map);
        setSpots(grid);
      }
    }
    setEditMode(false);
    setCountMode(false);
  }, [editMode, aiEdited, aiResult, lat, lng, effectiveGeometry]);

  // Boundary drawing controls
  const handleFinishBoundary = useCallback(() => {
    if (boundaryPoints.length >= 3) {
      // Convert to ArcGIS-style rings [lng, lat]
      const ring = boundaryPoints.map(p => [p.lng, p.lat]);
      ring.push(ring[0]); // Close the ring
      setDrawnBoundary([ring]);
      toast.success('Boundary set! Now run AI Count.');
    }
    setDrawingBoundary(false);
  }, [boundaryPoints]);

  const handleClearBoundary = useCallback(() => {
    setBoundaryPoints([]);
    setDrawnBoundary(null);
    // Clear visual
    boundaryMarkersRef.current.forEach(m => m.remove());
    boundaryMarkersRef.current = [];
    if (boundaryPolyRef.current) { boundaryPolyRef.current.remove(); boundaryPolyRef.current = null; }
    if (boundaryLineRef.current) { boundaryLineRef.current.remove(); boundaryLineRef.current = null; }
  }, []);

  const handleUndoBoundary = useCallback(() => {
    setBoundaryPoints(prev => prev.slice(0, -1));
  }, []);

  // AI auto-count — uses parcel bounds when available
  const handleAiCount = useCallback(async () => {
    setAiCounting(true);
    setAiResult(null);
    setAiEdited(false);
    setSpots([]);
    try {
      // Calculate parcel bounds if geometry available
      let parcelBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | undefined;
      if (effectiveGeometry?.rings) {
        parcelBounds = getBoundsFromRings(effectiveGeometry.rings);
      }

      const { data, error } = await supabase.functions.invoke('count-parking-spots', {
        body: {
          lat, lng,
          lotSizeSqFt: lotSizeSqFt ?? undefined,
          address: address ?? undefined,
          parcelBounds,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data);
      if (data?.count > 0) {
        // Place markers constrained to parcel if geometry available
        if (effectiveGeometry?.rings) {
          const grid = generateSpotsInParcel(effectiveGeometry.rings, data.count);
          setSpots(grid);
        } else {
          const map = mapRef.current;
          if (map) {
            const grid = generateSpotGrid(L.latLng(lat, lng), data.count, map);
            setSpots(grid);
          }
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
  }, [lat, lng, lotSizeSqFt, address, effectiveGeometry]);

  const confidenceColor = aiResult?.confidence === 'high' ? 'bg-green-600/80' : aiResult?.confidence === 'medium' ? 'bg-amber-600/80' : 'bg-red-600/80';

  const isEditing = countMode || editMode;
  const showDrawBoundaryButton = !drawnBoundary && !isEditing && !drawingBoundary;

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

        {/* Parcel boundary badge */}
        {effectiveGeometry && !isEditing && !drawingBoundary && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-[9px] font-medium text-primary">
              ✓ Parcel boundary {drawnBoundary ? '(manual)' : '(auto)'}
            </span>
          </div>
        )}

        {/* Boundary drawing instructions */}
        {drawingBoundary && (
          <div className="absolute top-2 left-2 z-[1000] rounded bg-black/60 px-2.5 py-1.5 backdrop-blur-sm max-w-[220px]">
            <span className="text-[10px] font-medium text-white leading-tight block">
              {boundaryPoints.length < 3
                ? `Click corners of your parking lot (${boundaryPoints.length}/3+ points)`
                : `${boundaryPoints.length} points • Click "Done" to finish`}
            </span>
          </div>
        )}

        {/* Top-right controls */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5 flex-wrap justify-end">
          {/* Boundary drawing mode controls */}
          {drawingBoundary && (
            <>
              <button type="button" onClick={handleUndoBoundary} disabled={boundaryPoints.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors">
                <Undo2 className="h-3 w-3" /> Undo
              </button>
              <button type="button" onClick={handleClearBoundary} disabled={boundaryPoints.length === 0}
                className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm hover:bg-black/80 disabled:opacity-40 transition-colors">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
              {boundaryPoints.length >= 3 && (
                <button type="button" onClick={handleFinishBoundary}
                  className="flex items-center gap-1 rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm hover:bg-green-700 transition-colors">
                  <Check className="h-3 w-3" /> Done
                </button>
              )}
              <button type="button" onClick={() => { setDrawingBoundary(false); handleClearBoundary(); }}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary text-primary-foreground">
                <X className="h-3 w-3" /> Cancel
              </button>
            </>
          )}

          {/* Spot editing controls */}
          {isEditing && !drawingBoundary && (
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

          {!isEditing && !drawingBoundary && (
            <>
              {/* Draw Boundary button — only when no auto parcel geometry */}
              {showDrawBoundaryButton && (
                <button type="button" onClick={() => setDrawingBoundary(true)}
                  className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-amber-600/90 text-white hover:bg-amber-700">
                  <PenTool className="h-3 w-3" /> Draw Boundary
                </button>
              )}
              {/* Clear drawn boundary */}
              {drawnBoundary && !parcelGeometry && (
                <button type="button" onClick={handleClearBoundary}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-colors bg-black/60 text-white hover:bg-black/80">
                  <X className="h-3 w-3" /> Clear Boundary
                </button>
              )}
              {/* AI Auto Count button */}
              <button type="button" onClick={handleAiCount} disabled={aiCounting}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary/90 text-white hover:bg-primary disabled:opacity-60">
                {aiCounting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiCounting ? 'Counting…' : 'AI Count'}
              </button>
              {/* Edit AI spots */}
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
          {isEditing && !drawingBoundary && (
            <button type="button" onClick={handleCancelEdit}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur-sm transition-colors bg-primary text-primary-foreground">
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>

        {/* Instructions */}
        {isEditing && !drawingBoundary && (
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

        {/* AI result badge */}
        {!isEditing && !drawingBoundary && aiResult && aiResult.count > 0 && spots.length > 0 && (
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
        {!isEditing && !drawingBoundary && confirmed && spots.length > 0 && !aiResult && (
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
              <p className="text-[10px] text-white/60 mt-1">Counting parking spots within property boundary</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAerial;
