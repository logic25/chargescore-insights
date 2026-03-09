-- Expand allowed profile roles to include 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('free','plus','pro','admin'));

-- Prevent client-side role escalation (block role changes in JWT request context)
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- In client requests, Supabase/Lovable sets request.jwt.claim.role; in server-side/admin contexts it's NULL
    IF current_setting('request.jwt.claim.role', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Role changes are not allowed from client requests';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- Promote the current signed-in user to admin so they can access Portfolio/Waterfall
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'b6bdb6b6-6863-43ba-a34a-899a1bc292a7';

-- Extend pro-only policies to include admin
DROP POLICY IF EXISTS "Pro users can manage programs" ON public.incentive_programs;
CREATE POLICY "Pro/admin users can manage programs"
ON public.incentive_programs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('pro','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('pro','admin')
  )
);

DROP POLICY IF EXISTS "Pro users can read org leads" ON public.leads;
CREATE POLICY "Pro/admin users can read org leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('pro','admin')
  )
);
