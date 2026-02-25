# VYRE Database Changes v1.1

## Phase 1: Database Security (Row Level Security)

```sql
-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. POSTS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

-- 3. LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone" ON public.likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- 4. COMMENTS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id);
```

## Phase 2: Storage Security (Post Media + Avatars)

```sql
-- 1. POST IMAGES BUCKET

DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
CREATE POLICY "Post images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'post_images');

DROP POLICY IF EXISTS "Users can upload post images to their own folder" ON storage.objects;
CREATE POLICY "Users can upload post images to their own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'post_images' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
CREATE POLICY "Users can update their own post images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'post_images' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
CREATE POLICY "Users can delete their own post images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'post_images' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );


-- 2. AVATARS BUCKET

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatars to their own folder" ON storage.objects;
CREATE POLICY "Users can upload avatars to their own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
```

## Phase 3: Performance Queries (Indexes)

```sql
-- Feed query optimization (ordered by created_at, ignoring deleted posts)
CREATE INDEX IF NOT EXISTS posts_created_at_desc_idx ON public.posts (created_at DESC) WHERE deleted_at IS NULL;

-- Author lookup optimization (for quickly finding profile data)
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON public.posts (author_id);

-- Nested/Related lookup optimizations
CREATE INDEX IF NOT EXISTS comments_post_id_created_at_idx ON public.comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON public.likes (post_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
```

**Realtime Implications:**
These RLS policies govern read access. Since `SELECT` policies for all tables are `true` or `deleted_at IS NULL`, the realtime subscriptions on the public schema will continue sending inserts to all connected clients correctly. Deleted nodes are naturally filtered out of the view layer or skipped if `deleted_at IS NULL` applies to the table.
