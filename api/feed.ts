// Stub for Global Feed API
// GET /api/feed/global

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
  // Simulating network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    data: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        author: {
          username: 'admin_vyre',
        },
        content: 'Welcome to the VYRE Beta. This is an early build showcasing the dark mode web app shell. Enjoy the global feed.',
        likes: 1337,
        comments: 42,
        createdAt: new Date().toISOString()
      },
      {
        id: '987e6543-e21b-12d3-a456-426614174111',
        author: {
          username: 'security_bot',
        },
        content: 'System notice: All data currently displayed is mocked. No actual database writing or authentication is strictly enforced yet.',
        likes: 0,
        comments: 1,
        createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: '555e7777-e89b-12d3-a456-426614174555',
        author: {
          username: 'early_adopter',
        },
        content: 'The typography looks sharp! Waiting for the full backend hookup to test posting with media.',
        imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop', // Generic retro tech image placeholder
        likes: 12,
        comments: 3,
        createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      }
    ]
  };
};
