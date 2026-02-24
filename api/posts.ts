// Stub for Post API
// POST /api/posts
// POST /api/posts/:id/like

export const createPost = async (content: string, imageId?: string) => {
    console.log('API STUB: createPost called with:', { content, imageId });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return a mock success response immediately.
    return {
        success: true,
        post: {
            id: crypto.randomUUID(),
            content,
            createdAt: new Date().toISOString()
        }
    };
};

export const likePost = async (postId: string) => {
    console.log(`API STUB: likePost called for post: ${postId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true };
};
