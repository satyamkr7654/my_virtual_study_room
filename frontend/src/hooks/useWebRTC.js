import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../utils/config';

const MAX_RESTARTS = 3;
const SPEAKING_LEVEL = 0.02;
const SPEAKING_HOLD = 1000; // ms, so the highlight does not flicker between words

/**
 * Video call with everyone else in the room.
 *
 * Whoever joins last calls the people already there, so two sides never call each
 * other at once. Every connection is set up for audio and video from the start;
 * turning a device on, off or sharing a screen only swaps the track being sent.
 */
const useWebRTC = ({ socket, joined, roomId, audioTrack, videoTrack, media }) => {
    const [peers, setPeers] = useState(new Map()); // socketId -> what to show
    const [inCall, setInCall] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    const links = useRef(new Map()); // socketId -> connection
    const outgoing = useRef({});
    outgoing.current = { audio: audioTrack, video: videoTrack };

    const patch = useCallback((socketId, changes) => {
        setPeers((prev) => (
            prev.has(socketId) ? new Map(prev).set(socketId, { ...prev.get(socketId), ...changes }) : prev
        ));
    }, []);

    const sendTracks = useCallback(({ pc }) => Promise.all(
        pc.getTransceivers().map(({ sender, receiver }) => {
            const track = outgoing.current[receiver.track.kind] || null;
            return sender.track === track ? null : sender.replaceTrack(track);
        })
    ), []);

    useEffect(() => {
        if (!socket || !joined) return;

        let active = true;
        const open = links.current;

        // Steps for one connection run one after another
        const enqueue = (link, step) => {
            link.queue = link.queue
                .then(() => (link.pc.signalingState === 'closed' ? null : step()))
                .catch((err) => {
                    // Closing a connection interrupts its current step
                    if (link.pc.signalingState !== 'closed') console.error('Call setup failed:', err);
                });
        };

        const sendOffer = (link, options) => enqueue(link, async () => {
            await sendTracks(link);
            await link.pc.setLocalDescription(await link.pc.createOffer(options));
            socket.emit('video-offer', { to: link.socketId, offer: link.pc.localDescription.toJSON() });
        });

        const connect = (socketId, isCaller) => {
            const pc = new RTCPeerConnection({ iceServers: config.iceServers });
            const stream = new MediaStream();
            const link = { socketId, pc, stream, isCaller, candidates: [], queue: Promise.resolve(), restarts: 0 };
            open.set(socketId, link);

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) socket.emit('ice-candidate', { to: socketId, candidate: candidate.toJSON() });
            };
            pc.ontrack = ({ track }) => {
                stream.addTrack(track);
                patch(socketId, { tracks: stream.getTracks().length });
            };
            pc.onconnectionstatechange = () => {
                patch(socketId, { state: pc.connectionState });
                if (pc.connectionState === 'connected') link.restarts = 0;
                if (pc.connectionState === 'failed' && isCaller && link.restarts < MAX_RESTARTS) {
                    link.restarts += 1;
                    sendOffer(link, { iceRestart: true });
                }
            };

            patch(socketId, { pc, stream });
            if (isCaller) {
                pc.addTransceiver('audio', { direction: 'sendrecv' });
                pc.addTransceiver('video', { direction: 'sendrecv' });
                sendOffer(link);
            }
            return link;
        };

        const applyRemote = async (link, description) => {
            await link.pc.setRemoteDescription(description);
            for (const candidate of link.candidates.splice(0)) {
                await link.pc.addIceCandidate(candidate);
            }
        };

        const addPeer = ({ socketId, username, media: peerMedia }) => setPeers((prev) => new Map(prev).set(socketId, {
            socketId, username, media: peerMedia, state: 'new', tracks: 0, speaking: false,
        }));

        const removePeer = ({ socketId }) => {
            open.get(socketId)?.pc.close();
            open.delete(socketId);
            setPeers((prev) => {
                const next = new Map(prev);
                next.delete(socketId);
                return next;
            });
        };

        const handlers = {
            'call-joined': addPeer,
            'call-left': removePeer,
            'media-state': ({ socketId, media: peerMedia }) => patch(socketId, { media: peerMedia }),
            'video-offer': ({ from, offer }) => {
                const link = open.get(from) || connect(from, false);
                enqueue(link, async () => {
                    await applyRemote(link, offer);
                    link.pc.getTransceivers().forEach((transceiver) => { transceiver.direction = 'sendrecv'; });
                    await sendTracks(link);
                    await link.pc.setLocalDescription(await link.pc.createAnswer());
                    socket.emit('video-answer', { to: from, answer: link.pc.localDescription.toJSON() });
                });
            },
            'video-answer': ({ from, answer }) => {
                const link = open.get(from);
                if (link) enqueue(link, () => applyRemote(link, answer));
            },
            'ice-candidate': ({ from, candidate }) => {
                const link = open.get(from);
                if (link) {
                    enqueue(link, () => (
                        link.pc.remoteDescription ? link.pc.addIceCandidate(candidate) : link.candidates.push(candidate)
                    ));
                }
            },
        };
        Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

        // Only now can we receive signals, so only now do we join
        socket.emit('join-call', { roomId }, (result) => {
            if (!active) return;
            if (!result.ok) {
                setError(result.message);
                return;
            }
            setError('');
            result.data.participants.forEach((peer) => {
                addPeer(peer);
                connect(peer.socketId, true);
            });
            setInCall(true);
        });

        const checkSpeaking = async (link) => {
            const receiver = link.pc.getReceivers().find((r) => r.track.kind === 'audio');
            if (!receiver) return;
            let level = 0;
            (await receiver.getStats()).forEach((report) => {
                if (report.type === 'inbound-rtp') level = report.audioLevel || 0;
            });
            if (!active) return;

            if (level > SPEAKING_LEVEL) link.lastHeard = Date.now();
            const speaking = Date.now() - (link.lastHeard || 0) < SPEAKING_HOLD;
            if (speaking !== link.speaking) {
                link.speaking = speaking;
                patch(link.socketId, { speaking });
            }
        };
        const speakingTimer = setInterval(() => {
            open.forEach((link) => checkSpeaking(link).catch(() => {})); // Connection just closed
        }, 250);

        return () => {
            active = false;
            clearInterval(speakingTimer);
            Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
            if (socket.connected) socket.emit('leave-call', {});
            open.forEach(({ pc }) => pc.close());
            open.clear();
            setPeers(new Map());
            setInCall(false);
        };
    }, [socket, joined, roomId, attempt, patch, sendTracks]);

    // Device turned on or off, or screen shared: swap the track everywhere
    useEffect(() => {
        links.current.forEach((link) => {
            sendTracks(link).catch((err) => console.error('Could not switch track:', err));
        });
    }, [audioTrack, videoTrack, sendTracks]);

    const { audio, video, screen } = media;
    useEffect(() => {
        if (socket && inCall) socket.emit('media-state', { audio, video, screen });
    }, [socket, inCall, audio, video, screen]);

    return {
        peers: [...peers.values()],
        error,
        retry: () => setAttempt((n) => n + 1),
    };
};

export default useWebRTC;
