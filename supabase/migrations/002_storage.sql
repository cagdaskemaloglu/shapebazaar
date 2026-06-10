-- ============================================================
-- ShapeBazaar — Storage Buckets & Policies
-- ============================================================

-- 1. model-files bucket (private — accessed via signed URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'model-files',
  'model-files',
  false,
  52428800, -- 50 MB
  ARRAY[
    'model/stl',
    'application/octet-stream',
    'text/plain',
    'model/obj',
    'application/vnd.ms-package.3dmanufacturing'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 2. model-thumbnails bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'model-thumbnails',
  'model-thumbnails',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- model-files: authenticated users upload to own folder
CREATE POLICY "model_files_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'model-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- model-files: owner can read own files
CREATE POLICY "model_files_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'model-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- model-files: owner can delete own files
CREATE POLICY "model_files_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'model-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- model-thumbnails: public read
CREATE POLICY "thumbnails_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'model-thumbnails');

-- model-thumbnails: authenticated upload to own folder
CREATE POLICY "thumbnails_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'model-thumbnails'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: public read
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- avatars: authenticated upload to own folder
CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: owner delete
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
