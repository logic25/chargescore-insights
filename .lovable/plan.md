

## Changes

### 1. Bigger ChargeScore in header
Increase the inline SVG from 28×28 to 40×40, bump the score number font from `text-[8px]` to `text-xs`, and make the grade letter `text-base font-bold`.

### 2. Merge Payback + NPV into 3 cards
Remove the Payback card since it shows the same `FinancialProjection` as NPV. Keep 3 cards in the metrics strip:
- **Monthly Revenue** → `InvestmentSummary`
- **Out-of-Pocket** → `ChargeScoreGauge` (site insights)
- **15-Year NPV** → `FinancialProjection` (cash flow chart)

Change grid from `grid-cols-2 lg:grid-cols-4` to `grid-cols-3`.

### 3. NPV explanation
Add a small helper text line below the NPV value: `"Total profit in today's dollars"`. Also wrap the label with a tooltip (using the existing Radix tooltip) that explains: "Net Present Value discounts future cash flows at 8% to show what your total 15-year profit is worth in today's dollars."

### Files changed
- `src/pages/Dashboard.tsx` — all three changes above

