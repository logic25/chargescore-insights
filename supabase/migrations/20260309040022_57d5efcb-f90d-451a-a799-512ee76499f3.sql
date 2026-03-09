ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS total_parking_spaces integer,
ADD COLUMN IF NOT EXISTS location_type text;