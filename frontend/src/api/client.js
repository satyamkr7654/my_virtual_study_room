import axios from 'axios';
import config from '../utils/config';

/**
 * Create axios instance with default config
 */
const apiClient = axios.create({
    baseURL: config.apiUrl,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor - Add auth token
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response interceptor - Handle errors
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 - Token expired/invalid
        if (error.response?.status === 401) {
            console.log('🔒 Authentication failed - clearing tokens');
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Only redirect if not on auth pages
            if (!['/login', '/signup'].includes(window.location.pathname)) {
                window.location.href = '/login';
            }
        }

        // Handle 429 - Rate limited
        if (error.response?.status === 429) {
            console.warn('⚠️ Rate limit exceeded');
        }

        return Promise.reject(error);
    }
);

export default apiClient;
