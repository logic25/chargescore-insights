

## Plan: Dashboard Stall Recommendations, Portfolio Integration, and Seeded Projects

### What you're asking for (4 items)

1. **Add stall recommendation to the Dashboard** — When a user searches a property and sees the map + property inputs, they should also see a suggested stall count (currently this logic only lives in the Portfolio Builder's Stall Sizer).

2. **Fix lot size field alignment** — The "Lot Size" input in PropertyInputs is misaligned in the grid layout (likely the long source label is pushing it out of alignment).

3. **"Add to Portfolio" from Dashboard** — After analyzing a site, users should be able to push it into the Portfolio Builder with all its financial data pre-filled.

4. **Seed My Projects with portfolio addresses** — Pre-populate the My Analyses page with the 16 preloaded portfolio sites so they show up as saved projects.

---

### Technical approach

**1. Stall Recommendation on Dashboard**

- Import `computeStallRecommendation` from `waterfallCalc.ts` into `Dashboard.tsx`
- Add a compact "Recommended Stalls" card below the PropertyInputs panel (right column, between PropertyInputs and ParkingImpact)
- Feed it the same data already available on Dashboard: AADT, lot size, EV registrations, nearby L3 ports, parking spaces
- Show the 3-tier result (Conservative / Moderate / Aggressive) in a compact format
- Wire the "Use recommendation" action to update `site.teslaStalls`

**2. Fix Lot Size Alignment**

- In `PropertyInputs.tsx`, the source label (e.g. "— NYC MapPLUTO") inside the `<Label>` causes the column to grow inconsistently
- Move the source badge to below the input (as a small helper text) instead of inline with the label, matching the "Total Spots" pattern which already has a sub-line

**3. "Add to Portfolio" Button on Dashboard**

- Add an "Add to Portfolio" button in the Dashboard header (next to "Save Project")
- On click, map the current Dashboard site data to a `SiteRow` shape (name from address, stalls, prices, costs, incentives, etc.)
- Navigate to `/portfolio` with the new site encoded as a URL query parameter (consistent with the existing URL-based state model)
- In `PortfolioBuilder.tsx`, on mount, check for an `addSite` query param and inject it into the sites array

**4. Seed My Projects**

- On the My Analyses page, add a "Seed Portfolio Sites" button (shown only when the list is empty or as an action)
- On click, batch-insert the 16 `PRELOADED_SITES` into the `analyses` table with reasonable defaults for the financial fields (charge_score estimated from state, stalls, pricing, etc.)
- Alternatively, auto-seed on first visit if no analyses exist — with a toast confirmation

### Files to modify

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add stall recommendation card + "Add to Portfolio" button |
| `src/components/dashboard/PropertyInputs.tsx` | Fix lot size label alignment |
| `src/pages/PortfolioBuilder.tsx` | Accept `addSite` query param on load |
| `src/pages/MyAnalyses.tsx` | Add seed button for portfolio sites |
| New: `src/components/dashboard/StallRecommendation.tsx` | Compact recommendation display for Dashboard |

