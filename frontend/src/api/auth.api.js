import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Auth API Service
 */
export const authApi = {
    /**
     * Register a new user
     */
    register: async (username, email, password) => {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
            username,
            email,
            password,
        });
        return response.data.data;
    },

    /**
     * Login user
     */
    login: async (email, password) => {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
            email,
            password,
        });
        return response.data.data;
    },

    /**
     * Get current user
     */
    getMe: async () => {
        const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
        return response.data.data;
    },
};

export default authApi;
