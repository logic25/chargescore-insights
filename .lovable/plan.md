
Recommendation (short answer):
Use a “trust-first infrastructure” palette, not a fully green brand. Keep green as the positive/accent signal, but anchor the UI in navy/neutral so the product feels like serious underwriting software, not a consumer EV promo site.

What to add to the marketing page (highest impact):
1) Product Proof Section (immediately under hero)
- Static screenshot or mocked panel of real analysis output:
  - ChargeScore
  - Incentive range
  - Out-of-pocket range
  - Confidence tiers
- Caption: “Not just a score — a finance-ready site brief.”

2) “How It Works” 4-step strip
- Address → Site score → Incentive confidence engine → OOP range
- Emphasize credibility logic (“Confirmed / Likely / Uncertain”).

3) Credibility + Methodology block
- “How we avoid unrealistic $0 estimates”
- Bullet the exact safeguards now in the app.

4) Tier clarity section
- Free preview vs free lookup vs Plus/Pro (simple matrix)
- Strong CTA toward signup from teaser value.

5) Objection-handling FAQ
- “How accurate are incentives?”
- “Why ranges not single numbers?”
- “What changes after signup?”

Color direction options (best to worst fit):
A) Recommended: Navy + Emerald + Amber
- Best for your buyer (property owners/operators evaluating ROI)
- Keeps EV relevance without looking “eco startup only”

B) Alternative: Graphite + Electric Green + Blue
- More modern/techy, slightly less financial trust

C) Not recommended as primary: Green-dominant
- Feels thematic, but can reduce seriousness for high-ticket capex decisions

Suggested token strategy (no redesign shock):
- Primary actions: Emerald
- Headings/nav/footer: Navy
- Financial positives: Green
- Risk/warnings: Amber
- Negative/expense: Red
- Backgrounds: neutral off-white + subtle navy tints

Implementation plan (phased, low risk):
Phase 1 (fast win, 1 pass)
- Add Product Proof + How It Works + Tier Matrix on LandingPage
- Keep current spacing/typography system
- Minimal component additions, no routing/auth changes

Phase 2 (brand tightening)
- Update color tokens in src/index.css only (no component rewrites)
- Reduce broad green washes; reserve green for KPI/action states
- Add navy framing to hero/nav/footer surfaces

Phase 3 (conversion optimization)
- Add FAQ + stronger CTA copy tied to incentive engine
- Track conversion events: hero CTA, signup click, pricing click
- A/B test headline: “See EV potential” vs “Underwrite EV charging in 60s”

Technical details:
- Files likely touched:
  - src/pages/LandingPage.tsx (new sections/components)
  - src/index.css (token adjustments only)
  - optional: small presentational components under src/components/marketing/*
- Keep existing typography rules (15px base, legibility-first).
- Reuse current Tailwind token system (no new design framework).
- No backend/database/auth changes needed for this iteration.
