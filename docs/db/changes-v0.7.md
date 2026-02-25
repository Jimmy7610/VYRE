-- VYRE Database Changes v0.7 (Likes RLS)
-- Apply these to your Supabase SQL Editor to enable the Like System persistence

---

## -- 1. LIKES TABLE: Enable RLS and Policies

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to likes
CREATE POLICY "Public read likes" ON public.likes
FOR SELECT USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Auth insert likes" ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own likes
CREATE POLICY "Auth delete likes" ON public.likes
FOR DELETE
USING (auth.uid() = user_id);
