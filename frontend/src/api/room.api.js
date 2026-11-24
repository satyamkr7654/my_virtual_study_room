import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Room API Service
 */
export const roomApi = {
    /**
     * Create a new room
     */
    create: async (name) => {
        const response = await apiClient.post(API_ENDPOINTS.ROOMS.CREATE, { name });
        return response.data.data;
    },

    /**
     * Get all rooms
     */
    getAll: async () => {
        const response = await apiClient.get(API_ENDPOINTS.ROOMS.GET_ALL);
        return response.data.data;
    },

    /**
     * Get room by ID
     */
    getById: async (id) => {
        const response = await apiClient.get(API_ENDPOINTS.ROOMS.GET_BY_ID(id));
        return response.data.data;
    },

    /**
     * Join a room with its code
     */
    join: async (code) => {
        const response = await apiClient.post(API_ENDPOINTS.ROOMS.JOIN, { code });
        return response.data.data;
    },

    /**
     * Give up membership of a room
     */
    leave: async (id) => {
        const response = await apiClient.post(API_ENDPOINTS.ROOMS.LEAVE(id));
        return response.data.data;
    },

    /**
     * Delete room
     */
    delete: async (id) => {
        const response = await apiClient.delete(API_ENDPOINTS.ROOMS.DELETE(id));
        return response.data.data;
    },

    /**
     * Get a page of room messages, newest page first
     */
    getMessages: async (roomId, before) => {
        const response = await apiClient.get(API_ENDPOINTS.ROOMS.MESSAGES(roomId), { params: { before } });
        return response.data.data;
    },

    /**
     * Upload a file to a room
     */
    uploadFile: async (roomId, file) => {
        const form = new FormData();
        form.append('file', file);
        const response = await apiClient.post(API_ENDPOINTS.ROOMS.FILES(roomId), form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 0, // large files can take longer than the default
        });
        return response.data.data;
    },

    /**
     * Download a file shared in a room
     */
    downloadFile: async (roomId, fileId) => {
        const response = await apiClient.get(API_ENDPOINTS.ROOMS.FILE(roomId, fileId), {
            responseType: 'blob',
            timeout: 0,
        });
        return response.data;
    },
};

export default roomApi;
