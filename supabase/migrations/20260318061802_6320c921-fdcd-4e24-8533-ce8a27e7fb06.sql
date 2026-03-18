
CREATE POLICY "Public can view shared notes" ON public.notes
FOR SELECT TO anon
USING (share_token IS NOT NULL);
