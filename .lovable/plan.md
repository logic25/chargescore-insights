

# Add 'Unverified' Confidence Badge for NREL AFDC Results

## Problem
The new confidence-tiered incentive engine (`incentiveCalc.ts`) only pulls from the curated `incentive_programs` DB table. For sites outside the 6 curated utility territories, users see **zero incentive programs** — even though the NREL AFDC API returns relevant state/utility programs via `fetchStateIncentives()`.

## Approach
Bridge the two systems: when no curated programs match, convert NREL AFDC results into `IncentiveProgram` objects with a new `'unverified'` confidence level and feed them into the existing display pipeline.

## Changes

### 1. `src/lib/incentiveCalc.ts` — Expand confidence type + add NREL converter
- Add `'unverified'` to the `confidence` union type on `IncentiveProgram`
- Add a new function `nrelToIncentivePrograms(nrelResults: NrelIncentive[]): IncentiveProgram[]` that maps NREL records into the `IncentiveProgram` shape with `confidence: 'unverified'`, extracting estimated amounts from `estimatedBenefit` strings
- Update `calculateIncentives()` to treat `unverified` programs like `uncertain` — excluded from confirmed/likely totals, shown separately

### 2. `src/pages/Dashboard.tsx` — Merge NREL fallback into the new engine
- After fetching curated `incentivePrograms` and `nrelIncentives`, if no curated programs match (or only expired ones), convert NREL results via `nrelToIncentivePrograms()` and merge them into the program list
- Pass the merged list to `calculateIncentives()`

### 3. `src/components/incentives/IncentiveBreakdown.tsx` — Render unverified badge
- Add `unverified` to `CONFIDENCE_STYLES` with a distinct visual: dashed outline, muted amber/yellow tone, "Unverified" label
- Add a small disclaimer below unverified cards: "Data from AFDC — not manually verified by ChargeRank"

### 4. `src/pages/Portfolio.tsx` — Same NREL fallback merge for portfolio sites
- Apply the same fallback logic when fetching incentives per portfolio site

## Summary
- 4 files modified
- New `'unverified'` confidence tier flows through the entire incentive pipeline
- Non-curated territories get NREL data with honest labeling instead of showing nothing

