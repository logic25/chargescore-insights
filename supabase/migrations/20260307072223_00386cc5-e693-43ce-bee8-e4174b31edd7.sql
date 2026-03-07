CREATE POLICY "Users can update own analyses"
  ON public.analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);