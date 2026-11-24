import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import config from '../utils/config';

/**
 * Connect to a room. `joined` is true only while the server has us in the room,
 * and becomes true again after every reconnect.
 */
const useSocket = (roomId, { onUnauthorized, onRemoved }) => {
    const [socket, setSocket] = useState(null);
    const [joined, setJoined] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    // Keep the latest callbacks without reconnecting when they change
    const callbacks = useRef({});
    callbacks.current = { onUnauthorized, onRemoved };

    useEffect(() => {
        const connection = io(config.socketUrl, {
            // WebSocket first: the server notices at once when a tab closes
            transports: ['websocket', 'polling'],
            tryAllTransports: true,
            // Read on every (re)connect so a fresh token is always used
            auth: (cb) => cb({ token: localStorage.getItem('token') }),
        });

        connection.on('connect', () => {
            connection.emit('join-room', { roomId }, (result) => {
                if (result.ok) setJoined(true);
                // Deleted or left while we were offline
                else if ([403, 404].includes(result.status)) callbacks.current.onRemoved(result.message);
                else console.error('Could not join room:', result.message);
            });
        });

        connection.on('disconnect', (reason) => {
            setJoined(false);
            setOnlineUsers([]);
            // The server closed us (expired login), so socket.io will not retry by itself
            if (reason === 'io server disconnect') connection.connect();
        });

        connection.on('connect_error', (error) => {
            if (error.message === 'Unauthorized') callbacks.current.onUnauthorized();
        });

        connection.on('presence', ({ users }) => setOnlineUsers(users));
        connection.on('room-deleted', () => callbacks.current.onRemoved('The host deleted this room'));
        connection.on('membership-ended', () => callbacks.current.onRemoved('You left this room in another tab'));
        connection.on('error', ({ event, message }) => console.error('Socket error:', event, message));

        // Leave at once when the tab closes or moves on; browsers may otherwise keep the
        // old page (and its connection) frozen, and others would still see us
        const handleHide = () => connection.disconnect();
        const handleShow = (event) => {
            if (event.persisted) connection.connect();
        };
        window.addEventListener('pagehide', handleHide);
        window.addEventListener('pageshow', handleShow);

        setSocket(connection);

        return () => {
            window.removeEventListener('pagehide', handleHide);
            window.removeEventListener('pageshow', handleShow);
            connection.disconnect();
            setSocket(null);
            setJoined(false);
        };
    }, [roomId]);

    return { socket, joined, onlineUsers };
};

export default useSocket;
