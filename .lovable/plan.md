

## Assessment: The Code Is Already Correct

After reading every relevant file, the "damage report" is **factually incorrect**. All 10 items listed as "not implemented" are actually present in the codebase:

### Evidence

1. **9-factor scoring** — `src/lib/scoring.ts` contains `calculateChargeScoreV2` with all 9 factors: Traffic Volume (22%), EV Density (13%), Competition Gap (18%), Dwell Time (10%), Amenities (10%), Parking (5%), Grid (5%), Incentive Eligibility (10%), Demand Overflow (7%).

2. **Distance-based competition** — `scoring.ts` lines 84-97 use `nearestDcfcMiles` with graduated thresholds (≥10mi = 100, ≥5mi = 85, etc.), not the old `100 - stations * 15`.

3. **$0.223/kWh levelized rate** — `Dashboard.tsx` line 52 sets `electricityCostPerKwh: 0.223`.

4. **No demand charge double-count** — `calculations.ts` line 134: `monthlyDemandCharge = 0` for Tesla model, with comments explaining the levelized rate includes demand charges.

5. **$50K hardware + $50K install** — `calculations.ts` lines 97-98: `TESLA_COST_PER_STALL = 50000`, `TESLA_INSTALL_PER_STALL = 50000`.

6. **Google Maps satellite** — `SiteAerial.tsx` calls `getSatelliteImageUrl(lat, lng)` from `src/lib/api/googleMaps.ts`.

7. **Draw-to-measure** — `ParkingLotMeasure` component is imported and rendered in SiteAerial.

8. **Census + FCC + NLR APIs** — Dashboard.tsx imports and calls `fetchCensusTractFips`, `fetchMultiFamilyPct`, `fetchPopDensity`, `fetchPlannedStations`, and `fetchNearbyStations`.

9. **15-year discounted NPV** — `calculations.ts` uses `DISCOUNT_RATE = 0.08` and `PROJECT_YEARS = 15` with proper DCF.

### The Old Code Still Exists But Isn't Used

The legacy `calculateChargeScore` function (5-factor, `100 - stations * 15`) remains in `calculations.ts` lines 36-57 as dead code. The Dashboard exclusively calls `calculateChargeScoreV2` from `scoring.ts`. This dead code may have caused the confusion.

### Recommended Action

No core rewrites are needed. If you're seeing unexpected values in the UI, the issue is likely:
- A specific UI component displaying old data
- The `VITE_GOOGLE_MAPS_KEY` not being set (satellite view falls back to placeholder)
- A rendering bug in a specific panel

If you're experiencing a specific incorrect number or broken feature, point me to it and I'll trace the exact cause. Otherwise, the engine is working as designed.

### Optional Cleanup

- **Remove dead code**: Delete the unused `calculateChargeScore` function and related legacy helpers (`getVerdict`, `getIncentiveScore`, `getEvAdoptionScore`) from `calculations.ts` to avoid future confusion.

