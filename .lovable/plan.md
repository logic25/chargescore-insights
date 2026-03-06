

## Problem

The current financial model uses incorrect Tesla pricing: **$50K hardware + $50K install per stall**. The real Tesla V4 Canvas program sells in **sets of 4 stalls for $250K** (or $270K for the turnkey PSU option). Installation is a separate cost not bundled per-stall at $50K.

## Tesla V4 Pricing (from user's official data)

| Offer | Description | Price | Per-stall equiv |
|-------|------------|-------|-----------------|
| Offer 1 | V4/V3.5, 325 kW, 4 stalls | $250,000 | $62,500 |
| Offer 2 | V4/V4, 500 kW, 4 or 8 stalls | $250K (4) / $500K (8) | $62,500 |
| Offer 3 | Turnkey PSU V4/V3.5, fast install | $270,000 for 4 | $67,500 |

- Hardware is sold in **sets of 4** (each set = 4 posts + 1 cabinet + Starlink/LTE + site controller + commissioning)
- Installation is a **separate** cost (not included in the $250K)
- Service fee: $0.10/kWh (confirmed)
- 97% uptime guarantee, 15-year term

## Plan

### 1. Update Tesla constants in `calculations.ts`

- Replace `TESLA_COST_PER_STALL = 50000` with set-based pricing:
  - `TESLA_SET_PRICE = 250_000` (4 stalls per set, includes hardware + cabinet + commissioning)
  - `TESLA_PSU_SET_PRICE = 270_000` (turnkey PSU option — mention in tooltip but default to standard)
- Remove `TESLA_INSTALL_PER_STALL = 50000`
- Add `TESLA_INSTALL_PER_STALL = 15_000` — a reasonable per-stall installation estimate (site prep, trenching, electrical work — Tesla provides a construction manager but the owner hires contractors). This is separate from the hardware set price.
- Hardware cost = `Math.ceil(stalls / 4) * TESLA_SET_PRICE` (always sold in sets of 4)
- Installation cost = `stalls * TESLA_INSTALL_PER_STALL` (scales with stall count)

### 2. Update stall selector to snap to multiples of 4

In `PropertyInputs.tsx`, change the Supercharger Stalls slider:
- `min={4}`, `max={24}`, `step={4}` (was step=1)
- This reflects that Tesla sells in sets of 4

### 3. Update tooltips in `InvestmentSummary.tsx`

- Hardware row: change tooltip from "$50,000 each" to "$250,000 per set of 4 (includes V4 posts, V3.5 cabinet, Starlink, commissioning)"
- Installation row: update tooltip to "Site prep, trenching, electrical work. Installation is a separate expense — Tesla provides a construction manager to support your team."
- Change hardware label from `Hardware (X stalls)` to `Hardware (X/4 sets)`

### 4. Update RevenueCosts.tsx tooltips

- Update any references to per-stall hardware costs

### Technical Details

**`calculations.ts` changes:**
```
const TESLA_SET_PRICE = 250_000;        // 4x V4 posts + V3.5 cabinet + Starlink + commissioning
const TESLA_STALLS_PER_SET = 4;
const TESLA_INSTALL_PER_STALL = 15_000; // Site prep, trenching, electrical (owner's cost)

// In calculateTeslaFinancials:
const sets = Math.ceil(stalls / TESLA_STALLS_PER_SET);
const totalHardwareCost = sets * TESLA_SET_PRICE;
const totalInstallationCost = stalls * TESLA_INSTALL_PER_STALL;
```

For 8 stalls: Hardware = 2 × $250K = $500K, Install = 8 × $15K = $120K, Total = $620K (before incentives). This aligns with Tesla's actual pricing structure.

