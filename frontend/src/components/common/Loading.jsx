import React from 'react';

const sizePx = { sm: 20, md: 36, lg: 52 };

const Loading = ({ size = 'md', fullScreen = false }) => {
    const px = sizePx[size] || sizePx.md;

    const spinner = (
        <div style={{
            width: px,
            height: px,
            borderRadius: '50%',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary-600)',
            animation: 'spin 0.7s linear infinite',
        }} />
    );

    if (fullScreen) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-body)', opacity: 0.95, zIndex: 9999,
            }}>
                <div style={{ textAlign: 'center' }}>
                    {spinner}
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-2xl)' }}>
            {spinner}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default Loading;
