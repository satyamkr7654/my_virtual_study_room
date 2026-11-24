import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const FeedbackContext = createContext();

const TOAST_TIME = 6000;

export const useFeedback = () => useContext(FeedbackContext);

const ConfirmDialog = ({ request, onAnswer }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (request) ref.current.showModal();
  }, [request]);

  if (!request) return null;

  const answer = (value) => {
    ref.current.close();
    onAnswer(value);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        answer(false);
      }}
      className="bg-sheet text-ink rounded p-6 w-[calc(100%-2rem)] max-w-md border border-rule"
    >
      <h2 id="confirm-title" className="text-xl font-semibold mb-2">{request.title}</h2>
      <p className="text-ink-soft mb-6">{request.message}</p>
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-quiet" onClick={() => answer(false)} autoFocus>Cancel</button>
        <button type="button" className="btn-danger" onClick={() => answer(true)}>{request.action}</button>
      </div>
    </dialog>
  );
};

/**
 * Messages and confirmations, in place of the browser's alert() and confirm()
 */
export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [request, setRequest] = useState(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback((message) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    setTimeout(() => dismiss(id), TOAST_TIME);
  }, [dismiss]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const handleAnswer = (value) => {
    request.resolve(value);
    setRequest(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="fixed z-50 bottom-4 inset-x-4 sm:left-auto sm:w-96 space-y-2 on-dark" role="status">
        {toasts.map(({ id, message }) => (
          <div key={id} className="flex items-center gap-3 bg-ink-deep text-sheet rounded pl-4 border-l-4 border-lamp">
            <p className="flex-1 py-3 text-sm">{message}</p>
            <button type="button" onClick={() => dismiss(id)} aria-label="Dismiss" className="w-11 h-11 inline-flex items-center justify-center">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog request={request} onAnswer={handleAnswer} />
    </FeedbackContext.Provider>
  );
};
