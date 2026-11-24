import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Room code that copies itself
 */
const CopyCode = ({ code, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Clipboard blocked: the code is still readable on the button
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 min-h-[44px] font-mono tabular-nums tracking-wider hover:underline ${className}`}
      aria-label={`Copy room code ${code}`}
    >
      {code}
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only" role="status">{copied ? 'Copied' : ''}</span>
    </button>
  );
};

export default CopyCode;
