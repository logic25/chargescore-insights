

## Make NPV Year Range Adjustable

Add a dropdown/select inside the Financial Projection panel and the metrics strip label so users can switch between common analysis periods (5, 10, 15, 20 years).

### Changes

**`src/types/chargeScore.ts`**
- Add `npvYears: number` to `SiteAnalysis` (default 15)

**`src/lib/calculations.ts`**
- Replace hardcoded `PROJECT_YEARS = 15` with `site.npvYears` (fallback 15)
- `cumulativeCashFlow` array length, NPV sum, and payback all use the dynamic year count
- Same change in both `calculateTeslaFinancials` and `calculateGenericFinancials`

**`src/pages/Dashboard.tsx`**
- Add `npvYears: 15` to initial site state
- Update NPV card label from `'15-Year NPV'` to dynamic `${site.npvYears}-Year NPV`
- Update tooltip text similarly

**`src/components/dashboard/FinancialProjection.tsx`**
- Add a small Select dropdown in the panel header: options 5, 10, 15, 20 years
- Accept new props `npvYears` and `onNpvYearsChange`
- Update chart title to reflect selected years

**Dashboard wiring**
- Pass `npvYears={site.npvYears}` and `onNpvYearsChange` to `FinancialProjection`
- `onNpvYearsChange` updates `site.npvYears` via `setSite`

