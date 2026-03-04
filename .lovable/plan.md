

## Dashboard Redesign: Remove Redundancy and Fix Issues

### Problems Identified

1. **Parking shows 35 spaces** — The default `lotSqFt` is 12,000 sq ft. At 1 spot per 340 sq ft, that's 35 spots. This is too small for most commercial properties. Should default to ~50,000 sq ft (≈147 spots).

2. **Duplicate 15-Year Cash Flow chart** — Both `CashFlowChart` (standalone card) AND `FinancialProjection` render the exact same bar chart. Remove the standalone `CashFlowChart` entirely.

3. **Duplicate Investment Summary data** — `InvestmentSummary` shows project cost, incentives, out-of-pocket, payback, NPV. `FinancialProjection` repeats all of this in its "Investment Summary" box. Merge them: keep the hero `InvestmentSummary` card, strip the summary box from `FinancialProjection` so it only shows Revenue/Costs/Incentives details + the chart.

4. **Two maps look redundant** — `SiteAerial` (satellite photo) and `MapView` (competition stations) serve different purposes but both take up large vertical space. Combine them into a single section with tabs: "Satellite" / "Competition".

5. **Network Comparison costs** — Owner-Operated shows `$85,000–$100,000` hardware which is correct for ChargePoint DCFC. This is intentionally different from Tesla's $50K. No code change needed, but could add a note clarifying the difference.

### Proposed Dashboard Layout (after cleanup)

```text
┌─────────────────────────────────┐
│  Site Aerial + Competition Map  │  ← Tabbed: Satellite | Competition
│  (Property Details inline)      │
├─────────────────────────────────┤
│  ChargeScore Gauge              │
├─────────────────────────────────┤
│  ── GATE (blur below) ──       │
├─────────────────────────────────┤
│  Property Inputs                │
├─────────────────────────────────┤
│  Investment Summary (hero)      │  ← Stalls slider, costs, incentives, out-of-pocket
├─────────────────────────────────┤
│  Year 1 Revenue & Costs         │
├─────────────────────────────────┤
│  Financial Details + Cash Flow  │  ← Revenue/Costs/Incentives columns + chart (NO summary box)
├─────────────────────────────────┤
│  Network Comparison             │
├─────────────────────────────────┤
│  Parking Impact                 │
└─────────────────────────────────┘
```

### Changes

1. **`SiteAerial.tsx`** — Change default `lotSqFt` from `12000` to `50000`

2. **`Dashboard.tsx`** — Remove `CashFlowChart` import and usage. Combine `SiteAerial` and `MapView` into a tabbed container (Satellite / Competition tabs).

3. **`FinancialProjection.tsx`** — Remove the "Investment Summary" box (lines 194-227) since `InvestmentSummary` already shows all that data. Keep the 3-column Revenue/Costs/Incentives grid and the cash flow chart.

4. **Remove `CashFlowChart.tsx`** — No longer needed since `FinancialProjection` has the chart.

### Technical Notes

- The parking "35 spots" is not a bug — it's the lot size default being too small. Changing from 12,000 to 50,000 sq ft gives ~147 spots which is realistic for a shopping center.
- The two maps serve genuinely different purposes (satellite aerial vs competition stations) so they're kept but combined into tabs to reduce scroll.
- Network Comparison correctly shows different hardware costs per model — Tesla V4 posts are cheaper than ChargePoint/Blink DCFC units.

