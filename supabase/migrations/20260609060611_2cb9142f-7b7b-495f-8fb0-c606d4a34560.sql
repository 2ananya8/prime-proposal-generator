
CREATE POLICY "Authenticated can read proposal files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'proposals');
CREATE POLICY "Authenticated can write proposal files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposals');
