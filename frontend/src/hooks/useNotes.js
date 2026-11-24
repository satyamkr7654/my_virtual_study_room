import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';

const SEND_TIMEOUT = 8000;
const REMOTE = 'remote';

const isHighSurrogate = (text, i) => /[\uD800-\uDBFF]/.test(text[i] || '');
const isLowSurrogate = (text, i) => /[\uDC00-\uDFFF]/.test(text[i] || '');

/**
 * The single change that turns one text into the other, never splitting an emoji
 */
export const diffText = (before, after) => {
    const shortest = Math.min(before.length, after.length);
    let start = 0;
    while (start < shortest && before[start] === after[start]) start++;
    if (start > 0 && isHighSurrogate(before, start - 1)) start--;

    let end = 0;
    while (end < shortest - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
    if (end > 0 && isLowSurrogate(before, before.length - end)) end--;

    return {
        index: start,
        remove: before.length - start - end,
        insert: after.slice(start, after.length - end),
    };
};

/**
 * Shared notes. Edits are merged by Yjs, so simultaneous typing is never lost.
 */
const useNotes = (socket, joined, roomId, textareaRef) => {
    const [content, setContent] = useState('');
    const [ready, setReady] = useState(false); // Loaded at least once
    const [synced, setSynced] = useState(false);
    const [pending, setPending] = useState(0);
    const [error, setError] = useState('');

    const docRef = useRef(null);
    const selection = useRef(null); // Cursor to restore after someone else's edit

    // One document per room
    useEffect(() => {
        const doc = new Y.Doc();
        const text = doc.getText('notes');
        docRef.current = doc;
        text.observe(() => setContent(text.toString()));

        return () => {
            doc.destroy();
            docRef.current = null;
            setContent('');
            setReady(false);
        };
    }, [roomId]);

    useEffect(() => {
        const doc = docRef.current;
        if (!socket || !joined || !doc) return;

        let active = true;
        const text = doc.getText('notes');

        const send = (update) => {
            setPending((n) => n + 1);
            socket.timeout(SEND_TIMEOUT).emit('notes-update', { roomId, update }, (timedOut, result) => {
                setPending((n) => n - 1);
                if (!active) return;
                if (timedOut) setError('Changes not saved yet');
                else setError(result.ok ? '' : result.message);
            });
        };

        const applyRemote = (update) => {
            // Remember where the cursor is in the text, not just its number
            const area = textareaRef.current;
            const focused = area && document.activeElement === area;
            const at = focused && [area.selectionStart, area.selectionEnd]
                .map((i) => Y.createRelativePositionFromTypeIndex(text, i));

            Y.applyUpdate(doc, new Uint8Array(update), REMOTE);

            if (at) {
                selection.current = at.map((p) => Y.createAbsolutePositionFromRelativePosition(p, doc)?.index ?? 0);
            }
        };

        const handleUpdate = ({ update }) => applyRemote(update);
        const handleLocal = (update, origin) => {
            if (origin !== REMOTE) send(update);
        };

        socket.on('notes-update', handleUpdate);
        doc.on('update', handleLocal);

        socket.timeout(SEND_TIMEOUT).emit('notes-open', { roomId }, (timedOut, result) => {
            if (!active) return;
            if (timedOut || !result.ok) {
                setError(result?.message || 'Could not load notes');
                return;
            }
            const state = new Uint8Array(result.data.state);
            applyRemote(state);

            // Send anything typed while we were disconnected
            const missing = Y.encodeStateAsUpdate(doc, Y.encodeStateVectorFromUpdate(state));
            if (missing.length > 2) send(missing);

            setError('');
            setReady(true);
            setSynced(true);
        });

        return () => {
            active = false;
            setSynced(false);
            socket.off('notes-update', handleUpdate);
            doc.off('update', handleLocal);
        };
    }, [socket, joined, roomId, textareaRef]);

    useLayoutEffect(() => {
        if (selection.current && textareaRef.current) {
            textareaRef.current.setSelectionRange(...selection.current);
            selection.current = null;
        }
    }, [content, textareaRef]);

    const edit = useCallback((next) => {
        const doc = docRef.current;
        if (!doc) return;
        const text = doc.getText('notes');
        const { index, remove, insert } = diffText(text.toString(), next);

        doc.transact(() => {
            if (remove) text.delete(index, remove);
            if (insert) text.insert(index, insert);
        });
    }, []);

    const status = error || (!ready && 'Loading...') || (!synced && 'Offline - will sync')
        || (pending ? 'Saving...' : 'Saved');

    return { content, edit, ready, status };
};

export default useNotes;
