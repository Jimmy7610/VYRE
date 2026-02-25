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
