

## Gap Analysis: Your Data vs. EVpin's Data

Looking at the EVpin screenshots for 1970 Merrick Road and comparing with your current 9-factor scoring engine, here's where you stand:

### What You Already Have (Working)
| Data Point | EVpin Equivalent | Your Source |
|---|---|---|
| Utility Company | "PSEG Long Island" | NREL Utility Rates -- returning "Long Island Power Authority" (same entity) |
| EV Registrations (state-level) | Stats tab: 331K total EVs | Static file per state (rough estimate) |
| Nearby Amenities | Nearby Amenities score | NREL stations data |
| Competition / Existing Stations | Stations panel | NREL Alt Fuel Stations |
| Incentives / Rebates | Rebates tab: 4 programs | NREL Incentives API |
| Demographics (multi-family, pop density) | Demographics score | Census ACS |
| DAC Status | Disadvantaged indicator | CEJST ArcGIS |
| Alt Fuel Corridor / NEVI | NEVI layer | FHWA Corridors ArcGIS |

### Gaps -- Data EVpin Has That You Don't

1. **Parcel Data (for non-NYC)** -- EVpin shows APN, acreage (0.11), building sqft (1,475), owner name, land use ("Household") for Merrick. Your NYS Tax Parcels query returned empty. The ArcGIS layer index may be wrong (you're hitting layer 1; Nassau County data may be on a different layer or require a different service URL).

2. **Zoning & Land Use** -- EVpin shows zoning code, description, and subtype. You have none. This matters because zoning determines whether DCFC is even *permitted* at a site. A residentially zoned parcel can't host a commercial charging station without a variance.

3. **EV Registration Data (county/zip level)** -- EVpin breaks it down: 331K total, 209K BEV vs 121K PHEV, brand split (32% Tesla, 11% Toyota). Your static file only has rough state-level numbers. County-level data from Atlas EV Hub or state DMV datasets would be far more accurate.

4. **Nearest Highway Exit** -- EVpin shows "0.9 miles, 3 minutes away." Highway proximity is a major driver of DCFC demand (road-trippers). You have Alt Fuel Corridor data but not highway exit distance.

5. **Signal Strength / Power Capacity / Power Service Areas** -- EVpin's right sidebar shows these as "Pro" layers. Grid capacity is more than just "do you have 3-phase?" -- it includes transformer capacity, distance to substation, and whether the local grid can handle 500kW+ demand without upgrades. This is what you asked about ("EVpin has something for grid capacity").

6. **Flood Zone / FEMA Data** -- EVpin shows FEMA flood zone (Zone X = minimal risk). This matters because:
   - DCFC equipment is a $150K-$500K investment. Flood damage can destroy it.
   - Insurance costs are dramatically higher in flood zones.
   - Permitting is harder in flood zones (elevation requirements, special permits).
   - Lenders and investors check flood risk before financing.
   - For a 15-year investment horizon, this is material risk assessment.

7. **Permitting Jurisdiction** -- EVpin identifies "Town of Hempstead Department of Buildings." Knowing the AHJ (Authority Having Jurisdiction) speeds up the permitting process and helps estimate timeline/cost.

### Issues With Current Data (Broken/Empty)

From the network requests:
- **HPMS traffic data**: Returning `null` for Merrick (no road segments within 2km). Merrick Road is a state route -- HPMS should have it. The Socrata dataset might need different field names or the geometry query format may be off.
- **Alt Fuel Corridor API**: Returning `{"error":{"code":400,"message":"Invalid URL"}}`. The ArcGIS query URL structure needs fixing.
- **NYS Tax Parcels**: Returning empty features. Layer index or service URL likely wrong for Nassau County.
- **MapPLUTO**: Correctly empty (Merrick is not in NYC).

### Questions You're Not Asking

1. **"Is this site even zoned for commercial EV charging?"** -- The biggest deal-killer isn't score, it's permitting. A perfect ChargeScore on a residentially zoned lot is worthless. You should flag zoning incompatibility.

2. **"What's the demand charge impact?"** -- You have `demandChargePerKw` as a static input ($15/kW). LIPA/PSEG LI has specific EV-friendly rate structures. The difference between a standard commercial rate and an EV rate can be $30K+/year.

3. **"Who owns this property?"** -- EVpin shows owner name. For a sales tool targeting property owners, knowing who to contact (and whether it's an individual vs. LLC vs. government) changes the pitch.

4. **"What's the competition's utilization?"** -- EVpin has utilization data for nearby stations. A nearby station at 90% utilization = overflow opportunity. A nearby station at 10% = warning sign. You count stations but don't assess if they're saturated.

5. **"What will grid interconnection actually cost?"** -- The real barrier to DCFC isn't "does 3-phase exist" but "how much does the utility charge for a new 480V service at this capacity?" LIPA has specific make-ready programs. This is where EVpin's "Power Capacity" layer adds value.

### Recommended Plan

**Phase 1 -- Fix Broken APIs** (immediate)
- Fix the Alt Fuel Corridor ArcGIS URL (400 error)
- Fix NYS Tax Parcels query (try different layer indices or use the parcel search endpoint)
- Debug HPMS returning null for Merrick Road

**Phase 2 -- Add High-Value Missing Data**
- Add FEMA flood zone check (free ArcGIS service, no key needed) -- material for investment risk
- Add zoning data from NYS GIS or local ArcGIS layers -- critical for feasibility
- Upgrade EV registrations to county-level (Atlas EV Hub or DOE data)

**Phase 3 -- Competitive Parity with EVpin**
- Add highway exit proximity (FHWA National Highway System GIS layer)
- Add property owner lookup from parcel data
- Add station utilization data (NREL OCPI data where available)

