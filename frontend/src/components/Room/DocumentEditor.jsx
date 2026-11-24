import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import useNotes from '../../hooks/useNotes';
import { printNotes } from '../../utils/printNotes';

const MAX_LENGTH = 50000;

const DocumentEditor = ({ socket, joined, roomId, roomName }) => {
  const textareaRef = useRef(null);
  const { content, edit, ready, status } = useNotes(socket, joined, roomId, textareaRef);

  return (
    <div className="h-full flex flex-col">
      <div className="pl-4 pr-2 min-h-[48px] flex items-center justify-between gap-3 border-b border-rule">
        <p className="text-sm text-ink-soft" role="status">{status}</p>
        <button type="button" onClick={() => printNotes(`${roomName} notes`, content)} disabled={!content} className="inline-flex items-center gap-2 px-2 min-h-[44px] text-sm font-semibold hover:underline disabled:opacity-50" title="Print, or choose Save as PDF">
          <Printer size={18} aria-hidden="true" />
          Print or PDF
        </button>
      </div>

      <textarea
        ref={textareaRef}
        aria-label="Shared notes"
        className="notes-page flex-1 w-full px-4 resize-none bg-transparent font-serif text-base !leading-8 focus-visible:outline-offset-[-2px]"
        placeholder="Shared notes. Every member can read and edit them."
        value={content}
        onChange={(e) => edit(e.target.value)}
        maxLength={MAX_LENGTH}
        disabled={!ready}
      />
    </div>
  );
};

export default DocumentEditor;
