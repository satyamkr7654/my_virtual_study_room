import React from 'react';
import useNetworkStatus from '../../hooks/useNetworkStatus';

/**
 * Tells the user when their own connection is the problem
 */
const NetworkIndicator = () => {
    const { isOnline, isSlowConnection } = useNetworkStatus();

    if (isOnline && !isSlowConnection) return null;

    return (
        <p role="status" className="fixed z-50 top-0 inset-x-0 bg-lamp text-ink-deep text-center text-sm font-medium px-4 py-1">
            {isOnline ? 'Slow connection. Video quality is reduced.' : 'You are offline. Waiting for a connection.'}
        </p>
    );
};

export default NetworkIndicator;
