import React, { useState, useMemo, useCallback, useRef } from 'react';
import useMediaStream from '../../hooks/useMediaStream';
import useScreenShare from '../../hooks/useScreenShare';
import useWebRTC from '../../hooks/useWebRTC';
import VideoTile from './VideoTile';
import CallControls from './CallControls';

const Notice = ({ children, action, onAction }) => (
  <div className="on-dark mx-3 mt-3 pl-3 bg-ink text-sheet border-l-4 border-lamp text-sm flex items-center justify-between gap-4" role="alert">
    <span className="py-2">{children}</span>
    <button type="button" onClick={onAction} className="min-h-[44px] px-3 font-semibold text-lamp hover:underline whitespace-nowrap">{action}</button>
  </div>
);

const VideoCall = ({ socket, joined, roomId, user, onLeave }) => {
  const { audioTrack, videoTrack, isMicOn, isCameraOn, error: deviceError, clearError, toggleMic, toggleCamera } = useMediaStream();
  const { screenTrack, isSupported: canShare, toggleScreenShare } = useScreenShare();
  const [soundBlocked, setSoundBlocked] = useState(false);
  const gridRef = useRef(null);

  const shownTrack = screenTrack || videoTrack;
  const media = { audio: isMicOn, video: isCameraOn, screen: !!screenTrack };

  const { peers, error: callError, retry } = useWebRTC({
    socket, joined, roomId, audioTrack, videoTrack: shownTrack, media,
  });

  const localStream = useMemo(() => (shownTrack ? new MediaStream([shownTrack]) : null), [shownTrack]);

  const handleAutoplayBlocked = useCallback(() => setSoundBlocked(true), []);
  const handleEnableSound = () => {
    gridRef.current.querySelectorAll('audio').forEach((audio) => audio.play().catch(() => {}));
    setSoundBlocked(false);
  };

  return (
    <div className="h-full flex flex-col bg-ink-deep text-sheet">
      {callError && <Notice action="Try again" onAction={retry}>{callError}</Notice>}
      {deviceError && <Notice action="Dismiss" onAction={clearError}>{deviceError} You can still see and hear others.</Notice>}
      {soundBlocked && <Notice action="Turn on sound" onAction={handleEnableSound}>Your browser paused the sound.</Notice>}

      <div
        ref={gridRef}
        className={`flex-1 min-h-0 grid grid-cols-1 auto-rows-fr gap-3 p-3 overflow-auto ${peers.length ? 'md:grid-cols-2' : ''} ${peers.length > 3 ? 'xl:grid-cols-3' : ''}`}
      >
        <VideoTile isLocal name={user.username} stream={localStream} media={media} />
        {peers.map((peer) => (
          <VideoTile
            key={peer.socketId}
            name={peer.username}
            stream={peer.stream}
            tracks={peer.tracks}
            media={peer.media}
            state={peer.state}
            peerConnection={peer.pc}
            isSpeaking={peer.speaking}
            onAutoplayBlocked={handleAutoplayBlocked}
          />
        ))}
      </div>

      <CallControls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isSharing={!!screenTrack}
        canShare={canShare}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleShare={toggleScreenShare}
        onLeave={onLeave}
      />
    </div>
  );
};

export default VideoCall;
