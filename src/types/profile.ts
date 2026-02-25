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
