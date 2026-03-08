

# Auto-set kWh/stall/day from ChargeScore + Raise Install Cost Default

## Changes

### 1. Raise `TESLA_INSTALL_PER_STALL` from $15K to $25K
In `src/lib/calculations.ts` line 25, change `15_000` → `25_000`. This is the base install cost — NYC sites in the seed data already override to $35K.

### 2. Auto-set `kwhPerStallPerDay` based on ChargeScore grade
In `src/pages/Dashboard.tsx`, after the `chargeScore` is computed (~line 204), add an effect that maps the score to the user's tiers:

| ChargeScore | Grade | kWh/stall/day |
|---|---|---|
| ≥ 80 | A / B+ | 400 (Very High) |
| ≥ 70 | B | 300 (High) |
| ≥ 50 | C+ / C | 250 (Medium) |
| < 50 | D / F | 100 (Low) |

This replaces the current hardcoded default of 250. The user can still manually override it via the slider — the auto-set only fires when the score changes (not when the user drags the slider).

Implementation: add a `useEffect` watching `chargeScore.totalScore` that calls `setSite(prev => ({ ...prev, kwhPerStallPerDay: mappedValue }))`. Track a `manualKwhOverride` flag so once the user touches the slider, auto-set stops.

### 3. Update `projectRevenue` in `scoring.ts` to match
Update the kWh mapping in `projectRevenue` (lines 451-458) to use the same tiers: 400/300/250/100 aligned with the score thresholds above, so the revenue projection card stays consistent.

### 4. Price per kWh — no change
Keep as manual user input (already is). No auto-setting for now.

### Summary of defaults after this change
- **Install cost**: $25K/stall (was $15K)
- **kWh/stall/day**: auto-set from ChargeScore (was fixed 250)
- **Price/kWh**: user-set (unchanged)

