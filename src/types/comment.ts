export interface Comment {
    id: string;
    postId: string;
    author: {
        username: string;
        avatarUrl?: string;
    };
    content: string;
    createdAt: string;
}
