import { useState, useEffect, useRef, useCallback } from 'react';
import { getScreenShareConstraints } from '../utils/deviceDetection';

/**
 * Screen sharing. Not available on phones.
 */
const useScreenShare = () => {
    const [screenTrack, setScreenTrack] = useState(null);
    const trackRef = useRef(null);
    const mounted = useRef(false);

    const stop = useCallback(() => {
        if (trackRef.current) {
            trackRef.current.onended = null;
            trackRef.current.stop(); // Also removes the browser's "sharing" bar
            trackRef.current = null;
        }
        if (mounted.current) setScreenTrack(null);
    }, []);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia(getScreenShareConstraints());
            const [track] = stream.getVideoTracks();
            if (!mounted.current) {
                track.stop();
                return;
            }
            stop();
            track.onended = stop; // Stopped from the browser's own bar
            trackRef.current = track;
            setScreenTrack(track);
        } catch (err) {
            // The user closed the picker
            if (err.name !== 'NotAllowedError') console.error('Screen share failed:', err);
        }
    }, [stop]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            stop();
        };
    }, [stop]);

    return {
        screenTrack,
        isSupported: !!navigator.mediaDevices?.getDisplayMedia && !!getScreenShareConstraints(),
        toggleScreenShare: () => (trackRef.current ? stop() : start()),
    };
};

export default useScreenShare;
