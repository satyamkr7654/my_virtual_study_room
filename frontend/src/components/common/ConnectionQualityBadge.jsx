import React from 'react';
import useConnectionQuality from '../../hooks/useConnectionQuality';

const BARS = { excellent: 4, good: 3, poor: 2, bad: 1 };

/**
 * Signal bars for one connection in the call
 */
const ConnectionQualityBadge = ({ peerConnection }) => {
    const { quality } = useConnectionQuality(peerConnection);
    const bars = BARS[quality] || BARS.good;

    return (
        <span className="inline-flex items-end gap-0.5 h-4" role="img" aria-label={`Connection: ${quality}`} title={`Connection: ${quality}`}>
            {[1, 2, 3, 4].map((n) => (
                <span
                    key={n}
                    className={`w-1 ${n <= bars ? 'bg-lamp' : 'bg-white/30'}`}
                    style={{ height: `${n * 25}%` }}
                />
            ))}
        </span>
    );
};

export default ConnectionQualityBadge;
