import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, NotebookPen, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import roomApi from '../../api/room.api';
import { getErrorMessage } from '../../api/errors';
import useSocket from '../../hooks/useSocket';
import LoadingSpinner from '../common/LoadingSpinner';
import RoomHeader from './RoomHeader';
import VideoCall from './VideoCall';
import Chat from './Chat';
import DocumentEditor from './DocumentEditor';

const Tab = ({ icon: Icon, label, selected, unread, onClick, className = '' }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 text-sm font-semibold border-b-2 ${selected ? 'border-lamp bg-sheet text-ink' : 'border-rule bg-paper text-ink-soft hover:text-ink'} ${className}`}
  >
    <Icon size={18} aria-hidden="true" />
    {label}
    {unread && <span className="w-2 h-2 rounded-full bg-stop" role="img" aria-label="New messages" />}
  </button>
);

const StudyRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast, confirm } = useFeedback();
  const [room, setRoom] = useState(null);
  // On phones one view fills the screen; on desktop 'video' means the panel shows chat
  const [view, setView] = useState('video');
  const [unread, setUnread] = useState(false);

  const { socket, joined, onlineUsers } = useSocket(id, {
    onUnauthorized: () => {
      logout();
      navigate('/login');
    },
    onRemoved: (reason) => {
      toast(reason);
      navigate('/dashboard');
    },
  });

  const fetchRoom = useCallback(async () => {
    try {
      setRoom((await roomApi.getById(id)).room);
    } catch (error) {
      toast(getErrorMessage(error, 'This room could not be opened'));
      navigate('/dashboard');
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Mark the chat tab when a message arrives while chat is out of sight
  useEffect(() => {
    if (!socket) return;
    const handleMessage = ({ userId }) => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      const chatVisible = view === 'chat' || (desktop && view === 'video');
      if (!chatVisible && userId !== user.id) setUnread(true);
    };
    socket.on('chat-message', handleMessage);
    return () => socket.off('chat-message', handleMessage);
  }, [socket, view, user.id]);

  const show = (next) => {
    setView(next);
    if (next === 'chat') setUnread(false);
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit('leave-room', { roomId: id });
      socket.disconnect();
    }
    navigate('/dashboard');
  };

  const handleDelete = async () => {
    const sure = await confirm({
      title: `Delete ${room.name}?`,
      message: 'Its chat, files and notes are deleted for every member. This cannot be undone.',
      action: 'Delete room',
    });
    if (!sure) return;

    try {
      // We delete it ourselves, so skip the "host deleted" notice
      socket?.off('room-deleted');
      await roomApi.delete(id);
      socket?.disconnect();
      navigate('/dashboard');
    } catch (error) {
      toast(getErrorMessage(error, 'The room could not be deleted'));
    }
  };

  if (!room) return <LoadingSpinner text="Opening the room" />;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-ink-deep">
      <RoomHeader
        room={room}
        isHost={room.host?._id === user.id}
        joined={joined}
        onlineUsers={onlineUsers}
        onLeave={handleLeave}
        onDelete={handleDelete}
      />

      <nav className="lg:hidden flex" aria-label="Room views">
        <Tab icon={Video} label="Video" selected={view === 'video'} onClick={() => show('video')} />
        <Tab icon={MessageSquare} label="Chat" selected={view === 'chat'} unread={unread} onClick={() => show('chat')} />
        <Tab icon={NotebookPen} label="Notes" selected={view === 'document'} onClick={() => show('document')} />
      </nav>

      <div className="flex-1 min-h-0 flex relative">
        {/* Always mounted, so the call goes on behind chat and notes */}
        <main className={`absolute inset-0 lg:static lg:flex-1 lg:min-w-0 lg:visible ${view === 'video' ? '' : 'invisible'}`}>
          <VideoCall socket={socket} joined={joined} roomId={id} user={user} onLeave={handleLeave} />
        </main>

        <aside
          className={`absolute inset-0 z-20 flex-col bg-sheet lg:static lg:flex lg:w-[380px] ${view === 'video' ? 'hidden' : 'flex'}`}
          aria-label="Chat and notes"
        >
          <div className="hidden lg:flex">
            <Tab icon={MessageSquare} label="Chat" selected={view !== 'document'} unread={unread} onClick={() => show('chat')} />
            <Tab icon={NotebookPen} label="Notes" selected={view === 'document'} onClick={() => show('document')} />
          </div>
          <div className={`flex-1 min-h-0 ${view === 'document' ? 'hidden' : ''}`}>
            <Chat socket={socket} joined={joined} roomId={id} user={user} visible={view} />
          </div>
          <div className={`flex-1 min-h-0 ${view === 'document' ? '' : 'hidden'}`}>
            <DocumentEditor socket={socket} joined={joined} roomId={id} roomName={room.name} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StudyRoom;
