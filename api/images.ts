// Stub for Images API
// POST /api/images/sign-upload

export const requestUploadSignature = async (contentType: string, size: number) => {
    console.log('API STUB: requestUploadSignature called for:', contentType);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (size > 5 * 1024 * 1024) {
        throw new Error('Payload too large');
    }

    return {
        uploadUrl: 'https://mock.storage.vyre.local/upload?signed=true',
        imageId: crypto.randomUUID(),
        expiresIn: 300
    };
};
