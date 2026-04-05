import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '2rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                    }}>
                        <AlertTriangle size={36} color="#dc2626" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: '#6b7280', maxWidth: 420, marginBottom: '1.5rem' }}>
                        An unexpected error occurred on this page. Your other data is safe.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '0.75rem 1rem',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            maxWidth: 480,
                            width: '100%',
                            textAlign: 'left',
                            overflow: 'auto',
                            marginBottom: '1.5rem',
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={this.handleReset}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1.25rem',
                                background: 'var(--primary-600, #2563eb)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                            }}
                        >
                            <RefreshCw size={16} /> Try Again
                        </button>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            style={{
                                padding: '0.5rem 1.25rem',
                                background: 'white',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                            }}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
