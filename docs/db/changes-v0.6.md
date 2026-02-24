-- VYRE Database Changes v0.6
-- Apply these to your Supabase SQL Editor to enable Post Creation and Image Uploads

-------------------------------------------------------------------------------
-- 1. STORAGE: Create Bucket for Post Images
-------------------------------------------------------------------------------
-- Create a public bucket for post_images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. STORAGE: RLS Policies for post_images bucket
-------------------------------------------------------------------------------
-- Allow public viewing of images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'post_images' );

-- Allow authenticated users to upload images
-- Restrict to images only, < 5MB (handled partly by Supabase config, but we can enforce mimetype here)
CREATE POLICY "Authenticated Uploads" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'post_images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] != 'private' AND 
    (LOWER(storage.extension(name)) = 'jpg' OR LOWER(storage.extension(name)) = 'jpeg' OR LOWER(storage.extension(name)) = 'png' OR LOWER(storage.extension(name)) = 'webp')
);

-------------------------------------------------------------------------------
-- 3. POSTS: Enable RLS and Policies
-------------------------------------------------------------------------------
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to posts
CREATE POLICY "Public read posts" ON posts
FOR SELECT USING (true);

-- Allow authenticated users to insert posts
CREATE POLICY "Auth insert posts" ON posts
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-------------------------------------------------------------------------------
-- 4. POST IMAGES: Enable RLS and Policies
-------------------------------------------------------------------------------
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access to post_images
CREATE POLICY "Public read post_images" ON post_images
FOR SELECT USING (true);

-- Allow authenticated users to insert post_images
CREATE POLICY "Auth insert post_images" ON post_images
FOR INSERT 
WITH CHECK (
    -- Ensure the user owns the post they are attaching an image to
    EXISTS (
        SELECT 1 FROM posts
        WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid()
    )
);

-------------------------------------------------------------------------------
-- 5. Helper utility for profiles (if not already existing in schema v0.3)
-------------------------------------------------------------------------------
-- In case profiles row needs to be created automatically upon user signup
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, username, display_name)
--   VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'username');
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
