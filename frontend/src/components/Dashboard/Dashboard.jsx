import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import roomApi from '../../api/room.api';
import { getErrorMessage } from '../../api/errors';
import Wordmark from '../common/Wordmark';
import Field from '../common/Field';
import RoomRow from './RoomRow';

const REFRESH_INTERVAL = 30000;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(null); // null until loaded
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(''); // 'join' or 'create'

  const fetchRooms = useCallback(async () => {
    try {
      const { rooms: found } = await roomApi.getAll();
      setRooms(found);
      setLoadError('');
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Your rooms could not be loaded'));
    }
  }, []);

  // Keep the lamps current while the page is open
  useEffect(() => {
    fetchRooms();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRooms();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchRooms]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError('');
    setBusy('join');
    try {
      const { room } = await roomApi.join(code.trim());
      navigate(`/room/${room._id}`);
    } catch (error) {
      setJoinError(getErrorMessage(error, 'No room has this code'));
      setBusy('');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setBusy('create');
    try {
      const { room } = await roomApi.create(name.trim());
      navigate(`/room/${room.id}`);
    } catch (error) {
      setCreateError(getErrorMessage(error, 'The room could not be created'));
      setBusy('');
    }
  };

  const handleDelete = async (room) => {
    const sure = await confirm({
      title: `Delete ${room.name}?`,
      message: 'Its chat, files and notes are deleted for every member. This cannot be undone.',
      action: 'Delete room',
    });
    if (!sure) return;

    try {
      await roomApi.delete(room._id);
      setRooms((prev) => prev.filter((r) => r._id !== room._id));
      toast(`${room.name} was deleted`);
    } catch (error) {
      toast(getErrorMessage(error, 'The room could not be deleted'));
    }
  };

  const handleLeave = async (room) => {
    const sure = await confirm({
      title: `Leave ${room.name} for good?`,
      message: 'It goes from your list. You will need its code to join again. Your messages stay in the room.',
      action: 'Leave room',
    });
    if (!sure) return;

    try {
      await roomApi.leave(room._id);
      setRooms((prev) => prev.filter((r) => r._id !== room._id));
      toast(`You left ${room.name}`);
    } catch (error) {
      toast(getErrorMessage(error, 'You could not leave the room'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isHost = (room) => room.host?._id === user.id;
  const hosted = rooms?.filter(isHost) || [];
  const joined = rooms?.filter((room) => !isHost(room)) || [];

  const section = (title, list) => list.length > 0 && (
    <section className="mb-10 last:mb-0">
      <h2 className="text-sm font-sans font-semibold text-ink-soft border-b-2 border-ink pb-2">{title}</h2>
      <ul>
        {list.map((room) => (
          <RoomRow key={room._id} room={room} isHost={isHost(room)} onDelete={handleDelete} onLeave={handleLeave} />
        ))}
      </ul>
    </section>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-sheet">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[64px] flex items-center justify-between gap-4">
          <Wordmark />
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:block text-sm text-ink-soft truncate">{user.username}</span>
            <button type="button" onClick={handleLogout} className="icon-btn sm:w-auto sm:px-3 sm:gap-2 text-sm font-semibold">
              <LogOut size={18} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12 flex flex-col gap-10 lg:grid lg:grid-cols-[1fr_320px] lg:gap-16 lg:items-start">
        <div className="contents lg:block lg:order-2 lg:space-y-8">
          <form onSubmit={handleJoin} className="bg-ink text-sheet rounded p-5 on-dark">
            <label htmlFor="join-code" className="block font-serif text-xl font-semibold mb-3">Join with a code</label>
            <div className="flex gap-2">
              <input
                id="join-code"
                className="field !text-ink font-mono text-lg tracking-[0.3em] min-w-0"
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{6}"
                title="The 6-digit code from the host"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
              <button type="submit" className="btn bg-lamp text-ink-deep hover:brightness-95" disabled={busy === 'join'}>Join</button>
            </div>
            {joinError && <p className="mt-3 text-sm text-lamp" role="alert">{joinError}</p>}
          </form>

          <form onSubmit={handleCreate} className="order-3 lg:order-none space-y-3">
            <h2 className="text-xl font-semibold">Open a new room</h2>
            <Field
              label="Room name"
              placeholder="Organic chemistry, unit 3"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {createError && <p className="error-note" role="alert">{createError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy === 'create'}>
              {busy === 'create' ? 'Opening...' : 'Open room'}
            </button>
          </form>
        </div>

        <div className="order-2 lg:order-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-8">Your rooms</h1>

          {loadError && (
            <div className="error-note mb-6 flex items-center justify-between gap-4" role="alert">
              {loadError}
              <button type="button" onClick={fetchRooms} className="font-semibold underline min-h-[44px]">Try again</button>
            </div>
          )}

          {!rooms && !loadError && <p className="text-ink-soft" role="status">Loading your rooms</p>}

          {rooms?.length === 0 && (
            <p className="text-ink-soft max-w-prose border-t-2 border-ink pt-4">
              You have no rooms yet. Open one and share its code, or join a friend's room with theirs.
            </p>
          )}

          {section('Hosted by you', hosted)}
          {section('Joined', joined)}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
