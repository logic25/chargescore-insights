const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, params } = await req.json();

    if (!endpoint || typeof endpoint !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Whitelist allowed NREL endpoints
    const allowedEndpoints = [
      'alt-fuel-stations/v1/nearest.json',
      'alt-fuel-stations/v1.json',
      'utility_rates/v3.json',
      'transportation-incentives-laws/v1.json',
    ];

    if (!allowedEndpoints.includes(endpoint)) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NREL_API_KEY') || '';
    const searchParams = new URLSearchParams(params || {});
    searchParams.set('api_key', apiKey);

    const url = `https://developer.nrel.gov/api/${endpoint}?${searchParams}`;
    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
