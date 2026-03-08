
-- Create incentive_programs table
CREATE TABLE public.incentive_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name text NOT NULL,
  administrator text,
  state text,
  utility_territory text,
  amount_per_port numeric,
  amount_flat numeric,
  amount_cap numeric,
  confidence text NOT NULL CHECK (confidence IN ('confirmed', 'likely', 'uncertain')),
  program_status text DEFAULT 'active' CHECK (program_status IN ('active', 'expiring', 'expired', 'announced')),
  expiration_date date,
  application_url text,
  notes text,
  stacking_allowed boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.incentive_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active programs"
  ON public.incentive_programs FOR SELECT
  USING (program_status IN ('active', 'expiring', 'announced'));

CREATE POLICY "Pro users can manage programs"
  ON public.incentive_programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'pro'
    )
  );

-- Also allow reading expired programs (for strikethrough display)
CREATE POLICY "Anyone can read expired programs"
  ON public.incentive_programs FOR SELECT
  USING (program_status = 'expired');
