import { supabase } from '../src/lib/supabase';

// Global Feed API

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
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-002',
      author: { username: 'security_bot' },
      content: 'System notice: You are viewing demo data. Connect your Supabase credentials to see real posts.',
      likes: 0,
      comments: 1,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'demo-003',
      author: { username: 'early_adopter' },
      content: 'The typography looks sharp. Waiting for the full backend hookup to test posting with media. This platform has potential.',
      likes: 12,
      comments: 3,
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
      .select('id, content, image_url, likes, comments, created_at, profiles(username, avatar_url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('VYRE Supabase Error:', error.message);
      throw error;
    }

    const posts: Post[] = (data || []).map((row: any) => ({
      id: row.id,
      author: {
        username: row.profiles?.username || 'Unknown',
        avatarUrl: row.profiles?.avatar_url
      },
      content: row.content,
      imageUrl: row.image_url,
      likes: row.likes || 0,
      comments: row.comments || 0,
      createdAt: row.created_at
    }));

    return { data: posts };
  } catch (err) {
    console.error('Failed to get global feed:', err);
    throw err;
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

    if (postError) throw postError;

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
        // We still return true because the post succeeded, but the image link failed.
        // In a strict environment we'd rollback.
      }
    }

    return postData.id;
  } catch (err) {
    console.error('Failed to create post:', err);
    throw err;
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

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('post_images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Failed to upload image:', err);
    throw err;
  }
};
