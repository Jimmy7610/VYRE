-- VYRE Database Schema
-- Supabase / PostgreSQL
-- Security-first layout utilizing UUIDs and soft deletes.
-- No business logic, triggers, or RLS policies in this file.
-- Note: This file is informational; source of truth is Supabase + migration docs.

-- Enable UUID extension if not present (Supabase usually has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------
-- 1. USERS (Auth Reference)
-------------------------------------------------------------------------------
-- In Supabase, this mirrors auth.users. We create a public wrapper or just
-- rely on auth.users. For this schema, we define a core users table to hold
-- minimal PII or serve as the foreign key target if auth.users is entirely kept 
-- in the auth schema.
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    email_bounced BOOLEAN DEFAULT FALSE, -- Minimal security state
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 2. PROFILES
-------------------------------------------------------------------------------
-- Public facing profiles. Separated from users to isolate PII.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete for account deactivation
);

-------------------------------------------------------------------------------
-- 3. POSTS
-------------------------------------------------------------------------------
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete hiding content but retaining DB trail
);

-------------------------------------------------------------------------------
-- 4. POST IMAGES
-------------------------------------------------------------------------------
-- 1-to-1 relationship with posts for media attached to a post.
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID UNIQUE NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    blurhash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 5. FOLLOWS
-------------------------------------------------------------------------------
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-------------------------------------------------------------------------------
-- 6. LIKES
-------------------------------------------------------------------------------
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

-------------------------------------------------------------------------------
-- 7. COMMENTS
-------------------------------------------------------------------------------
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-------------------------------------------------------------------------------
-- 8. DIRECT MESSAGES (THREADS)
-------------------------------------------------------------------------------
-- 1-to-1 DM threads. Constraints ensure user1_id < user2_id to prevent duplicate threads.
CREATE TABLE dms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT check_user_order CHECK (user1_id < user2_id),
    UNIQUE (user1_id, user2_id)
);

-------------------------------------------------------------------------------
-- 9. DM MESSAGES
-------------------------------------------------------------------------------
CREATE TABLE dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dm_id UUID NOT NULL REFERENCES dms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    image_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Sender deleting their message (tombstoned for safety)
);

-------------------------------------------------------------------------------
-- 10. NOTIFICATIONS
-------------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Recipient
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Triggering user (nullable for system alerts)
    type TEXT NOT NULL, -- e.g., 'like', 'comment', 'follow', 'system'
    reference_id UUID, -- Polymorphic ID (points to post, comment, etc.)
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 11. REPORTS
-------------------------------------------------------------------------------
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Retain report if user deletes account
    target_type TEXT NOT NULL, -- 'post', 'comment', 'profile', 'dm_message'
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 12. MODERATION ACTIONS
-------------------------------------------------------------------------------
-- Immutable audit log of all moderator actions
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL, -- 'profile', 'post', 'comment'
    target_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'suspend', 'restrict', 'delete_content', 'lock'
    reason TEXT NOT NULL,
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
