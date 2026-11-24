import { useState, useEffect } from 'react';
import { detectNetwork } from '../utils/deviceDetection';

/**
 * Hook to monitor network status and connection quality
 */
const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [networkInfo, setNetworkInfo] = useState(detectNetwork());

    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOnline(navigator.onLine);
            setNetworkInfo(detectNetwork());
        };

        const handleConnectionChange = () => {
            setNetworkInfo(detectNetwork());
        };

        // Online/offline events
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Network quality changes
        const connection = navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        if (connection) {
            connection.addEventListener('change', handleConnectionChange);
        }

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
            if (connection) {
                connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    return {
        isOnline,
        ...networkInfo,
    };
};

export default useNetworkStatus;
