import { supabase } from '../src/lib/supabase';

// Global Feed API

export interface SupabaseDevError {
  userMessage: string;
  code?: string;
  details?: string;
}

export interface Post {
  id: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
  createdAt: string;
}

function getDemoFeed(): Post[] {
  return [
    {
      id: 'demo-001',
      author: { username: 'admin_vyre' },
      content: 'Welcome to the VYRE Beta. This is an early build showcasing the global feed experience. Security first, signal over noise.',
      likes: 1337,
      comments: 42,
      likedByMe: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-002',
      author: { username: 'security_bot' },
      content: 'System notice: You are viewing demo data. Connect your Supabase credentials to see real posts.',
      likes: 0,
      comments: 1,
      likedByMe: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'demo-003',
      author: { username: 'early_adopter' },
      content: 'The typography looks sharp. Waiting for the full backend hookup to test posting with media. This platform has potential.',
      likes: 12,
      comments: 3,
      likedByMe: false,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
}

export const getGlobalFeed = async (): Promise<{ data: Post[] }> => {
  if (!supabase) {
    console.warn('VYRE: No Supabase client. Returning demo feed.');
    return { data: getDemoFeed() };
  }
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, profiles(username, avatar_url), post_images(image_url), likes(count), comments(count)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('VYRE Supabase Error:', error.message);
      const devErr: SupabaseDevError = {
        userMessage: 'Failed to load feed',
        code: error.code,
        details: error.message + (error.hint ? ` | Hint: ${error.hint}` : '')
      };
      throw devErr;
    }

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
      likedByMe: false, // Populated separately by fetchUserLikes
      createdAt: row.created_at
    }));

    return { data: posts };
  } catch (err: any) {
    console.error('Failed to get global feed:', err);
    if (err.userMessage) throw err; // Already structured
    throw { userMessage: 'Failed to load feed', details: String(err?.message || err) } as SupabaseDevError;
  }
};

export const createPost = async (content: string, authorId: string, imageUrl?: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  try {
    // 1. Insert Post
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        content: content,
      })
      .select('id')
      .single();

    if (postError) {
      throw { userMessage: 'Failed to create post', code: postError.code, details: postError.message + (postError.hint ? ` | Hint: ${postError.hint}` : '') } as SupabaseDevError;
    }

    // 2. Insert Image if provided
    if (imageUrl && postData?.id) {
      const { error: imgError } = await supabase
        .from('post_images')
        .insert({
          post_id: postData.id,
          image_url: imageUrl,
        });

      if (imgError) {
        console.error('Failed to link image to post:', imgError.message);
      }
    }

    return postData.id;
  } catch (err: any) {
    console.error('Failed to create post:', err);
    if (err.userMessage) throw err;
    throw { userMessage: 'Failed to create post', details: String(err?.message || err) } as SupabaseDevError;
  }
};

export const uploadImage = async (file: File): Promise<string> => {
  if (!supabase) throw new Error('Supabase not configured');
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, file);

    if (uploadError) {
      throw { userMessage: 'Failed to upload image', code: (uploadError as any).statusCode, details: uploadError.message } as SupabaseDevError;
    }

    const { data } = supabase.storage
      .from('post_images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err: any) {
    console.error('Failed to upload image:', err);
    if (err.userMessage) throw err;
    throw { userMessage: 'Failed to upload image', details: String(err?.message || err) } as SupabaseDevError;
  }
};

// Fetch which posts the current user has liked
export async function fetchUserLikes(postIds: string[], userId: string): Promise<Set<string>> {
  if (!supabase || postIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (error) {
      console.error('Failed to fetch user likes:', error.message);
      return new Set();
    }
    return new Set((data || []).map((r: any) => r.post_id));
  } catch (err) {
    console.error('fetchUserLikes error:', err);
    return new Set();
  }
}

// Toggle like: returns { liked, newCount } or throws
export async function toggleLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<{ liked: boolean; count: number }> {
  if (!supabase) throw { userMessage: 'Supabase not configured' } as SupabaseDevError;

  if (currentlyLiked) {
    // Unlike: DELETE
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      throw { userMessage: 'Failed to unlike', code: error.code, details: error.message } as SupabaseDevError;
    }
  } else {
    // Like: INSERT (handle unique constraint conflict)
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: userId });

    if (error) {
      // 23505 = unique_violation — already liked, treat as success
      if (error.code === '23505') {
        console.warn('Like already exists (duplicate), treating as success');
      } else {
        throw { userMessage: 'Failed to like', code: error.code, details: error.message } as SupabaseDevError;
      }
    }
  }

  // Refetch count for this post
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  return { liked: !currentlyLiked, count: count ?? 0 };
}

// Debug: Check DB schema status
export async function checkSchemaStatus(): Promise<{ posts: string; profiles: string; bucket: string }> {
  const result = { posts: '❌ Not found', profiles: '❌ Not found', bucket: '❌ Not found' };

  if (!supabase) {
    return { posts: '⚠️ No client', profiles: '⚠️ No client', bucket: '⚠️ No client' };
  }

  try {
    const { count, error } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    result.posts = error ? `❌ ${error.code}: ${error.message}` : `✅ OK (${count ?? 0} rows)`;
  } catch (e: any) { result.posts = `❌ ${e.message}`; }

  try {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    result.profiles = error ? `❌ ${error.code}: ${error.message}` : `✅ OK (${count ?? 0} rows)`;
  } catch (e: any) { result.profiles = `❌ ${e.message}`; }

  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      result.bucket = `❌ ${error.message}`;
    } else {
      const found = data?.find((b: any) => b.name === 'post_images');
      result.bucket = found ? `✅ OK (public: ${found.public})` : '❌ Bucket "post_images" not found';
    }
  } catch (e: any) { result.bucket = `❌ ${e.message}`; }

  return result;
}
