

## Dashboard Layout Redesign — Eliminate Dead Space

### Problem
The current layout is a single wide column stacking everything vertically: full-width map → metrics strip → ChargeScore + Investment side-by-side → cash flow → property inputs way at the bottom. This creates massive dead space and buries the property inputs (which directly affect the score and financials) where users will never find them.

### New Layout: 3-Column Dense Dashboard

The core idea: **put the map and property inputs side-by-side in the top row**, so users see their site AND can tweak inputs immediately. Everything fits above the fold on desktop.

```text
┌──────────────────────────────────────────────────────────────────┐
│ ← ChargeScore    1970 Merrick Rd, Merrick NY     Download Report│  header
├────────────────────────────────┬─────────────────────────────────┤
│                                │  ChargeScore: 66 (C+)          │
│   Satellite Map / Competition  │  Grade explanation              │
│   (tabs)                       │  ─────────────────────          │
│   ~400px tall                  │  Property & Charging Inputs     │
│                                │  (property type, traffic,       │
│                                │   stalls slider, pricing,       │
│                                │   parking utilization)          │
│                                │  ─────────────────────          │
│                                │  Parking Impact (compact)       │
├────────────────────────────────┴─────────────────────────────────┤
│  $4,303/mo  │  $0 out-of-pocket  │  1yr payback  │  $525K NPV  │  metrics strip
├─────────────────────────────────┬────────────────────────────────┤
│  Investment Summary             │  15-Year Cumulative Cash Flow  │
│  (incentives, costs, stalls)    │  (bar chart)                   │
└─────────────────────────────────┴────────────────────────────────┘
```

### Changes to `src/pages/Dashboard.tsx`

**Row 1** — Side-by-side: Map (left, ~60%) + Right sidebar containing:
- ChargeScore gauge (compact — just the score arc, grade, and brief verdict)
- PropertyInputs (expanded by default, not collapsed)  
- ParkingImpact (compact inline)

**Row 2** — Key metrics strip (unchanged, stays as the 4-column bar)

**Row 3** — Side-by-side: InvestmentSummary (left) + FinancialProjection/cash flow chart (right)

### Changes to `src/components/dashboard/PropertyInputs.tsx`
- Default `expanded` to `true` instead of `false` — inputs should be visible immediately
- Remove the collapse toggle entirely or make it always expanded in this context

### Changes to `src/components/dashboard/ChargeScoreGauge.tsx`  
- No structural changes, but it will render in the narrower right column so it needs to stay responsive (it already is)

### Changes to `src/components/dashboard/ParkingImpact.tsx`
- No changes needed, it's already compact

### What this fixes
- Property inputs are immediately visible next to the map — users see the site and can tweak inputs without scrolling
- No dead space — the right column is packed with actionable controls
- Financial details (Investment Summary + Cash Flow) sit together in row 3 as the user approved
- The map is still prominent but shares the row instead of hogging the full width

