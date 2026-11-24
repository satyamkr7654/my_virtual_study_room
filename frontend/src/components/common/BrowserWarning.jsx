import React, { useState } from 'react';
import { X } from 'lucide-react';
import { checkBrowserSupport } from '../../utils/deviceDetection';

/**
 * Shown only when this browser cannot make video calls at all
 */
const BrowserWarning = () => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || checkBrowserSupport().supported) return null;

    return (
        <div role="alert" className="flex items-center gap-3 bg-lamp text-ink-deep px-4 text-sm">
            <p className="flex-1 py-2">
                Video calls are not available here. Use a recent Chrome, Edge, Firefox or Safari on an https address.
            </p>
            <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="w-11 h-11 inline-flex items-center justify-center">
                <X size={18} aria-hidden="true" />
            </button>
        </div>
    );
};

export default BrowserWarning;
