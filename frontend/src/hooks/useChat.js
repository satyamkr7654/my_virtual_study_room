import { useState, useEffect, useCallback } from 'react';
import roomApi from '../api/room.api';
import { getErrorMessage } from '../api/errors';

const SEND_TIMEOUT = 8000;

const newClientId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Add server messages, replacing our own pending copies of them
const merge = (current, incoming) => {
    const ids = new Set(incoming.map((m) => m.id));
    const clientIds = new Set(incoming.map((m) => m.clientId).filter(Boolean));
    const kept = current.filter((m) => !ids.has(m.id) && !(m.clientId && clientIds.has(m.clientId)));
    const saved = [...kept.filter((m) => m.id), ...incoming].sort((a, b) => (a.id < b.id ? -1 : 1));
    return [...saved, ...kept.filter((m) => !m.id)];
};

/**
 * Room chat: history, live messages, and sending with retry
 */
const useChat = (socket, joined, roomId, user) => {
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (before) => {
        try {
            const page = await roomApi.getMessages(roomId, before);
            setMessages((prev) => merge(prev, page.messages));
            setHasMore(page.hasMore);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, 'Could not load messages'));
        }
    }, [roomId]);

    useEffect(() => {
        if (!socket) return;
        const handleMessage = (message) => setMessages((prev) => merge(prev, [message]));
        socket.on('chat-message', handleMessage);
        return () => socket.off('chat-message', handleMessage);
    }, [socket]);

    // Runs again after a reconnect, to pick up anything missed
    useEffect(() => {
        if (joined) load();
    }, [joined, load]);

    const deliver = useCallback((message) => {
        const { clientId, content, fileId } = message;
        const fail = (reason) => setMessages((prev) => prev.map((m) => (
            m.clientId === clientId && !m.id ? { ...m, failed: reason } : m
        )));

        if (!socket?.connected || !joined) {
            fail('You are offline');
            return;
        }

        socket.timeout(SEND_TIMEOUT).emit(
            'chat-message',
            { roomId, content, clientId, ...(fileId && { fileId }) },
            (timedOut, result) => {
                if (timedOut) fail('No response from server');
                else if (!result.ok) fail(result.message);
                else setMessages((prev) => merge(prev, [result.data]));
            }
        );
    }, [socket, joined, roomId]);

    const sendMessage = useCallback((content, file) => {
        const message = {
            clientId: newClientId(),
            userId: user.id,
            username: user.username,
            content,
            fileId: file?.id || null,
            fileName: file?.name || null,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, message]);
        deliver(message);
    }, [deliver, user.id, user.username]);

    const retry = useCallback((message) => {
        setMessages((prev) => prev.map((m) => (m === message ? { ...m, failed: undefined } : m)));
        deliver(message);
    }, [deliver]);

    const loadOlder = useCallback(() => {
        const oldest = messages.find((m) => m.id);
        if (oldest) load(oldest.id);
    }, [messages, load]);

    return { messages, hasMore, error, sendMessage, retry, loadOlder };
};

export default useChat;
