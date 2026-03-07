
-- Create doc_type enum
CREATE TYPE public.doc_type AS ENUM ('evpin_report', 'lease', 'permit', 'utility_bill', 'other');

-- Create site_documents table
CREATE TABLE public.site_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  file_path text NOT NULL,
  doc_type public.doc_type NOT NULL DEFAULT 'other',
  extracted_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.site_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.site_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.site_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.site_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('site-documents', 'site-documents', false);

-- Storage RLS policies
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'site-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
