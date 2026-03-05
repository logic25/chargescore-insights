

## Problem

The screenshot shows massive dead space below the Investment Summary. The right sidebar in Row 1 has `overflow-y-auto max-h-[620px]` which creates an awkward internal scroll. Below the metrics strip, the ChargeScore details + Investment Summary + Cash Flow chart are stacked vertically with lots of whitespace. The user wants the metrics strip cards to be clickable — clicking one expands a detail panel below it.

## New Layout

```text
┌──────────────────────────────────────────────────────────────────┐
│ ← ChargeScore    1970 Merrick Rd, Merrick NY     Download Report│
├────────────────────────────────┬─────────────────────────────────┤
│                                │  ChargeScore: 66 (C+)          │
│   Satellite / Competition      │  Property & Charging Inputs     │
│   (map fills available height) │  (always expanded, NO scroll)   │
│                                │  Parking Impact                 │
├────────────────────────────────┴─────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ $2,953/mo│ │ $0 OOP   │ │ 1yr pay  │ │ $525K NPV│  ← click  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   to expand │
├──────────────────────────────────────────────────────────────────┤
│  ▼ Expanded detail panel for whichever card was clicked          │
│  e.g. "Monthly Revenue" → shows InvestmentSummary               │
│  e.g. "15-Year NPV" → shows FinancialProjection chart           │
│  e.g. "Out-of-Pocket" → shows incentive breakdown               │
│  e.g. "Payback" → shows ChargeScore factors                     │
└──────────────────────────────────────────────────────────────────┘
```

## Changes to `src/pages/Dashboard.tsx`

### 1. Remove sidebar scroll constraint
- Remove `overflow-y-auto max-h-[660px] lg:max-h-[620px]` from the right sidebar div
- Let the sidebar grow naturally — both columns will match height via CSS grid `items-start`

### 2. Make metrics strip cards clickable with expandable panels
- Add `activePanel` state: `'revenue' | 'investment' | 'payback' | 'npv' | null`
- Each metric card becomes a `<button>` with `cursor-pointer` and active ring styling
- Clicking a card toggles it (click again to collapse)
- Below the strip, render the corresponding detail panel:
  - **Monthly Revenue** → `InvestmentSummary` (has the revenue breakdown, stalls slider, incentives)
  - **Out-of-Pocket** → `InvestmentSummary` (same component, scrolled/focused on incentives section)
  - **Payback** → `ChargeScoreGauge` (score factors that explain the payback)
  - **15-Year NPV** → `FinancialProjection` (the bar chart)
- Default: `activePanel = 'revenue'` so something is always shown on first load (no dead space)

### 3. Remove the old Row 3 grid layout
- Delete the `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]` grid that placed ChargeScoreGauge + InvestmentSummary side by side
- These components now only render inside the expandable panels
- The gated blur class still wraps the expandable section

### 4. Visual treatment for active metric card
- Active card gets `ring-2 ring-primary bg-primary/5` 
- Inactive cards get `hover:bg-muted/50 cursor-pointer`
- Small chevron or underline indicator on the active card

