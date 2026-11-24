import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import Lamp from '../common/Lamp';
import CopyCode from '../common/CopyCode';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const RoomRow = ({ room, isHost, onDelete, onLeave }) => (
  <li className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 py-3 border-b border-rule">
    <Lamp lit={room.online > 0} className="w-10 h-10 shrink-0" />

    <div className="flex-1 min-w-0">
      <Link
        to={`/room/${room._id}`}
        className="block font-serif text-lg leading-snug font-semibold break-words hover:underline underline-offset-4 py-1"
      >
        {room.name}
      </Link>
      <p className="text-sm text-ink-soft">
        {room.online > 0 ? <span className="text-ink font-medium">{room.online} inside now</span> : 'Nobody inside'}
        {' · '}{plural(room.participants?.length || 0, 'member')}
        {!isHost && ` · hosted by ${room.host?.username || 'a former member'}`}
      </p>
    </div>

    {!isHost && (
      <button type="button" className="icon-btn shrink-0" onClick={() => onLeave(room)} aria-label={`Leave ${room.name} for good`} title="Leave for good">
        <LogOut size={18} aria-hidden="true" />
      </button>
    )}

    {isHost && (
      <div className="flex items-center justify-between gap-1 shrink-0 basis-full sm:basis-auto pl-12 sm:pl-0">
        <CopyCode code={room.code} className="text-sm px-2" />
        <button type="button" className="icon-btn hover:!text-stop" onClick={() => onDelete(room)} aria-label={`Delete ${room.name}`}>
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    )}
  </li>
);

export default RoomRow;
