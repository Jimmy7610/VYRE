import { supabase } from '../src/lib/supabase';
import { Post, SupabaseDevError, fetchUserLikes } from './feed';

export interface Profile {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: string;
    stats: {
        posts: number;
        likesReceived: number;
    };
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
    if (!supabase) return null;

    try {
        // 1. Fetch profile basic info
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, bio, avatar_url, created_at')
            .eq('username', username)
            .single();

        if (error || !profile) return null;

        // 2. Fetch stats (posts count, likes received)
        // Post count
        const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', profile.id)
            .is('deleted_at', null);

        // Likes received: count all likes on posts authored by this user
        // A more advanced query would join, but we can do a quick sum or two-step query
        const { data: myPosts } = await supabase
            .from('posts')
            .select('id')
            .eq('author_id', profile.id)
            .is('deleted_at', null);

        let likesReceived = 0;
        if (myPosts && myPosts.length > 0) {
            const postIds = myPosts.map(p => p.id);
            const { count: likesCount } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .in('post_id', postIds);
            likesReceived = likesCount ?? 0;
        }

        return {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
            createdAt: profile.created_at,
            stats: {
                posts: postsCount ?? 0,
                likesReceived
            }
        };
    } catch (err) {
        console.error('fetchProfileByUsername err:', err);
        return null;
    }
}

export async function fetchProfilePosts(userId: string, currentUserId?: string): Promise<Post[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('id, content, created_at, profiles(username, avatar_url), post_images(image_url), likes(count), comments(count)')
            .eq('author_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const posts: Post[] = (data || []).map((row: any) => ({
            id: row.id,
            author: {
                username: row.profiles?.username || 'Unknown',
                avatarUrl: row.profiles?.avatar_url
            },
            content: row.content,
            imageUrl: row.post_images?.[0]?.image_url || null,
            likes: row.likes?.[0]?.count ?? 0,
            comments: row.comments?.[0]?.count ?? 0,
            likedByMe: false,
            createdAt: row.created_at
        }));

        if (currentUserId && posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const likedPostIds = await fetchUserLikes(postIds, currentUserId);
            posts.forEach(p => {
                p.likedByMe = likedPostIds.has(p.id);
            });
        }

        return posts;
    } catch (err: any) {
        console.error('fetchProfilePosts err:', err);
        return [];
    }
}

export async function updateProfile(userId: string, data: {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
}): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                username: data.username,
                display_name: data.displayName,
                bio: data.bio,
                avatar_url: data.avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw { userMessage: 'Username is already taken' } as SupabaseDevError;
            }
            throw { userMessage: 'Failed to update profile', details: error.message } as SupabaseDevError;
        }

        // Also update raw_user_meta_data if possible (optional, but good for sync)
        // Note: requires updateUser which is often restricted to self or service role
        await supabase.auth.updateUser({
            data: {
                username: data.username,
                display_name: data.displayName
            }
        });

    } catch (err: any) {
        console.error('updateProfile error:', err);
        if (err.userMessage) throw err;
        throw { userMessage: 'An error occurred while saving', details: err.message };
    }
}

export async function uploadAvatar(file: File): Promise<string> {
    if (!supabase) throw new Error('Supabase not configured');
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const fileExt = file.name.split('.').pop();
        // Path: avatars/{userId}/timestamp.ext
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true
            });

        if (uploadError) {
            throw { userMessage: 'Failed to upload avatar', details: uploadError.message } as SupabaseDevError;
        }

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (err: any) {
        console.error('uploadAvatar error:', err);
        if (err.userMessage) throw err;
        throw { userMessage: 'Failed to upload avatar', details: String(err?.message || err) } as SupabaseDevError;
    }
}
