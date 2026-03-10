import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng, imageUrl, lotSizeSqFt, address, parcelBounds, polygonCoords } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Calculate bounding box: use parcel bounds if available, else fixed span
    let bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    if (parcelBounds) {
      const latPad = (parcelBounds.maxLat - parcelBounds.minLat) * 0.15;
      const lngPad = (parcelBounds.maxLng - parcelBounds.minLng) * 0.15;
      bbox = {
        minLng: parcelBounds.minLng - lngPad,
        minLat: parcelBounds.minLat - latPad,
        maxLng: parcelBounds.maxLng + lngPad,
        maxLat: parcelBounds.maxLat + latPad,
      };
    } else {
      const span = 0.0007;
      bbox = { minLng: lng - span, minLat: lat - span, maxLng: lng + span, maxLat: lat + span };
    }

    // Enforce minimum bbox span so ArcGIS export doesn't fail
    const MIN_SPAN = 0.0012; // ~130m minimum
    const latSpan = bbox.maxLat - bbox.minLat;
    const lngSpan = bbox.maxLng - bbox.minLng;
    if (latSpan < MIN_SPAN) {
      const center = (bbox.maxLat + bbox.minLat) / 2;
      bbox.minLat = center - MIN_SPAN / 2;
      bbox.maxLat = center + MIN_SPAN / 2;
    }
    if (lngSpan < MIN_SPAN) {
      const center = (bbox.maxLng + bbox.minLng) / 2;
      bbox.minLng = center - MIN_SPAN / 2;
      bbox.maxLng = center + MIN_SPAN / 2;
    }

    // Prefer Google Static Maps (sharper imagery, better stall visibility) over ArcGIS
    const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_KEY");
    
    // Calculate zoom level from bbox span — tighter bbox = higher zoom
    const maxSpan = Math.max(bbox.maxLat - bbox.minLat, bbox.maxLng - bbox.minLng);
    const googleZoom = maxSpan < 0.001 ? 20 : maxSpan < 0.002 ? 19 : maxSpan < 0.004 ? 18 : 17;
    
    const googleUrl = GOOGLE_MAPS_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${(bbox.minLat + bbox.maxLat) / 2},${(bbox.minLng + bbox.maxLng) / 2}&zoom=${googleZoom}&size=640x640&scale=2&maptype=satellite&key=${GOOGLE_MAPS_KEY}`
      : null;
    
    const arcGisUrl = imageUrl ||
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&bboxSR=4326&size=1280,1280&imageSR=4326&format=png&f=image`;

    // Helper to fetch image and convert to base64
    async function fetchImageAsBase64(url: string): Promise<string | null> {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error("Image fetch failed:", resp.status, url.substring(0, 80));
          return null;
        }
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const contentType = resp.headers.get("content-type") || "image/png";
        return `data:${contentType};base64,${btoa(binary)}`;
      } catch (err) {
        console.error("Image fetch error:", err);
        return null;
      }
    }

    // Try Google first (sharper, higher res with scale=2), then ArcGIS fallback
    let dataUri: string | null = null;
    if (googleUrl) {
      console.log("Trying Google Static Maps (1280x1280 @scale=2, zoom=" + googleZoom + ")");
      dataUri = await fetchImageAsBase64(googleUrl);
    }
    if (!dataUri) {
      console.log("Google unavailable, trying ArcGIS fallback (1280x1280)");
      dataUri = await fetchImageAsBase64(arcGisUrl);
    }

    if (!dataUri) {
      throw new Error("Could not fetch satellite imagery from any source");
    }

    const imageContent = { type: "image_url", image_url: { url: dataUri } };

    const propertyContext = [
      address ? `Property address: ${address}` : '',
      lotSizeSqFt ? `Known lot size: ~${Math.round(lotSizeSqFt).toLocaleString()} sq ft` : '',
    ].filter(Boolean).join('. ');

    // Build a precise boundary description using polygon coordinates if available
    let boundaryDescription: string;
    if (polygonCoords && polygonCoords.length >= 3) {
      // polygonCoords are [lng, lat][] — describe the polygon vertices for the AI
      const vertexDescriptions = polygonCoords.slice(0, -1).map((coord: number[], i: number) =>
        `Point ${i + 1}: (${coord[1].toFixed(6)}, ${coord[0].toFixed(6)})`
      ).join(', ');
      boundaryDescription = `The user has drawn a precise parking lot boundary polygon with ${polygonCoords.length - 1} vertices: ${vertexDescriptions}. The satellite image is cropped to this area. Count ONLY the parking spots that fall INSIDE this drawn polygon. The polygon outlines JUST the parking lot — do NOT count spots outside it, and do NOT count the building, driveways, grass, or landscaped areas even if they appear inside the bounding box.`;
    } else if (parcelBounds) {
      boundaryDescription = `The property boundary extends from SW corner (${parcelBounds.minLat.toFixed(6)}, ${parcelBounds.minLng.toFixed(6)}) to NE corner (${parcelBounds.maxLat.toFixed(6)}, ${parcelBounds.maxLng.toFixed(6)}). The satellite image is cropped to show primarily this property with slight padding. Count ONLY spots within this property boundary.`;
    } else {
      boundaryDescription = 'No exact boundary data is available. Use visual cues (fences, walls, curb lines, pavement changes, landscaping) to identify the subject property boundary.';
    }

    const hasDrawnBoundary = polygonCoords && polygonCoords.length >= 3;

    const systemPrompt = `You are an expert parking lot analyst examining a HIGH-RESOLUTION satellite image. Your job is to count individual parking stalls by looking at the painted line markings on the pavement.

HOW TO COUNT:
1. Look for the white or yellow PAINTED LINES that separate individual parking stalls
2. Each pair of adjacent lines defines ONE parking stall — count the spaces BETWEEN lines
3. Count row by row: identify each row of parking, count the stalls in that row, then move to the next row
4. Vehicles parked in stalls still count — if you can see a car in a stall, that's 1 stall
5. ${hasDrawnBoundary ? 'The user drew a polygon boundary. Count ONLY stalls INSIDE this boundary.' : 'The blue marker pin marks the subject property.'}
6. ${boundaryDescription}

WHAT NOT TO COUNT:
- Drive aisles / lanes between rows (these are for driving, not parking)
- The building footprint, grass, sidewalks, or landscaping
- Loading docks, dumpster areas, or fire lanes
- Street parking or adjacent property parking
- Any area outside the ${hasDrawnBoundary ? 'drawn boundary' : 'property boundary'}

IMPORTANT: Be precise. Count the actual stall lines you can see. Do NOT estimate by area formula. If you can see painted lines, count the individual stalls between them. A typical row of angled parking has 10-20 stalls. A suburban shopping center like Price Chopper typically has 60-120 spots total, NOT 150+.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Count the individual parking stalls visible in this satellite image. Look for painted line markings on the pavement and count the spaces between them, row by row. ${propertyContext ? propertyContext + '.' : ''} ${hasDrawnBoundary ? 'Count ONLY stalls inside the drawn boundary polygon.' : `The blue pin at ${lat}, ${lng} marks the property.`}`
              },
              imageContent
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_parking_count",
              description: "Report the counted parking stalls. Count by examining painted line markings row by row.",
              parameters: {
                type: "object",
                properties: {
                  count: { type: "number", description: "Total number of individual parking stalls counted by examining line markings" },
                  confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level" },
                  notes: { type: "string", description: "Row-by-row breakdown of how you counted (e.g. 'Row 1: 15 stalls, Row 2: 12 stalls...')" }
                },
                required: ["count", "confidence", "notes"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_parking_count" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("count-parking-spots error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
