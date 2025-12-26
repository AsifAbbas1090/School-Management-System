import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteWarningModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Deletion',
    message,
    warningText,
    itemName,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="delete-warning-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-warning-header">
                    <div className="delete-warning-icon">
                        <AlertTriangle size={48} />
                    </div>
                    <button className="delete-warning-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="delete-warning-body">
                    <h2 className="delete-warning-title">{title}</h2>
                    {itemName && (
                        <div className="delete-warning-item-name">
                            <strong>{itemName}</strong>
                        </div>
                    )}
                    {message && (
                        <p className="delete-warning-message">{message}</p>
                    )}
                    <div className="delete-warning-box">
                        <AlertTriangle size={24} className="delete-warning-box-icon" />
                        <p className="delete-warning-box-text">{warningText || 'This action cannot be undone!'}</p>
                    </div>
                </div>

                <div className="delete-warning-footer">
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>

                <style>{`
                    .delete-warning-modal {
                        background: white;
                        border-radius: var(--radius-lg);
                        box-shadow: var(--shadow-2xl);
                        max-width: 500px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        position: relative;
                        animation: slideIn 0.2s ease-out;
                    }

                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-20px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }

                    .delete-warning-header {
                        position: relative;
                        padding: var(--spacing-xl);
                        padding-bottom: var(--spacing-md);
                    }

                    .delete-warning-icon {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 80px;
                        height: 80px;
                        margin: 0 auto;
                        background: var(--error-50);
                        border-radius: 50%;
                        color: var(--error-600);
                    }

                    .delete-warning-close {
                        position: absolute;
                        top: var(--spacing-md);
                        right: var(--spacing-md);
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: var(--gray-400);
                        padding: var(--spacing-xs);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: var(--radius-md);
                        transition: all 0.2s;
                    }

                    .delete-warning-close:hover {
                        background: var(--gray-100);
                        color: var(--gray-600);
                    }

                    .delete-warning-body {
                        padding: 0 var(--spacing-xl) var(--spacing-xl);
                        text-align: center;
                    }

                    .delete-warning-title {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: var(--gray-900);
                        margin-bottom: var(--spacing-md);
                    }

                    .delete-warning-item-name {
                        font-size: 1.125rem;
                        color: var(--gray-700);
                        margin-bottom: var(--spacing-lg);
                        padding: var(--spacing-md);
                        background: var(--gray-50);
                        border-radius: var(--radius-md);
                    }

                    .delete-warning-item-name strong {
                        color: var(--error-600);
                    }

                    .delete-warning-message {
                        font-size: 1rem;
                        color: var(--gray-600);
                        margin-bottom: var(--spacing-lg);
                        line-height: 1.6;
                    }

                    .delete-warning-box {
                        display: flex;
                        align-items: center;
                        gap: var(--spacing-md);
                        padding: var(--spacing-lg);
                        background: var(--error-50);
                        border: 2px solid var(--error-200);
                        border-radius: var(--radius-md);
                        margin-top: var(--spacing-lg);
                    }

                    .delete-warning-box-icon {
                        color: var(--error-600);
                        flex-shrink: 0;
                    }

                    .delete-warning-box-text {
                        font-size: 1rem;
                        font-weight: 600;
                        color: var(--error-700);
                        margin: 0;
                        text-align: left;
                    }

                    .delete-warning-footer {
                        display: flex;
                        gap: var(--spacing-md);
                        padding: var(--spacing-xl);
                        padding-top: var(--spacing-md);
                        border-top: 1px solid var(--gray-200);
                        justify-content: flex-end;
                    }

                    .btn-danger {
                        background: var(--error-600);
                        color: white;
                        border: none;
                    }

                    .btn-danger:hover:not(:disabled) {
                        background: var(--error-700);
                    }

                    .btn-danger:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default DeleteWarningModal;

