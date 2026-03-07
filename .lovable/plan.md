

# Gap Analysis: Portfolio Waterfall + ChargeScore Stall Sizer

## What Already Exists

| Requirement | Status | Where |
|---|---|---|
| Per-site NOI calculation | **Done** | `calculations.ts` — full NOI with insurance, rent, Tesla fee |
| Owner/MS split logic | **Done** | `calculations.ts` — configurable ownerSplitPct |
| CoC Return | **Done** | `calculations.ts` + `InvestmentSummary.tsx` |
| 5-Year & 10-Year IRR | **Done** | `calculations.ts` (solveIrr) + `InvestmentSummary.tsx` |
| Margin/kWh | **Done** | `calculations.ts` |
| Year-by-Year distribution table (10yr) | **Done** | `InvestmentSummary.tsx` — collapsible table |
| Incentive engine (federal/state/utility) | **Done** | `calculations.ts` — ~600 lines of state-level logic |
| Scenario multiplier (0.5x–1.25x) | **Done** | `Portfolio.tsx` — dropdown with 4 presets |
| Portfolio comparison table | **Done** | `Portfolio.tsx` — ranked table with totals row |
| Summary cards (stalls, NOI, owner/mo, NPV) | **Done** | `Portfolio.tsx` |
| Parking impact analysis | **Done** | `ParkingImpact.tsx` — peak utilization slider |
| Parking spot estimation from lot size | **Done** | `PropertyInputs.tsx` + `ParkingLotMeasure.tsx` |
| ChargeScore scoring engine (9 factors) | **Done** | `scoring.ts` — traffic, EV density, competition, etc. |
| Recharts dependency | **Done** | Already installed, used in `FinancialProjection.tsx` |
| Cumulative cash flow chart | **Done** | `FinancialProjection.tsx` |
| Revenue/Costs breakdown | **Done** | `RevenueCosts.tsx` |
| Network comparison (Tesla vs ChargePoint vs Turnkey) | **Done** | `NetworkComparison.tsx` |
| Site save to database | **Done** | `analyses` table in database |

## What's Missing (Must Build)

| Requirement | Notes |
|---|---|
| **Waterfall tiered distribution** (Tier 1 / Tier 2 hurdle logic) | Core new feature — no existing code. Need `waterfallCalc.ts` |
| **Master Controls** (hurdle %, tier splits, growth rate, hold period, exit multiple, MS promote) | New UI component. Current portfolio only has scenario multiplier |
| **Editable site table** with 16 pre-loaded sites | Current portfolio pulls from DB. Need in-memory editable table with hardcoded 16 sites |
| **10-year waterfall table** (Tier 1/2 rows, cumulative target, "made whole?" indicator) | New — completely different from per-site year-by-year table |
| **Exit analysis** (exit value, disposition fee, MS promote, proceeds) | New feature |
| **4 Recharts charts** (stacked distributions, cumulative vs target, exit pie, CoC bar) | New visualizations |
| **Sidebar navigation** for Portfolio Builder | Current app uses header nav only |
| **Stall Sizer tool** (demand estimation engine with capture rates, utilization factors) | New — different from existing ChargeScore scoring |
| **Parking guidelines reference table** (NYC, CA, CT, Denver, LEED) | New static content |
| **"Add to Portfolio" button** connecting Stall Sizer → site table | New integration |
| **CSV export** | Not implemented |
| **URL state encoding** | Not implemented |
| **Navy/orange branding** for Portfolio Builder | Current app uses different color scheme |
| **Auto parking spot count** (AI vision on satellite imagery) | New feature — separate from lot-size estimation |

## What Can Be Reused vs Rebuilt

- **Reuse directly**: `solveIrr()`, Recharts, all shadcn/ui components, formatting helpers (`fmt`, `pct`)
- **Reuse concepts but rebuild**: NOI formula (waterfall version uses simpler inputs — stalls × kWh × margin × 365 − insurance − rent, no incentive engine per site), scenario multiplier (expand to master controls)
- **Build from scratch**: Waterfall engine, tier logic, exit analysis, stall sizer demand model, sidebar layout, all 4 new charts, editable table, 16 hardcoded sites

## Recommended Build Order

1. **Waterfall calc engine** (`waterfallCalc.ts`) — types + pure math for site NOI, waterfall tiers, exit
2. **Page layout + sidebar** — new route `/portfolio-builder` with sidebar
3. **Master controls + editable site table** with 16 pre-loaded sites
4. **Waterfall table + exit analysis** UI
5. **Charts** (4 Recharts visualizations)
6. **Stall Sizer** (inputs, demand engine, parking guidelines, mini P&L, "Add to Portfolio")
7. **Polish** (CSV export, URL state, branding, tooltips)

This is a large feature (~8-10 new files). The existing codebase covers ~40% of the financial logic concepts but the waterfall tier model and stall sizer are entirely new.

