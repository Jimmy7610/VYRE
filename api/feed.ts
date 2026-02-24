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

export const getGlobalFeed = async (): Promise<{ data: Post[] }> => {
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
