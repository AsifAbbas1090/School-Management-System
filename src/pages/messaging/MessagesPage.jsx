import React, { useState } from 'react';
import { Send, Inbox, Mail, Search } from 'lucide-react';
import { useMessagesStore } from '../../store';
import { getRelativeTime } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';

const MessagesPage = () => {
    const { messages, setMessages, addMessage, markAsRead } = useMessagesStore();
    const [viewMode, setViewMode] = useState('inbox');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Messages', path: null },
    ];

    React.useEffect(() => {
        setMessages([
            {
                id: '1',
                senderId: 'parent1',
                senderName: 'Michael Brown',
                receiverId: 'teacher1',
                subject: 'Question about homework',
                content: 'Hello, I wanted to ask about the mathematics homework assigned yesterday.',
                isRead: false,
                createdAt: new Date(Date.now() - 3600000),
            },
            {
                id: '2',
                senderId: 'admin',
                senderName: 'Admin',
                receiverId: 'teacher1',
                subject: 'Staff meeting reminder',
                content: 'Reminder: Staff meeting tomorrow at 3 PM in the conference room.',
                isRead: true,
                readAt: new Date(),
                createdAt: new Date(Date.now() - 86400000),
            },
        ]);
    }, []);

    const handleSendMessage = () => {
        toast.success('Message sent successfully');
        setShowComposeModal(false);
    };

    const handleMessageClick = (message) => {
        setSelectedMessage(message);
        if (!message.isRead) {
            markAsRead(message.id);
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="messages-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Messages</h1>
                    <p className="text-gray-600">Internal communication system</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowComposeModal(true)}>
                    <Send size={18} />
                    <span>Compose Message</span>
                </button>
            </div>

            <div className="messages-container">
                {/* Sidebar */}
                <div className="messages-sidebar">
                    <div className="search-box mb-md">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div className="sidebar-menu">
                        <button
                            className={`menu-item ${viewMode === 'inbox' ? 'active' : ''}`}
                            onClick={() => setViewMode('inbox')}
                        >
                            <Inbox size={18} />
                            <span>Inbox</span>
                            <span className="badge badge-primary">{messages.filter(m => !m.isRead).length}</span>
                        </button>
                        <button
                            className={`menu-item ${viewMode === 'sent' ? 'active' : ''}`}
                            onClick={() => setViewMode('sent')}
                        >
                            <Send size={18} />
                            <span>Sent</span>
                        </button>
                    </div>
                </div>

                {/* Messages List */}
                <div className="messages-list">
                    {filteredMessages.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📬</div>
                            <h3 className="empty-state-title">No messages</h3>
                            <p className="empty-state-description">Your inbox is empty</p>
                        </div>
                    ) : (
                        filteredMessages.map((message) => (
                            <div
                                key={message.id}
                                className={`message-item ${!message.isRead ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                                onClick={() => handleMessageClick(message)}
                            >
                                <Avatar name={message.senderName} size="sm" />
                                <div className="message-preview">
                                    <div className="message-header">
                                        <span className="sender-name">{message.senderName}</span>
                                        <span className="message-time">{getRelativeTime(message.createdAt)}</span>
                                    </div>
                                    <div className="message-subject">{message.subject}</div>
                                    <div className="message-snippet">{message.content}</div>
                                </div>
                                {!message.isRead && <div className="unread-dot"></div>}
                            </div>
                        ))
                    )}
                </div>

                {/* Message Detail */}
                <div className="message-detail">
                    {selectedMessage ? (
                        <>
                            <div className="detail-header">
                                <div className="flex items-center gap-md">
                                    <Avatar name={selectedMessage.senderName} size="md" />
                                    <div>
                                        <h3 className="sender-name">{selectedMessage.senderName}</h3>
                                        <p className="message-time">{getRelativeTime(selectedMessage.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-subject">
                                <h2>{selectedMessage.subject}</h2>
                            </div>
                            <div className="detail-content">
                                <p>{selectedMessage.content}</p>
                            </div>
                            <div className="detail-actions">
                                <button className="btn btn-primary">
                                    <Send size={18} />
                                    <span>Reply</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">✉️</div>
                            <h3 className="empty-state-title">Select a message</h3>
                            <p className="empty-state-description">Choose a message to read</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Modal */}
            <Modal
                isOpen={showComposeModal}
                onClose={() => setShowComposeModal(false)}
                title="Compose Message"
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowComposeModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSendMessage}>
                            <Send size={18} />
                            <span>Send</span>
                        </button>
                    </>
                }
            >
                <form>
                    <div className="form-group">
                        <label className="form-label">To *</label>
                        <select className="select">
                            <option value="">Select recipient</option>
                            <option value="teacher">Teachers</option>
                            <option value="parent">Parents</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subject *</label>
                        <input type="text" className="input" placeholder="Enter subject" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Message *</label>
                        <textarea className="textarea" placeholder="Type your message" rows="8" />
                    </div>
                </form>
            </Modal>

            <style jsx>{`
        .messages-page {
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

        .messages-container {
          display: grid;
          grid-template-columns: 250px 350px 1fr;
          gap: var(--spacing-lg);
          height: calc(100vh - 250px);
        }

        .messages-sidebar {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border: none;
          background: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .menu-item:hover {
          background: var(--gray-50);
        }

        .menu-item.active {
          background: var(--primary-50);
          color: var(--primary-700);
        }

        .messages-list {
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow-y: auto;
        }

        .message-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--gray-200);
          cursor: pointer;
          transition: all var(--transition-base);
          position: relative;
        }

        .message-item:hover {
          background: var(--gray-50);
        }

        .message-item.unread {
          background: var(--primary-50);
        }

        .message-item.selected {
          background: var(--primary-100);
        }

        .message-preview {
          flex: 1;
          min-width: 0;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .sender-name {
          font-weight: 600;
          color: var(--gray-900);
          font-size: 0.875rem;
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .message-subject {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .message-snippet {
          font-size: 0.8125rem;
          color: var(--gray-600);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: var(--primary-500);
          border-radius: var(--radius-full);
          position: absolute;
          right: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
        }

        .message-detail {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-sm);
          overflow-y: auto;
        }

        .detail-header {
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--gray-200);
          margin-bottom: var(--spacing-lg);
        }

        .detail-subject {
          margin-bottom: var(--spacing-lg);
        }

        .detail-subject h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .detail-content {
          margin-bottom: var(--spacing-xl);
          line-height: 1.6;
          color: var(--gray-700);
        }

        .detail-actions {
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--gray-200);
        }

        .search-box {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
        }

        .search-box input {
          padding-left: 2.75rem;
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
        </div>
    );
};

export default MessagesPage;
