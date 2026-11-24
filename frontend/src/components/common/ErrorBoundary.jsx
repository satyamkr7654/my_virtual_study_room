import React, { Component } from 'react';

/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <h1 className="text-3xl font-semibold">This page stopped working</h1>
                    <p className="text-ink-soft">Reload to continue. Your chat and notes are saved.</p>
                    <button type="button" onClick={() => window.location.reload()} className="btn-primary">
                        Reload
                    </button>
                </main>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
