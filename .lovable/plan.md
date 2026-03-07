

## Integrating the Managed Squares Unified Model

Yes, absolutely. This workbook has a clear structure that maps well onto what we've already built. Here's how I'd break it into phases so we can ship value incrementally without trying to boil the ocean.

---

### Phase 1: Per-Site Financial Model Alignment (do first)

The per-site ROI sheets (Pages 3-18) are almost identical to what the dashboard already calculates, but the workbook adds several fields we're missing:

- **Owner/MS Split** — 70/30 default, editable. Show both sides: "Owner Monthly" and "MS Monthly"
- **Insurance** — annual cost (default $5,000), subtracted from revenue to get NOI
- **Site Rent** — monthly cost (default $0), subtracted from revenue
- **CoC and IRR** — already planned, matches the workbook's formulas exactly
- **10-Year Projection table** — year-by-year NOI, Owner Distribution, MS Distribution, Cumulative, CoC per year
- **Margin per kWh** — simple display: price − electricity − Tesla fee

**Changes:**
- `SiteAnalysis` type: add `ownerSplitPct`, `annualInsurance`, `monthlyRent`
- `FinancialProjection` type: add `cashOnCashReturn`, `irr5Year`, `irr10Year`, `annualNoi`, `ownerMonthly`, `msMonthly`, `marginPerKwh`, `yearByYear[]`
- `calculations.ts`: compute NOI = revenue − electricity − Tesla fee − insurance − rent; split by owner %; grow at 3%/yr; compute CoC and IRR
- `PropertyInputs.tsx`: add Owner Split slider, Insurance input, Rent input
- `InvestmentSummary.tsx`: show Owner/MS monthly, margin/kWh, CoC, IRR, year-by-year table
- `Dashboard.tsx`: wire new fields with defaults

---

### Phase 2: Portfolio Comparison View

The "All Sites" master control panel (Page 2) becomes a new **Portfolio** page that pulls all saved analyses from the database and displays them in a comparison table:

- Side-by-side columns: address, stalls, kWh/day, price, cost, incentives, OOP, NOI, Owner Monthly, MS Monthly, CoC, IRR, NPV
- Composite Score ranking (NPV rank + CoC rank + Speed rank)
- Scenario multiplier control (0.50 / 0.75 / 1.00 / 1.25) applied across all sites
- Portfolio totals row at bottom

**Changes:**
- New page `src/pages/Portfolio.tsx` 
- Database: add columns to `analyses` table for the new financial fields (owner_split, insurance, rent, noi, coc, irr, etc.) so portfolio view can aggregate without recalculating
- Route in `App.tsx`

---

### Phase 3: Waterfall & Exit Model

The waterfall (Page 19) and exit model (Page 20) are portfolio-level features:

- **Waterfall settings**: preferred return hurdle (10%), Tier 1 split (85/15), Tier 2 split (60/40)
- **Exit model**: hold period, EBITDA multiple, disposition fee, MS promote % at exit
- **Sensitivity tables**: split sensitivity, hold period sensitivity

**Changes:**
- New component `src/components/dashboard/WaterfallModel.tsx`
- New component `src/components/dashboard/ExitModel.tsx`
- Add to Portfolio page as expandable panels

---

### Recommended Build Order

1. **Phase 1** first — it directly improves every single site analysis and aligns the per-site numbers with your workbook. This also lays the groundwork (CoC, IRR, owner split) needed by everything else.
2. **Phase 2** next — once sites save richer data, the portfolio comparison becomes possible.
3. **Phase 3** last — waterfall and exit modeling layer on top of the portfolio.

Want me to start with Phase 1? That gets the per-site model matching your workbook immediately, and every new site you analyze will produce the same numbers you're used to seeing in Excel.

