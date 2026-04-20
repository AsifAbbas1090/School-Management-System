import React, { useState, useEffect, useRef } from 'react';
import { Send, Inbox, Search, X } from 'lucide-react';
import { useMessagesStore, useAuthStore } from '../../store';
import { messagesService, usersService } from '../../services/api';
import { getRelativeTime } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';

/**
 * Normalize a raw Prisma message into the flat shape the UI renders.
 * Backend returns `body` + `User_Message_senderIdToUser` relations; the UI
 * historically read `content`/`senderName`, so we map once at the boundary
 * instead of sprinkling relation lookups through JSX.
 */
const normalizeMessage = (m) => {
  if (!m || typeof m !== 'object') return m;
  const sender = m.User_Message_senderIdToUser || m.sender || null;
  const receiver = m.User_Message_receiverIdToUser || m.receiver || null;
  return {
    ...m,
    content: m.content ?? m.body ?? '',
    senderName: m.senderName || sender?.name || 'Unknown',
    senderRole: m.senderRole || sender?.role || null,
    receiverName: m.receiverName || receiver?.name || null,
  };
};

const MessagesPage = () => {
  const { user } = useAuthStore();
  const { messages, setMessages, addMessage, markAsRead } = useMessagesStore();
  const [viewMode, setViewMode] = useState('inbox');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [composeData, setComposeData] = useState({
    receiverId: '',
    receiverRole: '',
    receiverName: '',
    subject: '',
    content: '',
  });
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [sending, setSending] = useState(false);

  /** Recipient combobox state — debounced name-search limited to staff roles. */
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const recipientSearchRef = useRef(null);
  const recipientBoxRef = useRef(null);

  /** 300ms debounce so every keystroke doesn't hit the API. */
  useEffect(() => {
    if (!showComposeModal) return;
    if (composeData.receiverId) return; // already picked, no search needed
    if (recipientSearchRef.current) clearTimeout(recipientSearchRef.current);
    recipientSearchRef.current = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const res = await usersService.searchStaff({
          q: recipientQuery,
          roles: ['ADMIN', 'MANAGEMENT', 'TEACHER', 'SUPER_ADMIN'],
          excludeUserId: user?.id,
          limit: 10,
        });
        if (res?.success) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
          setRecipientOptions(list);
          setShowRecipientDropdown(true);
        }
      } catch {
        setRecipientOptions([]);
      } finally {
        setRecipientLoading(false);
      }
    }, 300);
    return () => {
      if (recipientSearchRef.current) clearTimeout(recipientSearchRef.current);
    };
  }, [recipientQuery, showComposeModal, composeData.receiverId, user?.id]);

  /** Close dropdown on outside click. */
  useEffect(() => {
    if (!showRecipientDropdown) return;
    const onDocClick = (e) => {
      if (recipientBoxRef.current && !recipientBoxRef.current.contains(e.target)) {
        setShowRecipientDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showRecipientDropdown]);

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Messages', path: null },
  ];

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await messagesService.getAll();
      if (response.success && response.data) {
        const messagesData = response.data.data || response.data;
        const list = Array.isArray(messagesData) ? messagesData : [];
        setMessages(list.map(normalizeMessage));
      }
    } catch (error) {
      // Silently handle errors - toast shows user message
    } finally {
      setLoading(false);
    }
  };

  const resetComposeForm = () => {
    setComposeData({
      receiverId: '',
      receiverRole: '',
      receiverName: '',
      subject: '',
      content: '',
    });
    setRecipientQuery('');
    setRecipientOptions([]);
    setShowRecipientDropdown(false);
  };

  const handlePickRecipient = (u) => {
    setComposeData((p) => ({
      ...p,
      receiverId: u.id,
      receiverRole: u.role,
      receiverName: u.name,
    }));
    setRecipientQuery(u.name);
    setShowRecipientDropdown(false);
  };

  const handleClearRecipient = () => {
    setComposeData((p) => ({ ...p, receiverId: '', receiverRole: '', receiverName: '' }));
    setRecipientQuery('');
    setRecipientOptions([]);
    setShowRecipientDropdown(true);
  };

  const handleSendMessage = async () => {
    if (!composeData.receiverId || !composeData.subject || !composeData.content) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      /** Backend DTO expects `receiverType` (USER/ROLE/CLASS/SECTION) + `body` (not "content"). */
      const messageData = {
        receiverType: 'USER',
        receiverId: composeData.receiverId,
        receiverRole: composeData.receiverRole || undefined,
        subject: composeData.subject,
        body: composeData.content,
      };

      const response = await messagesService.create(messageData);
      if (response.success && response.data) {
        addMessage(normalizeMessage(response.data));
        toast.success('Message sent successfully');
        setShowComposeModal(false);
        resetComposeForm();
        loadMessages();
      } else {
        toast.error(response.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedMessage) return;
    setReplying(true);
    try {
      const response = await messagesService.reply({
        receiverType: 'USER',
        receiverId: selectedMessage.senderId,
        subject: `Re: ${selectedMessage.subject}`,
        body: replyContent,
      });
      if (response.success) {
        toast.success('Reply sent');
        setReplyContent('');
        loadMessages();
      } else {
        toast.error(response.error || 'Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
    setReplyContent('');
    if (!message.isRead) {
      try {
        const response = await messagesService.markAsRead(message.id);
        if (response.success) {
          markAsRead(message.id);
        }
      } catch (error) {
        // Silently handle errors
      }
    }
  };

  // SECURE FILTERING: Only show messages where the user is sender or receiver
  const visibleMessages = messages.filter(msg => {
    const isParticipant = msg.receiverId === user?.id || msg.senderId === user?.id;
    const matchesMode = viewMode === 'inbox' ? msg.receiverId === user?.id : msg.senderId === user?.id;
    return isParticipant && matchesMode;
  });

  const filteredMessages = visibleMessages.filter((msg) => {
    const q = searchTerm.toLowerCase();
    return (
      (msg.subject || '').toLowerCase().includes(q) ||
      (msg.senderName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="messages-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
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
              <span className="badge badge-primary">{visibleMessages.filter(m => !m.isRead && m.receiverId === user?.id).length}</span>
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
                <textarea
                  className="textarea"
                  placeholder="Write a reply..."
                  rows={4}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  style={{ marginBottom: 'var(--spacing-md)', resize: 'vertical' }}
                />
                <button className="btn btn-primary" onClick={handleReply} disabled={replying || !replyContent.trim()}>
                  <Send size={18} />
                  <span>{replying ? 'Sending...' : 'Send Reply'}</span>
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
        onClose={() => {
          setShowComposeModal(false);
          resetComposeForm();
        }}
        title="Compose Message"
        size="lg"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setShowComposeModal(false);
                resetComposeForm();
              }}
              disabled={sending}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSendMessage} disabled={sending}>
              <Send size={18} />
              <span>{sending ? 'Sending…' : 'Send'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group" ref={recipientBoxRef} style={{ position: 'relative' }}>
            <label className="form-label">Recipient *</label>
            {composeData.receiverId ? (
              <div
                className="flex items-center gap-md"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gray-50)',
                }}
              >
                <Avatar name={composeData.receiverName} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{composeData.receiverName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {composeData.receiverRole}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleClearRecipient}
                  title="Change recipient"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name…"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setShowRecipientDropdown(true);
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  autoComplete="off"
                />
                {showRecipientDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '0.25rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                      zIndex: 10,
                      maxHeight: '240px',
                      overflowY: 'auto',
                    }}
                  >
                    {recipientLoading && (
                      <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Searching…
                      </div>
                    )}
                    {!recipientLoading && recipientOptions.length === 0 && (
                      <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        No staff members match that name.
                      </div>
                    )}
                    {!recipientLoading &&
                      recipientOptions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handlePickRecipient(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            width: '100%',
                            padding: '0.625rem 0.75rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <Avatar name={u.name} size="sm" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {u.role} · {u.email}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Messaging is limited to Admins, Management, and Teachers.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="input"
              placeholder="Enter subject"
              value={composeData.subject}
              onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea
              className="textarea"
              placeholder="Type your message"
              rows="8"
              value={composeData.content}
              onChange={e => setComposeData(p => ({ ...p, content: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      <style>{`
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
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .messages-container {
          display: grid;
          grid-template-columns: 250px 350px 1fr;
          gap: var(--spacing-lg);
          height: calc(100vh - 250px);
        }

        .messages-sidebar {
          background: var(--bg-card);
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
          color: var(--text-primary);
        }

        .menu-item:hover {
          background: var(--gray-50);
        }

        .menu-item.active {
          background: var(--primary-50);
          color: var(--primary-700);
        }

        .messages-list {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow-y: auto;
        }

        .message-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
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
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .message-subject {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .message-snippet {
          font-size: 0.8125rem;
          color: var(--text-secondary);
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
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-sm);
          overflow-y: auto;
        }

        .detail-header {
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--border-color);
          margin-bottom: var(--spacing-lg);
        }

        .detail-subject {
          margin-bottom: var(--spacing-lg);
        }

        .detail-subject h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .detail-content {
          margin-bottom: var(--spacing-xl);
          line-height: 1.6;
          color: var(--text-primary);
        }

        .detail-actions {
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--border-color);
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
