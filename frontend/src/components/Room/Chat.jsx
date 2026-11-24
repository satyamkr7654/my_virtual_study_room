import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, Paperclip, SendHorizontal } from 'lucide-react';
import roomApi from '../../api/room.api';
import { getErrorMessage } from '../../api/errors';
import useChat from '../../hooks/useChat';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip';

const formatTime = (timestamp) => new Date(timestamp).toLocaleString([], {
  ...(new Date(timestamp).toDateString() !== new Date().toDateString() && { day: 'numeric', month: 'short' }),
  hour: '2-digit',
  minute: '2-digit',
});

const Chat = ({ socket, joined, roomId, user, visible }) => {
  const { messages, hasMore, error, sendMessage, retry, loadOlder } = useChat(socket, joined, roomId, user);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Follow new messages, but stay put when older ones are loaded above
  const last = messages[messages.length - 1];
  const lastKey = last?.clientId || last?.id;
  useEffect(() => {
    if (visible && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lastKey, visible]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content) return;
    sendMessage(content);
    setNewMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setFileError('');
    if (file.size > MAX_FILE_SIZE) {
      setFileError('File is larger than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const { file: saved } = await roomApi.uploadFile(roomId, file);
      sendMessage('', saved);
    } catch (err) {
      setFileError(getErrorMessage(err, 'Failed to upload file'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (message) => {
    setFileError('');
    try {
      const blob = await roomApi.downloadFile(roomId, message.fileId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setFileError(getErrorMessage(err, 'Failed to download file'));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-label="Messages">
        {hasMore && (
          <button type="button" onClick={loadOlder} className="block mx-auto min-h-[44px] text-sm font-semibold underline underline-offset-4">
            Load older messages
          </button>
        )}

        {messages.length === 0 && !error && (
          <p className="text-ink-soft text-sm">No messages yet. Everyone in the room can read what you write here.</p>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.userId === user.id;
          const isFollowUp = i > 0 && messages[i - 1].userId === msg.userId;
          return (
            <div key={msg.clientId || msg.id} className={`pl-3 border-l-2 ${isMine ? 'border-lamp' : 'border-rule'} ${isFollowUp ? 'pt-2' : 'mt-4 first:mt-0'}`}>
              {!isFollowUp && (
                <p className="text-sm flex items-baseline gap-2">
                  <span className="font-semibold truncate">{isMine ? 'You' : msg.username}</span>
                  <span className="text-xs text-ink-soft whitespace-nowrap">{formatTime(msg.timestamp)}</span>
                </p>
              )}
              {msg.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
              )}

              {msg.fileName && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <FileText size={18} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-all">{msg.fileName}</span>
                  {msg.fileId ? (
                    <button type="button" onClick={() => handleDownload(msg)} className="icon-btn shrink-0" aria-label={`Download ${msg.fileName}`}>
                      <Download size={18} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="text-xs text-ink-soft shrink-0">No longer available</span>
                  )}
                </div>
              )}

              {!msg.id && !msg.failed && <p className="text-xs text-ink-soft">Sending...</p>}
              {msg.failed && (
                <p className="text-sm text-stop">
                  Not sent: {msg.failed}.{' '}
                  <button type="button" onClick={() => retry(msg)} className="min-h-[44px] font-semibold underline">Retry</button>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-rule p-3">
        {(fileError || error) && <p className="error-note mb-2" role="alert">{fileError || error}</p>}
        {isUploading && <p className="text-sm text-ink-soft mb-2" role="status">Uploading file...</p>}
        <form onSubmit={handleSendMessage} className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="icon-btn shrink-0 disabled:opacity-50"
            disabled={isUploading}
            aria-label="Share a file"
            title="Share a file"
          >
            <Paperclip size={20} aria-hidden="true" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept={ACCEPT} onChange={handleFileUpload} />
          <input
            type="text"
            aria-label="Message"
            className="field flex-1 min-w-0"
            placeholder="Write a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={2000}
          />
          <button type="submit" disabled={!newMessage.trim()} className="btn-primary !px-3 ml-1" aria-label="Send">
            <SendHorizontal size={20} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
