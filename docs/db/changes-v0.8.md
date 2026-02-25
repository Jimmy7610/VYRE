-- VYRE Database Changes v0.8: Profile Trigger & Comments RLS
-- Apply these to your Supabase SQL Editor to enable auto-profile provisioning and commenting

---

## -- 1. PROFILE AUTO-PROVISIONING (Trigger function)

-- This ensures that whenever a user signs up (via Supabase Auth),
-- they automatically get a row in the public.profiles table.
CREATE OR REPLACE FUNCTION public.handle*new_user()
RETURNS trigger AS $$
BEGIN
INSERT INTO public.profiles (id, username, display_name)
VALUES (
new.id,
COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '*' || substr(md5(random()::text), 1, 4)),
COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
);
RETURN new;
END;

$$
LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-------------------------------------------------------------------------------
-- 2. EXISTING USER PROFILE BACKFILL
-------------------------------------------------------------------------------
-- Run this once to fix any existing accounts missing a profile row.
INSERT INTO public.profiles (id, username, display_name)
SELECT
    id,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1) || '_' || substr(md5(random()::text), 1, 4)),
    COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 3. COMMENTS: Enable RLS and Policies
-------------------------------------------------------------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to comments
CREATE POLICY "Public read comments" ON public.comments
FOR SELECT USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Auth insert comments" ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Allow authenticated users to delete their own comments
CREATE POLICY "Auth delete comments" ON public.comments
FOR DELETE
USING (auth.uid() = author_id);

-------------------------------------------------------------------------------
-- 4. STORAGE: Re-confirming bucket policies (documented in v0.6)
-------------------------------------------------------------------------------
-- The "post_images" bucket should allow authenticated inserts and public reads.
-- (If these were already applied from v0.6, you can skip this block).
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'post_images' );

CREATE POLICY "Authenticated Uploads" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'post_images' AND
    auth.role() = 'authenticated'
);
$$
