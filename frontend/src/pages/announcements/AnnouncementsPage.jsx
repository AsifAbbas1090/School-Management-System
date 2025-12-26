import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Megaphone, Pin, Trash2 } from 'lucide-react';
import { useAnnouncementsStore, useAuthStore } from '../../store';
import { announcementsService } from '../../services/api';
import { formatDate, getRelativeTime, generateId } from '../../utils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AnnouncementsPage = () => {
    const { user } = useAuthStore();
    const { announcements, setAnnouncements, addAnnouncement, deleteAnnouncement } = useAnnouncementsStore();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await announcementsService.getAll();
            if (response.success && response.data) {
                const announcementsData = response.data.data || response.data;
                setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
            } else {
                setAnnouncements([]);
            }
        } catch (error) {
            console.error('Failed to load announcements:', error);
            setAnnouncements([]);
            // Don't show error toast on initial load
        } finally {
            setLoading(false);
        }
    };

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        targetRoles: [],
        isPinned: false,
    });

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Announcements', path: null },
    ];


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Ensure targetRoles match exact UserRole enum values (excluding SUPER_ADMIN)
            const validRoles = ['ADMIN', 'MANAGEMENT', 'TEACHER', 'PARENT', 'SUPPORT_STAFF'];
            const targetRoles = formData.targetRoles
                .map(r => r.toUpperCase())
                .filter(r => validRoles.includes(r));

            if (targetRoles.length === 0) {
                toast.error('Please select at least one target audience');
                return;
            }

            const announcementData = {
                title: formData.title,
                content: formData.content,
                targetRoles: targetRoles,
                isPinned: formData.isPinned,
                publishDate: new Date().toISOString(), // Add publishDate as ISO 8601 string
            };

            const response = await announcementsService.create(announcementData);
            if (response.success && response.data) {
                addAnnouncement(response.data);
                toast.success('Announcement published successfully');
                setShowModal(false);
                setFormData({ title: '', content: '', targetRoles: [], isPinned: false });
                await loadAnnouncements();
            } else {
                toast.error(response.error || 'Failed to create announcement');
            }
        } catch (error) {
            console.error('Announcement creation error:', error);
            toast.error(error?.response?.data?.message || 'Failed to create announcement');
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await announcementsService.delete(id);
            if (response.success) {
                deleteAnnouncement(id);
                toast.success('Announcement deleted');
                loadAnnouncements();
            } else {
                toast.error(response.error || 'Failed to delete announcement');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to delete announcement');
        }
    };

    const handleRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            targetRoles: prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role]
        }));
    };

    return (
        <div className="announcements-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Announcements</h1>
                    <p className="text-gray-600">
                        {isAuthorized
                            ? 'Create and manage school announcements'
                            : 'View latest school announcements and updates'
                        }
                    </p>
                </div>
                {isAuthorized && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>New Announcement</span>
                    </button>
                )}
            </div>

            <div className="announcements-list">
                {loading ? (
                    <div className="text-center p-8 text-gray-500">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">No announcements found</div>
                ) : (
                    announcements
                        .filter(ann => {
                            if (isAuthorized) return true;
                            // Check if user's role is in target roles
                            if (ann.AnnouncementRole && Array.isArray(ann.AnnouncementRole)) {
                                return ann.AnnouncementRole.some(ar => ar.role === user?.role);
                            }
                            // Fallback for old format
                            return ann.targetRoles?.includes(user?.role);
                        })
                        .map((announcement) => {
                            // Extract target roles from AnnouncementRole array or use targetRoles
                            const targetRoles = announcement.AnnouncementRole?.map(ar => ar.role) || announcement.targetRoles || [];
                            const createdByName = announcement.User?.name || announcement.createdBy || 'Unknown';
                            
                            return (
                                <div key={announcement.id} className={`announcement-card ${announcement.isPinned ? 'pinned' : ''}`}>
                                    {announcement.isPinned && (
                                        <div className="pin-badge">
                                            <Pin size={14} />
                                            <span>Pinned</span>
                                        </div>
                                    )}

                                    <div className="announcement-header">
                                        <div>
                                            <h3 className="announcement-title">{announcement.title}</h3>
                                            <div className="announcement-meta">
                                                <span>By {createdByName}</span>
                                                <span>•</span>
                                                <span>{getRelativeTime(announcement.createdAt || announcement.publishDate)}</span>
                                                {isAuthorized && targetRoles.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>To: {targetRoles.join(', ')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isAuthorized && (
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(announcement.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="announcement-content">
                                        {announcement.content}
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create Announcement"
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            Publish
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input"
                            placeholder="Enter announcement title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Content *</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="textarea"
                            placeholder="Enter announcement content"
                            rows="6"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Target Audience *</label>
                        <div className="checkbox-group">
                            {Object.values(USER_ROLES)
                                .filter(role => role !== 'SUPER_ADMIN') // Remove SUPER_ADMIN from options
                                .map(role => (
                                <label key={role} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.targetRoles.includes(role)}
                                        onChange={() => handleRoleChange(role)}
                                    />
                                    <span className="capitalize">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isPinned}
                                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                            />
                            <span>Pin this announcement</span>
                        </label>
                    </div>
                </form>
            </Modal>

            <style>{`
        .announcements-page {
          animation: fadeIn 0.3s ease-in-out;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .announcement-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          position: relative;
        }

        .announcement-card.pinned {
          border-color: var(--primary-300);
          background: var(--primary-50);
        }

        .pin-badge {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: var(--primary-500);
          color: white;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .announcement-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
        }

        .announcement-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
        }

        .announcement-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .announcement-content {
          font-size: 0.9375rem;
          color: var(--gray-700);
          line-height: 1.6;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--gray-700);
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div >
    );
};

export default AnnouncementsPage;
