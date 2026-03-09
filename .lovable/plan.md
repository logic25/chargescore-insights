

## Problem

The satellite image on the dashboard is broken. The `<img>` tag points to a Google Maps Static API URL, but the request is failing (referrer restriction or API not enabled). When the image fails, there's no `onError` handler, so the browser just shows the alt text.

## Plan

**Fix `src/components/dashboard/SiteAerial.tsx`:**

1. Add an `onError` handler on the `<img>` tag that switches to a fallback state when the Google Static Map image fails to load.
2. The fallback will show:
   - An embedded Leaflet/OpenStreetMap satellite tile map as the primary fallback (using the same Leaflet library already installed), OR
   - A cleaner placeholder with a map icon and coordinates if Leaflet is too heavy for this component.

**Recommended approach** — Use an OpenStreetMap static image as fallback:
- On `<img onError>`, swap `src` to an OpenStreetMap-based static image tile (e.g., from `tile.openstreetmap.org`) or show the "Satellite view unavailable" placeholder with proper styling instead of broken alt text.
- This requires no additional dependencies.

**Specifically:**
- Add `useState` for `imageError`
- Add `onError={() => setImageError(true)}` to the `<img>`
- When `imageError` is true, render the fallback placeholder (styled nicely with a Map icon) instead of the broken image

This is a quick fix that ensures users never see broken image alt text.

