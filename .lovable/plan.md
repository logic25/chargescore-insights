

# 30C → "Expiring" Warning + AFDC National Fallback

You're right — 30C isn't expired yet, but it's effectively unreachable for any new DCFC project starting now. The fix is to flag it honestly, not remove it.

## Changes

### 1. `src/lib/calculations.ts` — Flag 30C as expiring/unrealistic
- Lines 828–844: Change the description and details to warn that the June 2026 deadline makes it effectively unreachable for new DCFC installations
- Add a `warning` field: "Deadline June 30, 2026 — new DCFC projects starting after March 2026 are unlikely to be placed in service in time"
- Keep `computedAmount` calculated but add a `confidence: 'uncertain'` marker so downstream UI can render it appropriately
- Lines 104–107 and 227–230: Exclude 30C from the "selected total" incentive sum (treat it like an ineligible program) so it no longer inflates OOP estimates

### 2. Marketing copy updates (4 files)
- `LandingPage.tsx` line 139: "Federal 30C tax credits, NEVI funding" → "NEVI funding, state rebates"
- `HowItWorks.tsx` line 21: "federal 30C, NEVI, and 50+" → "NEVI and 50+ state/utility"
- `ProductProof.tsx` line 13: Replace 30C example with "NYSERDA Make-Ready" as the Confirmed program
- `FAQSection.tsx` line 7: "(30C, NEVI)" → "(NEVI)"

### 3. No AFDC work needed
The NREL AFDC integration already exists in `src/lib/api/incentives.ts`. National coverage is already live — unsupported territories get NREL results automatically.

## Summary
- 5 files, all copy/logic changes
- 30C stays visible with an "expiring — unlikely for new projects" warning instead of being removed
- 30C amount excluded from OOP calculations so estimates stay honest
- Marketing stops leading with a credit most users can't claim

