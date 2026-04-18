import React from 'react';
import Breadcrumb from '../common/Breadcrumb';

/**
 * Immediate layout + pulsing placeholders while dashboard data loads.
 */
const DashboardSkeleton = ({ title = 'Dashboard', breadcrumbItems = [{ label: 'Dashboard', path: null }] }) => (
    <div className="dashboard-skeleton-page">
        <Breadcrumb items={breadcrumbItems} />
        <div className="page-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <div className="skeleton skeleton-block" style={{ height: 36, width: '45%', maxWidth: 320, marginBottom: 12 }} />
            <div className="skeleton skeleton-block" style={{ height: 18, width: '60%', maxWidth: 420 }} />
        </div>
        <div className="grid grid-cols-4 mb-xl" style={{ gap: 'var(--spacing-md)' }}>
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="skeleton skeleton-block" style={{ height: 88, borderRadius: 8 }} />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-2 mb-xl" style={{ gap: 'var(--spacing-md)' }}>
            <div className="skeleton skeleton-block" style={{ height: 280, borderRadius: 8 }} />
            <div className="skeleton skeleton-block" style={{ height: 280, borderRadius: 8 }} />
        </div>
        <div className="grid grid-cols-3 mb-xl" style={{ gap: 'var(--spacing-md)' }}>
            {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton-block" style={{ height: 160, borderRadius: 8 }} />
            ))}
        </div>
        <style>{`
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            .dashboard-skeleton-page .skeleton {
                animation: pulse 1.5s ease-in-out infinite;
                background: var(--color-border-tertiary, var(--border-color, #e5e7eb));
                border-radius: 4px;
            }
        `}</style>
    </div>
);

export default DashboardSkeleton;
