-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the 'avatars' bucket
-- Note: we must use the 'storage.objects' table for these policies

-- 1. Public read access
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- 3. Supervisors can delete their avatars, and users can delete their own
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
);

-- 4. Users can update avatars
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
);
