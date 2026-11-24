// Endpoint constants already include /api, so accept the URL with or without it.
export const toBaseUrl = (url) => url.replace(/\/+$/, '').replace(/\/api$/, '');

const split = (value) => (value || '').split(',').map((url) => url.trim()).filter(Boolean);
const turnUrls = split(import.meta.env.REACT_APP_TURN_URLS);

/**
 * Application configuration
 */
export const config = {
    // API endpoints
    apiUrl: toBaseUrl(import.meta.env.REACT_APP_API_URL || 'http://localhost:5000'),
    socketUrl: import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',

    // WebRTC
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Relays calls on networks that block direct connections
        ...(turnUrls.length ? [{
            urls: turnUrls,
            username: import.meta.env.REACT_APP_TURN_USERNAME,
            credential: import.meta.env.REACT_APP_TURN_CREDENTIAL,
        }] : []),
    ],
};

export default config;
