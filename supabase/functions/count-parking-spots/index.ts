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

    const arcGisUrl = imageUrl ||
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&bboxSR=4326&size=600,600&imageSR=4326&format=png&f=image`;

    const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_KEY");
    const googleFallbackUrl = GOOGLE_MAPS_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=600x600&maptype=satellite&key=${GOOGLE_MAPS_KEY}`
      : null;

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

    // Try ArcGIS first, then Google Static Maps fallback
    let dataUri = await fetchImageAsBase64(arcGisUrl);
    if (!dataUri && googleFallbackUrl) {
      console.log("ArcGIS failed, trying Google Static Maps fallback");
      dataUri = await fetchImageAsBase64(googleFallbackUrl);
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

    const systemPrompt = `You are an expert parking lot analyst. You will be shown a satellite/aerial image of a specific property. Your job is to count the parking spots.

CRITICAL RULES:
1. ${hasDrawnBoundary ? 'The user has drawn a polygon boundary around ONLY the parking lot area they want counted. Count spots ONLY inside this drawn boundary.' : 'The blue marker pin in the center of the image marks the subject property.'}
2. ${boundaryDescription}
3. Count ONLY striped/marked parking stalls visible in the image
4. Do NOT count the building footprint, grass, driveways, loading zones, fire lanes, or drive aisles as parking
5. Do NOT count street parking or spots on neighboring properties
6. If individual stall markings are visible, count each one
7. If striping is NOT clearly visible but you can see a paved parking area, estimate using 1 spot per 350 sq ft of PAVED PARKING AREA ONLY (exclude building, landscaping, driveways)
8. If spots are partially obscured by vehicles, still count them
9. Be conservative — it's better to slightly undercount than to wildly overcount
10. For a typical suburban shopping center lot, expect roughly 4-5 spots per 1,000 sq ft of paved parking area

Return ONLY a JSON object with these fields:
- count: number (total parking spots in the ${hasDrawnBoundary ? 'drawn boundary area' : 'subject property'} only)
- confidence: "high" | "medium" | "low"
- notes: string (brief description of what you see and how you counted)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Count the parking spots for ONLY the subject property at coordinates ${lat}, ${lng}. The blue pin marks the property. ${propertyContext ? propertyContext + '.' : ''} ${boundaryDescription} Return JSON only.`
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
              description: "Report the counted parking spots from the satellite image",
              parameters: {
                type: "object",
                properties: {
                  count: { type: "number", description: "Total number of parking spots counted" },
                  confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level of the count" },
                  notes: { type: "string", description: "Brief description of what was observed" }
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
