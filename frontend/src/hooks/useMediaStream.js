import { useState, useEffect, useRef, useCallback } from 'react';
import { getOptimalMediaConstraints } from '../utils/deviceDetection';

const REASONS = {
    NotAllowedError: 'permission was denied',
    NotFoundError: 'no device was found',
    NotReadableError: 'it is in use by another application',
};
const explain = (err) => REASONS[err?.name] || 'it could not be started';

/**
 * Microphone and camera. Either may be missing; the call works without them.
 * Turning the camera off releases it, so its light goes out.
 */
const useMediaStream = () => {
    const [audioTrack, setAudioTrack] = useState(null);
    const [videoTrack, setVideoTrack] = useState(null);
    const [isMicOn, setIsMicOn] = useState(false);
    const [error, setError] = useState('');

    const mounted = useRef(false);
    const tracks = useRef({ audio: null, video: null });
    const busy = useRef(false); // Waiting for the browser's permission prompt

    const setTrack = useCallback((kind, track) => {
        // Left the room while the permission prompt was open
        if (track && !mounted.current) {
            track.stop();
            return;
        }
        const previous = tracks.current[kind];
        if (previous && previous !== track) {
            previous.onended = null;
            previous.stop();
        }
        tracks.current[kind] = track;
        if (track) {
            // Device unplugged or permission withdrawn
            track.onended = () => {
                setTrack(kind, null);
                if (mounted.current) setError(`Your ${kind === 'audio' ? 'microphone' : 'camera'} stopped.`);
            };
        }
        if (!mounted.current) return;
        if (kind === 'audio') {
            setAudioTrack(track);
            setIsMicOn(!!track);
        } else {
            setVideoTrack(track);
        }
    }, []);

    const acquire = useCallback(async (kinds) => {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('unsupported');
        }
        const constraints = getOptimalMediaConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(
            Object.fromEntries(kinds.map((kind) => [kind, constraints[kind]]))
        );
        stream.getTracks().forEach((track) => setTrack(track.kind, track));
    }, [setTrack]);

    useEffect(() => {
        mounted.current = true;

        const start = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('Microphone and camera need a secure (https) page and a supported browser.');
                return;
            }
            busy.current = true;
            try {
                await acquire(['audio', 'video']);
            } catch (both) {
                // One may be missing or blocked, so try each alone
                const problems = [];
                for (const [kind, label] of [['audio', 'Microphone'], ['video', 'Camera']]) {
                    if (!mounted.current) return;
                    try {
                        await acquire([kind]);
                    } catch (err) {
                        problems.push(`${label}: ${explain(err)}.`);
                    }
                }
                if (mounted.current) setError(problems.join(' '));
            } finally {
                busy.current = false;
            }
        };
        start();

        return () => {
            mounted.current = false;
            setTrack('audio', null);
            setTrack('video', null);
        };
    }, [acquire, setTrack]);

    const turnOn = useCallback(async (kind, label) => {
        if (busy.current) return;
        busy.current = true;
        try {
            await acquire([kind]);
            if (mounted.current) setError('');
        } catch (err) {
            if (mounted.current) setError(`${label}: ${explain(err)}.`);
        } finally {
            busy.current = false;
        }
    }, [acquire]);

    const toggleMic = useCallback(() => {
        const track = tracks.current.audio;
        if (!track) {
            turnOn('audio', 'Microphone');
            return;
        }
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
    }, [turnOn]);

    const toggleCamera = useCallback(() => {
        if (tracks.current.video) setTrack('video', null);
        else turnOn('video', 'Camera');
    }, [setTrack, turnOn]);

    return {
        audioTrack,
        videoTrack,
        isMicOn,
        isCameraOn: !!videoTrack,
        error,
        clearError: () => setError(''),
        toggleMic,
        toggleCamera,
    };
};

export default useMediaStream;
