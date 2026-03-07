
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS owner_split_pct double precision DEFAULT 70,
  ADD COLUMN IF NOT EXISTS annual_insurance double precision DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS monthly_rent double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS noi double precision,
  ADD COLUMN IF NOT EXISTS owner_monthly double precision,
  ADD COLUMN IF NOT EXISTS ms_monthly double precision,
  ADD COLUMN IF NOT EXISTS coc double precision,
  ADD COLUMN IF NOT EXISTS npv double precision,
  ADD COLUMN IF NOT EXISTS margin_kwh double precision,
  ADD COLUMN IF NOT EXISTS price_per_kwh double precision,
  ADD COLUMN IF NOT EXISTS electricity_cost double precision,
  ADD COLUMN IF NOT EXISTS kwh_per_stall_per_day double precision,
  ADD COLUMN IF NOT EXISTS total_project_cost double precision,
  ADD COLUMN IF NOT EXISTS net_investment double precision,
  ADD COLUMN IF NOT EXISTS estimated_incentives double precision;
