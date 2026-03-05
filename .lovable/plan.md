

## Problem

Programs like "ZEV Rebate" and "ZEV Fueling Infrastructure Grant for Municipalities" are showing as eligible, but they're only available to municipal/government entities. The app currently has no mechanism to filter programs by applicant type (commercial vs. municipal/government).

## Approach

**1. Add municipality/government keyword detection to `src/lib/api/incentives.ts`**

Add a new exclusion filter that detects programs restricted to municipalities/government entities. Programs with titles or descriptions containing keywords like "for municipalities", "municipal fleet", "government", "public agency", "local government" should be filtered out **unless** the user's `propertyType` indicates a government-owned property.

Since the existing property types don't include a "government/municipal" option, we have two choices:

- **Option A**: Simply exclude municipality-only programs for all users (since the app targets commercial property owners, not government entities).
- **Option B**: Add a "Government / Municipal" property type option so the rare government user can see those programs.

**Recommendation: Option A** — the app's target user is a commercial property owner. Municipality-only programs should be excluded via `EXCLUDE_KEYWORDS` additions. This is the simplest, most correct fix.

**2. Changes to `src/lib/api/incentives.ts`**

Add these keywords to `EXCLUDE_KEYWORDS`:
- `'for municipalities'`, `'municipal fleet'`, `'municipal govern'`, `'public agency'`, `'local government'`, `'zev rebate'` (the ZEV Rebate is a vehicle purchase rebate, not infrastructure)

This will cause `isRelevantToEVCharging` to return `false` for these programs, removing them from results entirely.

**3. Verify no false positives**

Ensure the new keywords don't accidentally exclude legitimate infrastructure programs. The keywords are specific enough (e.g., "for municipalities" rather than just "municipal") to avoid collateral filtering.

## Files to Change

- `src/lib/api/incentives.ts` — add municipality/government-restricted keywords to `EXCLUDE_KEYWORDS`

