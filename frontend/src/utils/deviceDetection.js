/**
 * Device and browser detection utilities
 */

export const detectDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    return {
        isMobile: /iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent),
        isTablet: /ipad|android(?!.*mobile)|tablet/i.test(userAgent),
        isDesktop: !/iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent),
        isIOS: /iphone|ipad|ipod/i.test(userAgent),
        isAndroid: /android/i.test(userAgent),
        isSafari: /safari/i.test(userAgent) && !/chrome/i.test(userAgent),
        isChrome: /chrome/i.test(userAgent),
        isFirefox: /firefox/i.test(userAgent),
        isEdge: /edg/i.test(userAgent),
    };
};

export const detectCapabilities = () => {
    return {
        hasWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasScreenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
        hasWebGL: !!document.createElement('canvas').getContext('webgl'),
        hardwareConcurrency: navigator.hardwareConcurrency || 2,
        deviceMemory: navigator.deviceMemory || 4, // GB
        isLowEnd: (navigator.hardwareConcurrency || 2) <= 2,
    };
};

export const detectNetwork = () => {
    const connection = navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    return {
        effectiveType: connection?.effectiveType || 'unknown', // 4g, 3g, 2g, slow-2g
        downlink: connection?.downlink || 0, // Mbps
        rtt: connection?.rtt || 0, // Round trip time in ms
        saveData: connection?.saveData || false,
        isOnline: navigator.onLine,
        isFastConnection: connection?.effectiveType === '4g',
        isSlowConnection: ['2g', 'slow-2g', '3g'].includes(connection?.effectiveType),
    };
};

export const getOptimalMediaConstraints = () => {
    const device = detectDevice();
    const capabilities = detectCapabilities();
    const network = detectNetwork();

    // Base constraints
    let videoConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
    };

    let audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    };

    // Mobile optimizations
    if (device.isMobile) {
        videoConstraints = {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: device.isIOS ? 'user' : { ideal: 'user' },
        };
    }

    // Low-end device optimizations
    if (capabilities.isLowEnd) {
        videoConstraints.width = { ideal: 480, max: 640 };
        videoConstraints.height = { ideal: 360, max: 480 };
        videoConstraints.frameRate = { ideal: 15, max: 24 };
    }

    // Network-based optimizations
    if (network.isSlowConnection || network.saveData) {
        videoConstraints.width = { ideal: 320, max: 640 };
        videoConstraints.height = { ideal: 240, max: 480 };
        videoConstraints.frameRate = { ideal: 15, max: 20 };
    }

    return {
        video: videoConstraints,
        audio: audioConstraints,
    };
};

export const getScreenShareConstraints = () => {
    const device = detectDevice();
    const capabilities = detectCapabilities();

    // Screen sharing not well supported on mobile
    if (device.isMobile) {
        return null;
    }

    return {
        video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: capabilities.isLowEnd ? { ideal: 5 } : { ideal: 10 },
        },
    };
};

export const checkBrowserSupport = () => {
    const device = detectDevice();
    const capabilities = detectCapabilities();

    return {
        supported: capabilities.hasWebRTC,
        issues: [
            !capabilities.hasWebRTC && 'WebRTC not supported',
            device.isSafari && 'Safari may have limited WebRTC features',
            !capabilities.hasScreenShare && 'Screen sharing not available',
            device.isMobile && !device.isChrome && 'Mobile works best in Chrome',
        ].filter(Boolean),
        recommendations: [
            device.isSafari && 'For best experience, use Chrome or Firefox',
            device.isMobile && 'Landscape mode recommended for video calls',
            capabilities.isLowEnd && 'Close other apps for better performance',
        ].filter(Boolean),
    };
};
