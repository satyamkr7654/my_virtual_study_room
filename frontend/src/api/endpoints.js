/**
 * API endpoint constants
 */
export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        ME: '/api/auth/me',
    },

    // Room endpoints
    ROOMS: {
        CREATE: '/api/rooms',
        GET_ALL: '/api/rooms',
        GET_BY_ID: (id) => `/api/rooms/${id}`,
        JOIN: '/api/rooms/join',
        DELETE: (id) => `/api/rooms/${id}`,
        LEAVE: (id) => `/api/rooms/${id}/leave`,
        MESSAGES: (roomId) => `/api/rooms/${roomId}/messages`,
        FILES: (roomId) => `/api/rooms/${roomId}/files`,
        FILE: (roomId, fileId) => `/api/rooms/${roomId}/files/${fileId}`,
    },

    // Health check
    HEALTH: '/api/health',
};

export default API_ENDPOINTS;
