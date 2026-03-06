

## Issues & Fixes

### 1. Tesla Superchargers not appearing on the competition map
The NREL API returns 27 stations within 5 miles of Merrick — none are Tesla. The nearest Tesla Supercharger (likely Roosevelt Field Mall or similar) is beyond the 5-mile default radius. The fix is to **increase the default search radius to 10 miles** and add a radius selector so you can toggle between 5/10/15 mi.

**Files**: `src/lib/api/stations.ts`, `src/pages/Dashboard.tsx`, `src/components/dashboard/MapView.tsx`

### 2. Parking Impact card is confusing — needs redesign
Currently it shows "96 Peak Used (65%)" and "51 Available Off-Peak" using the peak utilization slider percentage. The user's real question is simpler: **"I have 147 spots and I'm dedicating 8-10 to chargers. Will that cause problems during holidays/peak seasons?"**

Redesign the card to show:
- **Your charger footprint**: X stalls + ~2 spots for equipment = total dedicated spots
- **Normal days**: plenty of room (X remaining after chargers)
- **Peak season impact**: at 90-95% utilization (holidays), remaining spots drops to Y — show whether chargers create a conflict
- Replace the abstract bar chart with a clearer "worst case vs. typical" comparison

Also add a **peak utilization slider** directly on the Parking Impact card so the user can model "what happens during holiday season" (slide to 90-95%).

**Files**: `src/components/dashboard/ParkingImpact.tsx`, `src/lib/calculations.ts` (add equipment overhead to `requestedChargers`), `src/pages/Dashboard.tsx`

### 3. Real peak parking data — Google Popular Times
Google Places does have "popular times" busyness data via the Places Details API (`place.currentOpeningHours` and `place.regularOpeningHours`). However, the **busyness/popular times data is NOT available through any public API** — it's only shown in Google Maps UI. There is no official API endpoint for it.

**What we CAN do**: Use property-type heuristics for peak utilization defaults:
- Shopping center: 65% normal, 90% holiday peak
- Restaurant: 70% normal, 85% peak
- Office park: 80% weekday, 20% weekend

We'll add **preset peak scenarios** (Normal / Weekend Peak / Holiday Peak) as quick buttons alongside the slider, with property-type-aware defaults.

**Files**: `src/components/dashboard/ParkingImpact.tsx`

### 4. Utilization slider location
The slider EXISTS in InvestmentSummary but it's only visible when the "Revenue" panel is expanded (click the Revenue card at top). This is not discoverable. We should add a note or visual cue, OR move the slider to always be visible in the sidebar property inputs.

**Fix**: Move the utilization slider to `PropertyInputs` alongside the stall count, so it's always accessible without needing to expand a specific panel.

**Files**: `src/components/dashboard/PropertyInputs.tsx`, `src/pages/Dashboard.tsx`

### Summary of changes
1. `src/lib/api/stations.ts` — increase default radius to 10mi
2. `src/pages/Dashboard.tsx` — pass radius prop, pass utilization to PropertyInputs, add peak scenario support
3. `src/components/dashboard/MapView.tsx` — show radius in legend
4. `src/components/dashboard/ParkingImpact.tsx` — redesign with equipment overhead, peak scenarios (Normal/Weekend/Holiday), built-in utilization slider
5. `src/components/dashboard/PropertyInputs.tsx` — add charging utilization slider (kWh/stall/day)
6. `src/lib/calculations.ts` — add ~2 equipment spots to charger footprint in parking calc

