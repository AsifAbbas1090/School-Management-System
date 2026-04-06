import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Breadcrumb = ({ items }) => {
    return (
        <nav className="breadcrumb">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight size={14} className="breadcrumb-sep" />}
                    {item.path ? (
                        <Link to={item.path} className="breadcrumb-link">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="breadcrumb-current">{item.label}</span>
                    )}
                </React.Fragment>
            ))}

            <style>{`
                .breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    font-size: 0.8125rem;
                    margin-bottom: 1.25rem;
                }
                .breadcrumb-sep { color: var(--gray-400); flex-shrink: 0; }
                .breadcrumb-link {
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: color var(--transition-fast);
                }
                .breadcrumb-link:hover { color: var(--primary-600); }
                .breadcrumb-current {
                    color: var(--text-primary);
                    font-weight: 500;
                }
            `}</style>
        </nav>
    );
};

export default Breadcrumb;
