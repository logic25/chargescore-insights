

## Dashboard Redesign: Clean, Informative Flow

### Layout Philosophy
The current layout stacks everything vertically — wasteful on desktop. The new design uses a **persistent 2-column grid on desktop** that reads top-to-bottom, left-to-right like a report. Related data pairs together so nothing feels orphaned.

### New Layout

```text
┌──────────────────────────────────────────────────────────┐
│  Header: ← ChargeScore        [address]     [Download]   │
╞═══════════════════════════════╤═══════════════════════════╡
│  Map (Satellite | Competition)│  ChargeScore Gauge        │
│  ~350px, tabbed               │  Score + factor breakdown │
├───────────────────────────────┴───────────────────────────┤
│  ── GATE (blur below) ──                                  │
├───────────────────────────────┬───────────────────────────┤
│  Property Inputs (collapsible)│  Investment Summary       │
│  Property type, traffic,      │  Stalls slider, costs,    │
│  electrical, pricing          │  incentives, out-of-pocket│
├───────────────────────────────┼───────────────────────────┤
│  Year 1 Revenue & Costs       │  15-Year Cash Flow Chart  │
├───────────────────────────────┼───────────────────────────┤
│  Network Comparison           │  Parking Impact           │
└───────────────────────────────┴───────────────────────────┘
```

Mobile: single column, same order top-to-bottom.

### Why This Works
- **Map + Score** side-by-side: the two "headline" pieces — where and how good
- **Inputs + Investment** paired: adjust assumptions on the left, see financial impact on the right
- **Revenue + Cash Flow** paired: short-term P&L next to long-term projection
- **Network + Parking** paired: both are "context" cards, neither very tall — fills the row without dead space

### Changes

1. **`Dashboard.tsx`** — Restructure `<main>`:
   - Row 1 (ungated): `grid lg:grid-cols-2 gap-3` → Map tabs (left) + ChargeScore Gauge (right)
   - Row 2 (gated): `grid lg:grid-cols-2 items-start gap-3` → PropertyInputs + InvestmentSummary
   - Row 3 (gated): `grid lg:grid-cols-2 items-start gap-3` → RevenueCosts + FinancialProjection
   - Row 4 (gated): `grid lg:grid-cols-2 items-start gap-3` → NetworkComparison + ParkingImpact

2. **`PropertyInputs.tsx`** — Change stalls slider `max={12}` → `max={24}`. Update recommendation text to cap at 24 instead of 12.

3. **`InvestmentSummary.tsx`** — Change stalls slider `max={12}` → `max={24}`.

4. **`PropertyInputs.tsx`** — Start collapsed by default (`useState(false)`) so the right column (Investment Summary) isn't dwarfed by a massive expanded form.

