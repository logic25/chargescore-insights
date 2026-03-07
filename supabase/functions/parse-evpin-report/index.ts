import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EvpinExtracted {
  totalScore: number | null;
  aadt: number | null;
  evAdoptionPct: number | null;
  l3Ports: number | null;
  crimeRate: string | null;
  purchasingPowerPct: number | null;
  evRegistrations: number | null;
  chargingDemandScore: number | null;
  raw: Record<string, string>;
}

function extractMetrics(text: string): EvpinExtracted {
  const raw: Record<string, string> = {};
  const result: EvpinExtracted = {
    totalScore: null,
    aadt: null,
    evAdoptionPct: null,
    l3Ports: null,
    crimeRate: null,
    purchasingPowerPct: null,
    evRegistrations: null,
    chargingDemandScore: null,
    raw,
  };

  // Total Score: "4.6/5" or "Total Score 4.6" patterns
  const scoreMatch = text.match(/(?:total\s*score|overall\s*score|evpin\s*score)[:\s]*(\d+\.?\d*)\s*(?:\/\s*5)?/i)
    || text.match(/(\d+\.?\d*)\s*\/\s*5\s*(?:total|overall|score)/i)
    || text.match(/(\d+\.?\d*)\s*out\s*of\s*5/i);
  if (scoreMatch) {
    result.totalScore = parseFloat(scoreMatch[1]);
    raw.totalScore = scoreMatch[0];
  }

  // AADT
  const aadtMatch = text.match(/(?:AADT|annual\s*average\s*daily\s*traffic|daily\s*traffic)[:\s]*([\d,]+)/i);
  if (aadtMatch) {
    result.aadt = parseInt(aadtMatch[1].replace(/,/g, ""));
    raw.aadt = aadtMatch[0];
  }

  // EV Adoption %
  const adoptionMatch = text.match(/(?:ev\s*adoption|adoption\s*rate)[:\s]*([\d.]+)\s*%/i);
  if (adoptionMatch) {
    result.evAdoptionPct = parseFloat(adoptionMatch[1]);
    raw.evAdoptionPct = adoptionMatch[0];
  }

  // L3 ports
  const l3Match = text.match(/(\d+)\s*(?:L3|level\s*3|DCFC|DC\s*fast)\s*(?:ports?|chargers?|stations?)/i)
    || text.match(/(?:L3|level\s*3|DCFC)\s*(?:ports?|chargers?)[:\s]*(\d+)/i);
  if (l3Match) {
    result.l3Ports = parseInt(l3Match[1]);
    raw.l3Ports = l3Match[0];
  }

  // Crime rate
  const crimeMatch = text.match(/([\d.]+)x\s*(?:the\s*)?national\s*(?:average|avg)/i);
  if (crimeMatch) {
    result.crimeRate = crimeMatch[1] + "x national avg";
    raw.crimeRate = crimeMatch[0];
  }

  // Purchasing power
  const ppMatch = text.match(/(?:purchasing\s*power|afford)[:\s]*([\d.]+)\s*%/i);
  if (ppMatch) {
    result.purchasingPowerPct = parseFloat(ppMatch[1]);
    raw.purchasingPowerPct = ppMatch[0];
  }

  // EV registrations
  const regMatch = text.match(/(?:ev\s*registrations?|registered\s*ev)[:\s]*([\d,]+)/i);
  if (regMatch) {
    result.evRegistrations = parseInt(regMatch[1].replace(/,/g, ""));
    raw.evRegistrations = regMatch[0];
  }

  // Charging demand score
  const demandMatch = text.match(/(?:charging\s*demand|demand\s*score)[:\s]*([\d.]+)/i);
  if (demandMatch) {
    result.chargingDemandScore = parseFloat(demandMatch[1]);
    raw.chargingDemandScore = demandMatch[0];
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ error: "filePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("site-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError?.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from PDF - use the AI gateway for PDF parsing
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Simple text extraction: look for text streams in PDF
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = decoder.decode(bytes);
    
    // Extract text between BT/ET blocks (PDF text objects)
    const textBlocks = rawText.match(/BT[\s\S]*?ET/g) || [];
    for (const block of textBlocks) {
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const content = tj.match(/\(([^)]*)\)/);
        if (content) text += content[1] + " ";
      }
      const tdMatches = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
      for (const td of tdMatches) {
        const parts = td.match(/\(([^)]*)\)/g) || [];
        for (const p of parts) {
          const c = p.match(/\(([^)]*)\)/);
          if (c) text += c[1];
        }
        text += " ";
      }
    }

    // Also try to grab any readable ASCII sequences as fallback
    if (text.trim().length < 50) {
      const asciiChunks = rawText.match(/[\x20-\x7E]{10,}/g) || [];
      text = asciiChunks.join(" ");
    }

    const extracted = extractMetrics(text);

    return new Response(JSON.stringify({ extracted, textLength: text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
