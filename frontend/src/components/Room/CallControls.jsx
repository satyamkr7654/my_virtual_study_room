import React from 'react';
import { Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Video, VideoOff } from 'lucide-react';

const Control = ({ icon: Icon, label, onClick, tone = 'plain' }) => {
  const tones = {
    plain: 'text-sheet hover:bg-ink',
    off: 'bg-sheet text-ink-deep',
    active: 'bg-lamp text-ink-deep',
    leave: 'bg-stop text-white hover:brightness-110',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[48px] px-2 sm:px-4 rounded text-xs sm:text-sm font-semibold ${tones[tone]}`}
    >
      <Icon size={20} aria-hidden="true" />
      {label}
    </button>
  );
};

const CallControls = ({
  isMicOn, isCameraOn, isSharing, canShare, onToggleMic, onToggleCamera, onToggleShare, onLeave,
}) => (
  <div className="on-dark flex justify-center gap-1 sm:gap-2 p-2 sm:p-3 border-t border-ink-line">
    <Control
      icon={isMicOn ? Mic : MicOff}
      label={isMicOn ? 'Mute' : 'Unmute'}
      tone={isMicOn ? 'plain' : 'off'}
      onClick={onToggleMic}
    />
    <Control
      icon={isCameraOn ? Video : VideoOff}
      label={isCameraOn ? 'Stop camera' : 'Start camera'}
      tone={isCameraOn ? 'plain' : 'off'}
      onClick={onToggleCamera}
    />
    {canShare && (
      <Control
        icon={isSharing ? MonitorX : MonitorUp}
        label={isSharing ? 'Stop sharing' : 'Share screen'}
        tone={isSharing ? 'active' : 'plain'}
        onClick={onToggleShare}
      />
    )}
    <Control icon={PhoneOff} label="Leave call" tone="leave" onClick={onLeave} />
  </div>
);

export default CallControls;
