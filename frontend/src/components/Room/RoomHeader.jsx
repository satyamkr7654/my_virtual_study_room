import React from 'react';
import { ChevronDown, LogOut, Trash2 } from 'lucide-react';
import Lamp from '../common/Lamp';
import CopyCode from '../common/CopyCode';

const RoomHeader = ({ room, isHost, joined, onlineUsers, onLeave, onDelete }) => (
  <header className="on-dark bg-ink-deep text-sheet border-b border-ink-line px-3 sm:px-5 min-h-[64px] flex items-center gap-3">
    <Lamp lit={joined} dark className="w-9 h-9 shrink-0 hidden sm:block" />

    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4">
      <h1 className="text-lg sm:text-xl font-semibold truncate">{room.name}</h1>
      {isHost && <CopyCode code={room.code} className="text-sm text-lamp" />}
    </div>

    {joined ? (
      <details className="relative">
        <summary className="list-none cursor-pointer min-h-[44px] px-2 flex items-center gap-1 text-sm whitespace-nowrap rounded">
          <span role="status">{onlineUsers.length} online</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <ul className="absolute right-0 z-40 mt-1 w-52 max-h-72 overflow-auto bg-sheet text-ink border border-rule rounded py-1 text-sm">
          {onlineUsers.map(({ userId, username }) => (
            <li key={userId} className="px-4 py-2 truncate">
              {username}{userId === room.host?._id && <span className="text-ink-soft"> (host)</span>}
            </li>
          ))}
        </ul>
      </details>
    ) : (
      <span className="text-sm text-lamp whitespace-nowrap" role="status">Connecting...</span>
    )}

    {isHost && (
      <button type="button" onClick={onDelete} aria-label="Delete room" title="Delete room" className="w-11 h-11 inline-flex items-center justify-center rounded hover:bg-ink">
        <Trash2 size={18} aria-hidden="true" />
      </button>
    )}
    <button type="button" onClick={onLeave} className="btn border border-ink-line hover:bg-ink !px-3">
      <LogOut size={18} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Leave room</span>
    </button>
  </header>
);

export default RoomHeader;
