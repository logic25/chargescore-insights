-- Tighten public lead submission policy (avoid WITH CHECK (true)) while keeping public contact form working
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
CREATE POLICY "Public can submit inbound leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source = 'inbound'
  AND status = 'new'
  AND address IS NOT NULL
  AND length(trim(address)) > 0
);
