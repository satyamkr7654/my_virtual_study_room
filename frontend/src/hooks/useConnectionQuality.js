import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to monitor WebRTC connection quality
 */
const useConnectionQuality = (peerConnection) => {
    const [quality, setQuality] = useState('good'); // 'excellent', 'good', 'poor', 'bad'
    const [stats, setStats] = useState({
        packetsLost: 0,
        packetsReceived: 0,
        bytesReceived: 0,
        jitter: 0,
        rtt: 0,
    });

    const intervalRef = useRef(null);

    const calculateQuality = useCallback((packetsLost, packetsTotal, jitter, rtt) => {
        const lossRate = packetsLost / packetsTotal;

        // Excellent: <1% loss, <30ms jitter, <100ms rtt
        if (lossRate < 0.01 && jitter < 30 && rtt < 100) {
            return 'excellent';
        }

        // Good: <5% loss, <50ms jitter, <200ms rtt
        if (lossRate < 0.05 && jitter < 50 && rtt < 200) {
            return 'good';
        }

        // Poor: <10% loss, <100ms jitter, <400ms rtt
        if (lossRate < 0.10 && jitter < 100 && rtt < 400) {
            return 'poor';
        }

        // Otherwise bad
        return 'bad';
    }, []);

    useEffect(() => {
        if (!peerConnection) return;

        const monitorQuality = async () => {
            try {
                const stats = await peerConnection.getStats();

                let totalPacketsLost = 0;
                let totalPacketsReceived = 0;
                let totalBytesReceived = 0;
                let maxJitter = 0;
                let maxRtt = 0;

                stats.forEach((report) => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        totalPacketsLost += report.packetsLost || 0;
                        totalPacketsReceived += report.packetsReceived || 0;
                        totalBytesReceived += report.bytesReceived || 0;
                        maxJitter = Math.max(maxJitter, report.jitter || 0);
                    }

                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        maxRtt = Math.max(maxRtt, report.currentRoundTripTime * 1000 || 0);
                    }
                });

                const newStats = {
                    packetsLost: totalPacketsLost,
                    packetsReceived: totalPacketsReceived,
                    bytesReceived: totalBytesReceived,
                    jitter: maxJitter * 1000, // Convert to ms
                    rtt: maxRtt,
                };

                setStats(newStats);

                const totalPackets = totalPacketsLost + totalPacketsReceived;
                if (totalPackets > 0) {
                    const quality = calculateQuality(
                        totalPacketsLost,
                        totalPackets,
                        newStats.jitter,
                        newStats.rtt
                    );
                    setQuality(quality);
                }
            } catch (error) {
                console.error('Error monitoring connection quality:', error);
            }
        };

        // Monitor every 2 seconds
        intervalRef.current = setInterval(monitorQuality, 2000);

        // Initial check
        monitorQuality();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [peerConnection, calculateQuality]);

    return {
        quality,
        stats,
        lossRate: stats.packetsReceived > 0
            ? (stats.packetsLost / (stats.packetsLost + stats.packetsReceived)) * 100
            : 0,
    };
};

export default useConnectionQuality;
