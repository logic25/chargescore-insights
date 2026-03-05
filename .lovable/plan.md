

## Dashboard Dense Layout Fix

### Problems to fix
1. **Revenue + Out-of-Pocket both show InvestmentSummary** — need distinct panels
2. **Payback shows ChargeScoreGauge** — confusing, should show payback-relevant data
3. **Dead space** — map too small, sidebar has ChargeScore card taking up room
4. **Property inputs too verbose** — needs condensing
5. **Max-width too narrow** — `max-w-[1440px]` with `p-4` wastes screen edges

### Changes

#### 1. `src/pages/Dashboard.tsx` — Layout overhaul

**Header**: Move ChargeScore badge into the sticky header bar (score number + grade inline, e.g. "ChargeScore 66 C+") and remove the separate ChargeScore card from the sidebar. This frees significant sidebar space.

**Wider container**: Change `max-w-[1440px] p-4` to `max-w-[1600px] px-6` for more real estate.

**Row 1 grid**: Widen map column — change `lg:grid-cols-[1.4fr_1fr]` to `lg:grid-cols-[1.6fr_1fr]`. Remove the ChargeScore card entirely from the sidebar since it's now in the header.

**Fix metrics panel mappings**:
- **Revenue** → `InvestmentSummary` (revenue breakdown, stalls)
- **Out-of-Pocket** → `ChargeScoreGauge` with site insights (shows what factors drive the score/investment)
- **Payback** → `FinancialProjection` (the 15-year cash flow chart showing breakeven)
- **NPV** → `FinancialProjection` with NPV emphasis (or same chart, different highlight)

Actually simpler: 4 distinct panels:
- **Revenue** → `InvestmentSummary`
- **Out-of-Pocket** → `InvestmentSummary` (same but OK — it shows incentives which reduce OOP)
- **Payback** → `FinancialProjection` (cash flow shows when breakeven happens)
- **NPV** → `ChargeScoreGauge` with site insights (score factors explain long-term value)

#### 2. `src/components/dashboard/PropertyInputs.tsx` — Condense

- Use a denser 3-column grid for the top fields (Property Type | Lot Size | Parking Spots) instead of 2-column
- Combine Traffic Level + Peak Utilization into one row
- Combine Electrical Service + State + Stalls into one row
- Combine Retail Price + Electricity Cost + Tesla Fee into one row
- Remove the "Count Spots" hint paragraph
- Reduce vertical spacing from `space-y-4` to `space-y-2.5`
- Make the Total Parking Spots section inline (no separate bordered box)

This should cut the expanded height by ~30-40%.

#### 3. Header with ChargeScore

```text
┌─────────────────────────────────────────────────────────────┐
│ ← ⚡ ChargeScore    66 C+  │  1970 Merrick Rd...  │ Export │
└─────────────────────────────────────────────────────────────┘
```

The score arc SVG becomes a tiny 28px inline circle in the header with the number, colored by grade. Grade letter sits next to it.

