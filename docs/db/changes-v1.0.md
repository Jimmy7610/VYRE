-- VYRE Database Changes v1.0: Profiles & Avatars

-------------------------------------------------------------------------------
-- 1. AVATARS STORAGE BUCKET
-------------------------------------------------------------------------------
-- Ensure 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. STORAGE POLICIES
-------------------------------------------------------------------------------
-- Allow public read access to avatars
CREATE POLICY "Public Avatar Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload and manage their own avatars.
-- Using folder-based ownership: avatars/{userId}/avatar.ext
CREATE POLICY "Auth Upload Avatar" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth Update Avatar" ON storage.objects
FOR UPDATE
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth Delete Avatar" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-------------------------------------------------------------------------------
-- 3. PROFILES RLS
-------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles
CREATE POLICY "Public Read Profiles" ON public.profiles
FOR SELECT
USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Auth Update Own Profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Note: INSERT is already fully handled securely by the `handle_new_user()` trigger 
-- created in v0.8. Users cannot manually insert rows into `profiles`.
