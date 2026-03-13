
-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('note-images', 'note-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-images');

-- RLS: anyone can view images (public bucket)
CREATE POLICY "Anyone can view note images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'note-images');

-- RLS: users can delete their own uploads
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);
