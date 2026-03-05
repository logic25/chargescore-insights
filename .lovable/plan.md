

## Problem Summary

Several issues with the Property & Charging Inputs panel and related components:

1. **Lot size missing for Nassau County** — NYS Tax Parcels doesn't include Nassau. Nassau County has its own public GIS MapServer with parcel data (SHAPE_Area in sq ft).
2. **33% charger cap is unsourced** — Not backed by Tesla or any data. Should be removed.
3. **Google Popular Times for peak utilization** — Google's official Places API does NOT expose Popular Times data. Only available via third-party scrapers (Outscraper, ScrapingBee). Not viable.
4. **Price/kWh** — The owner sets the retail price. Tesla provides a levelized electricity cost recommendation. This field label is misleading.
5. **Demand charge** — Not in Tesla's calculator. Already ignored in Tesla financials but the field still shows in the UI.
6. **Parking Impact Analysis** — Uses an arbitrary "75% of available spots" formula with no backing data. Needs to be reconsidered.
7. **Generic/Other charging model** — User wants Tesla Supercharger for Business focus only.
8. **15-year cash flow** — Needs to move up in layout.
9. **Incentive description still truncated** — The `min-w-0` on the flex parent may be constraining it.

---

## Changes

### 1. Add Nassau County GIS as parcel data source
**File: `src/lib/api/parcel.ts`**

Add a `fetchNassauParcels()` function that queries:
```
https://gis.nassaucountyny.gov/server/rest/services/Layers/MapServer/1/query
```
- Send point geometry in WGS84 (inSR=4326), request `outFields=PARCEL_ADDRESS,SHAPE_Area,PARCELKEY`
- `SHAPE_Area` is in sq ft (service uses esriFeet)
- Insert this as a fallback between MapPLUTO and NYS Tax Parcels in `fetchParcelInfo()`: MapPLUTO → Nassau County → NYS Tax Parcels

### 2. Remove 33% charger cap and "Available for Chargers" box
**File: `src/components/dashboard/PropertyInputs.tsx`**

- Remove the "Available for Chargers — 33% of spots" display box entirely
- Remove the `chargerSpots` calculation (line 68)
- Keep the Total Parking Spots input (manual count or estimate)
- The stall slider (4-24) with Tesla's 4-8% recommendation text already provides proper guidance

### 3. Peak Parking Utilization — keep as manual input
Google Popular Times is not available via official API. No reliable programmatic source exists. Keep the slider with the existing tooltip explaining it. Add a note: "Ask your property manager or estimate from peak-hour observations."

### 4. Fix pricing field labels and visibility
**File: `src/components/dashboard/PropertyInputs.tsx`**

- **Price/kWh**: Rename label to "Your Retail Price/kWh" — this is what the owner charges EV drivers. Keep editable.
- **Electricity $/kWh**: Rename to "Your Levelized Electricity Cost/kWh" with tooltip explaining it includes demand charges, TOU rates, and all utility costs. Keep editable.
- **Demand $/kW**: Hide entirely in Tesla mode (already ignored in calculations). Only relevant for generic model.
- **Tesla Service Fee**: Display as read-only info line, not an editable field, since Tesla sets this at $0.10/kWh with 3% annual escalation.

### 5. Remove Generic/Other charging model
**File: `src/components/dashboard/PropertyInputs.tsx`**

Remove the charging model toggle buttons entirely. Default to Tesla Supercharger for Business. Remove all `isTesla` conditionals — always use the Tesla path.

### 6. Rework or remove Parking Impact Analysis
**File: `src/components/dashboard/ParkingImpact.tsx`** and **`src/lib/calculations.ts`**

The current formula (75% of available-after-peak spots) is arbitrary. Two options:

**Recommended**: Replace with a simpler, factual summary:
- Show total spots, peak utilization, and how many spots the requested stalls consume as a percentage
- Show Tesla's minimum requirement (dedicated spots, ADA compliance)
- Remove the "recommended max EV charger spots" since it's unsourced
- Show a warning only if stalls exceed total available (after peak), which is straightforward math

### 7. Move 15-year cash flow up
**File: `src/pages/Dashboard.tsx`**

Reorder Row 2 and Row 3: Place FinancialProjection (15-year chart) in Row 2 alongside InvestmentSummary. Move PropertyInputs to Row 3 alongside the simplified ParkingImpact.

### 8. Fix incentive description truncation
**File: `src/components/dashboard/InvestmentSummary.tsx`**

The parent `div` has `min-w-0` which causes flex children to shrink. Remove `min-w-0` from the description's parent container or add `break-words` / `whitespace-normal` to ensure long text wraps properly.

---

## Technical Details

- **Nassau County GIS**: Public MapServer at `gis.nassaucountyny.gov`, layer 1 (Parcels). Supports spatial queries with `inSR=4326` datum transformation. Returns `SHAPE_Area` in square feet. No authentication required for queries.
- **Popular Times**: Google does not expose this in their official Places API (confirmed). Only available through scraping services which would violate ToS and add cost/reliability risk. Not implementing.
- **Tesla pricing model**: Owner sets retail price. Tesla charges a $0.10/kWh service fee (3% annual escalation). The "electricity cost" is the owner's levelized utility rate — not something Tesla or LIPA provides (the NREL commercial rate is a rough estimate, not the actual levelized cost the owner pays).

