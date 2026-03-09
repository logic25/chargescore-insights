

# Pricing Update: Pro → $499 + Launch Pricing Badges

## Changes

### 1. `src/pages/Pricing.tsx`
- Pro price: `$299` → `$499`
- Add `launchPricing: true` to Plus and Pro tier objects
- Render "🔒 Launch pricing — locks in your rate" below the price on Plus and Pro
- Update footer: "Launch pricing locks in your rate. Plus and Pro billed monthly after onboarding."

### 2. `src/components/marketing/TierMatrix.tsx`
- Pro price: `$149` → `$499`
- Add same launch pricing line below price on Plus and Pro tiers

Both are copy/data-only changes — no logic, routing, or backend changes.

