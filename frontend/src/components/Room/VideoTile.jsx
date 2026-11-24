import React, { useEffect, useRef } from 'react';
import { MicOff } from 'lucide-react';
import ConnectionQualityBadge from '../common/ConnectionQualityBadge';

const STATES = {
  new: 'Connecting...',
  connecting: 'Connecting...',
  disconnected: 'Reconnecting...',
  failed: 'Connection lost',
};

/**
 * One person in the call
 */
const VideoTile = ({
  name, stream, tracks, media, isLocal = false, isSpeaking = false, state, peerConnection, onAutoplayBlocked,
}) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const showVideo = media.video || media.screen;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play().catch(() => {}); // Muted, so never blocked; only interrupted by a newer call
  }, [stream, tracks]);

  // Sound has its own element: a video element stays silent until its first frame,
  // so people without a camera would never be heard
  useEffect(() => {
    const audio = audioRef.current;
    const audioTracks = stream?.getAudioTracks() || [];
    if (!audio || !audioTracks.length) return;
    audio.srcObject = new MediaStream(audioTracks);
    audio.play().catch((err) => {
      if (err.name === 'NotAllowedError' && onAutoplayBlocked) onAutoplayBlocked();
    });
  }, [stream, tracks, onAutoplayBlocked]);

  return (
    <div
      data-tile={name}
      className={`relative min-h-[160px] bg-ink rounded overflow-hidden outline outline-offset-[-3px] outline-[3px] ${media.screen ? 'col-span-full' : ''} ${isSpeaking ? 'outline-lamp' : 'outline-transparent'}`}
    >
      {/* Also seen behind the video until its first frame arrives */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-7xl text-sheet/90" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full ${showVideo ? '' : 'invisible'} ${media.screen ? 'object-contain' : 'object-cover'} ${isLocal && !media.screen ? 'transform scale-x-[-1]' : ''}`}
      />

      {!isLocal && <audio ref={audioRef} autoPlay />}

      {STATES[state] && (
        <p className="absolute top-3 right-3 bg-ink-deep px-2 py-1 rounded-sm text-sm" role="status">{STATES[state]}</p>
      )}
      {state === 'connected' && peerConnection && (
        <div className="absolute top-3 right-3 bg-ink-deep px-2 pt-1 rounded-sm">
          <ConnectionQualityBadge peerConnection={peerConnection} />
        </div>
      )}

      <p className="absolute bottom-3 left-3 bg-ink-deep px-2 py-1 rounded-sm text-sm text-sheet flex items-center gap-1.5">
        {!media.audio && <MicOff size={14} aria-hidden="true" />}
        <span>
          {isLocal ? 'You' : name}
          {media.screen && ' (screen)'}
          {!media.audio && <span className="sr-only"> muted</span>}
        </span>
      </p>
    </div>
  );
};

export default VideoTile;
