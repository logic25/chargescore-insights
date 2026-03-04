

## Problem

The Google Maps key cannot be injected into the frontend via backend secrets. `import.meta.env.VITE_GOOGLE_MAPS_KEY` reads from the auto-managed `.env` file, which only contains Supabase config. Backend secrets are only accessible in edge functions.

## Solution: Edge function proxy for the API key

Create a small edge function that returns the Google Maps API key to the frontend. The key stays stored as a backend secret, and the frontend fetches it once on app load.

### Steps

1. **Add the secret** -- Use the `add_secret` tool to store `GOOGLE_MAPS_KEY` (without the VITE_ prefix) as a backend secret
2. **Create edge function** `supabase/functions/get-maps-key/index.ts` -- Returns the key from `Deno.env.get('GOOGLE_MAPS_KEY')` with CORS headers
3. **Create a shared hook** `src/hooks/useGoogleMapsKey.ts` -- Fetches the key once from the edge function, caches it in a module-level variable so subsequent calls are instant
4. **Update 3 files** to use the hook instead of `import.meta.env.VITE_GOOGLE_MAPS_KEY`:
   - `src/components/AddressAutocomplete.tsx`
   - `src/components/dashboard/ParkingLotMeasure.tsx`
   - `src/lib/api/googleMaps.ts` (convert to accept key as parameter)
5. **Update `SiteAerial.tsx`** to pass the key through

This keeps the key out of the codebase while making it available to the frontend. The key is still a publishable key (secured by referrer restrictions in Google Cloud Console), so exposing it to the browser is standard practice.

