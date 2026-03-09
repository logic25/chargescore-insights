import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng, imageUrl, lotSizeSqFt, address } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use satellite imagery URL if no image provided — tighter bbox for property focus
    const span = 0.0007; // ~75m radius — focuses on subject property
    const satUrl = imageUrl || `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - span},${lat - span},${lng + span},${lat + span}&bboxSR=4326&size=1024,1024&imageSR=4326&format=png&f=image`;

    const propertyContext = [
      address ? `Property address: ${address}` : '',
      lotSizeSqFt ? `Known lot size: ~${Math.round(lotSizeSqFt).toLocaleString()} sq ft` : '',
    ].filter(Boolean).join('. ');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a parking lot analyst. You will be shown a satellite/aerial image centered on a specific property. Your job is to count the parking spots that belong ONLY to the subject property.

CRITICAL RULES:
- The blue marker pin in the center of the image marks the subject property
- Count ONLY parking spots that belong to the subject property's lot — the lot where the pin is located
- DO NOT count spots on neighboring properties, adjacent businesses, or across streets
- Look for property boundaries: fences, walls, curb lines, different pavement colors, landscaping strips, sidewalks, and roads that separate lots
- If the property is a shopping center or strip mall, count all spots within that shopping center's connected lot
- Count only clearly visible painted parking stalls within the property boundary
- If spots are partially obscured by vehicles, still count them if the stall lines are visible
- Do NOT count driveways, loading zones, or unmarked areas
- If you cannot see clear parking stalls, estimate based on the paved area using 1 spot per 350 sq ft

Return ONLY a JSON object with these fields:
- count: number (total parking spots on the SUBJECT property only)
- confidence: "high" | "medium" | "low"
- notes: string (brief description of what you see and how you identified the property boundary)`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Count the parking spots for ONLY the subject property at coordinates ${lat}, ${lng}. The blue pin marks the property. ${propertyContext ? propertyContext + '.' : ''} Do NOT count spots on neighboring properties. Return JSON only.`
              },
              {
                type: "image_url",
                image_url: { url: satUrl }
              }
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
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
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
