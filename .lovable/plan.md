

## Issues Found & Fixes

### 1. NPV explanation needs improvement
The current tooltip just says "8% discount rate" without explaining why. The 8% represents the **weighted average cost of capital (WACC)** — it accounts for what you'd earn if you invested that money elsewhere (opportunity cost). The explanation below the chart and in the tooltip should be more thorough.

**Fix in `src/pages/Dashboard.tsx`**: Expand the NPV tooltip to explain opportunity cost and why 8%.
**Fix in `src/components/dashboard/FinancialProjection.tsx`**: Add an explanation paragraph below the chart explaining NPV in plain language.

### 2. Tesla does NOT require minimum 8 stalls — text is wrong
In `src/components/dashboard/ParkingImpact.tsx` line 84: `"Minimum 8 stalls per site recommended"` — this is incorrect. Tesla's minimum is **4 stalls** (which the slider already enforces on line 42 of calculations.ts: `Math.max(4, site.teslaStalls)` and slider min=4 in InvestmentSummary).

**Fix in `src/components/dashboard/ParkingImpact.tsx`**: Change "Minimum 8 stalls" to "Minimum 4 stalls" to match the actual Tesla program requirement.

### 3. "4.1% of parking" is NOT hardcoded — it IS dynamic
The value `stallPct.toFixed(1)%` on line 79 of ParkingImpact.tsx calculates `(requestedChargers / totalSpaces) * 100`. With 6 stalls and ~147 spots, that's 4.1%. If you change stalls or spot count, it updates. However, the issue may be that **changing stalls in InvestmentSummary doesn't visually update ParkingImpact** because the stall slider is inside the expandable panel while ParkingImpact is in the sidebar. Both read from `site.teslaStalls` so they should sync — but let me verify the data flow is correct. It is: `onStallsChange` updates `site.teslaStalls` → `parking` recalculates via `useMemo`. So it IS dynamic and reactive. No code change needed here.

### 4. Peak parking utilization should affect revenue
Currently `peakUtilization` (65% default) is ONLY used in `calculateParkingImpact` to show how many spots are used. It does NOT feed into revenue or ChargeScore calculations at all. This is a gap — a site with 90% parking utilization means more foot traffic, which means more potential charging sessions.

**Fix in `src/lib/scoring.ts`**: The "Site Readiness" factor (Factor 8) already considers `totalParkingSpots`. We should also factor in utilization as a signal — but this requires passing `peakUtilization` into the scoring inputs. Higher utilization = more customers on-site = more sessions. However, extremely high utilization (95%+) is negative because there's no room for charger-dedicated spots.

**Approach**: Add a utilization bonus/penalty to the Site Readiness factor:
- 60-85% utilization → bonus (busy site, lots of customers)  
- 85-95% → neutral
- 95%+ → penalty (parking constrained)
- <40% → slight penalty (low traffic site)

### Files to change
1. `src/pages/Dashboard.tsx` — better NPV tooltip text
2. `src/components/dashboard/ParkingImpact.tsx` — fix "8 stalls" to "4 stalls"  
3. `src/components/dashboard/FinancialProjection.tsx` — add NPV explanation below chart
4. `src/lib/scoring.ts` — add `peakUtilization` to scoring inputs, factor into Site Readiness
5. `src/pages/Dashboard.tsx` — pass `peakUtilization` into `calculateChargeScoreV2` call

