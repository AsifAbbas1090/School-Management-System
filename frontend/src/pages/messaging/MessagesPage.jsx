import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Search, Plus, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store';
import { messagingService } from '../../services/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────*/

const ROLE_COLORS = {
  TEACHER: '#2563eb',
  PARENT: '#16a34a',
  ADMIN: '#7c3aed',
  SUPER_ADMIN: '#7c3aed',
  MANAGEMENT: '#d97706',
};

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatListTime = (iso) => {
  if (!iso) return '';
  const now = new Date();
  if (isSameDay(now, iso)) return formatTime(iso);
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatBubbleTime = (iso) => {
  if (!iso) return '';
  const now = new Date();
  if (isSameDay(now, iso)) return formatTime(iso);
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} ${formatTime(iso)}`;
};

const previewContent = (msg) => {
  if (!msg) return '';
  if (msg.isDeleted) return 'Message deleted';
  const c = msg.content || '';
  if (c.length <= 35) return c;
  return c.slice(0, 35) + '…';
};

/* ─────────────────────────────────────────────────────────────
 * Avatar — colored circle of initials
 * ────────────────────────────────────────────────────────────*/

const Avatar = ({ name, role, size = 40 }) => {
  const bg = ROLE_COLORS[role] || '#64748b';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initialsOf(name)}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * New-conversation modal
 * ────────────────────────────────────────────────────────────*/

const NewConversationModal = ({ isOpen, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // clear stale state when reopening
    setQ('');
    setResults([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await messagingService.searchUsers(q);
        if (res?.success) {
          const data = Array.isArray(res.data) ? res.data : [];
          setResults(data);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="new-conv-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>New message</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="new-conv-close"
          >
            ×
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            autoFocus
            type="text"
            placeholder="Search by name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="new-conv-search"
          />
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {q ? 'No users match that name.' : 'Start typing to find someone to message.'}
            </div>
          )}
          {!loading &&
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick(u)}
                className="new-conv-row"
              >
                <Avatar name={u.name} role={u.role} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.role}</div>
                </div>
              </button>
            ))}
        </div>
      </div>

      <style>{`
        .new-conv-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.45);
        }
        .new-conv-close {
          border: none;
          background: none;
          font-size: 1.4rem;
          cursor: pointer;
          color: var(--text-secondary);
          line-height: 1;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .new-conv-close:hover { background: var(--bg-body); color: var(--text-primary); }
        .new-conv-search {
          width: 100%;
          padding: 0.6rem 0.75rem 0.6rem 2.25rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          font-size: 0.9rem;
          outline: none;
          background: var(--bg-body);
          color: var(--text-primary);
        }
        .new-conv-search::placeholder { color: var(--text-secondary); }
        .new-conv-search:focus { border-color: #2563eb; }
        .new-conv-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.6rem 0.5rem;
          background: none;
          border: none;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          text-align: left;
          color: var(--text-primary);
        }
        .new-conv-row:hover { background: var(--bg-body); }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Main page
 * ────────────────────────────────────────────────────────────*/

const MessagesPage = () => {
  const { user } = useAuthStore();

  // Conversation list (Panel 1)
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  // Chat window (Panel 2)
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [newMessagesPending, setNewMessagesPending] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const tempIdCounterRef = useRef(0);

  // Active conversation (derived)
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

  // ── Conversation list loaders ───────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await messagingService.getConversations();
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setConversations(list);
      }
    } catch {
      // non-fatal
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Poll conversation list every 10s (tab-visible only).
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) loadConversations();
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [loadConversations]);

  // ── Open a conversation — fetch its first page of messages ──

  const openConversation = useCallback(async (conversationId) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setNewMessagesPending(false);
    setLoadingMessages(true);
    try {
      const res = await messagingService.getMessages(conversationId, 1, 40);
      if (res?.success && res.data) {
        const data = res.data.data || [];
        // API returns newest-first; invert so bottom of the viewport = newest.
        setMessages([...data].reverse());
        setHasMore(!!res.data.hasMore);
      }
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
      // defer scroll until after paint
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ block: 'end' });
      });
    }
  }, []);

  // ── Scroll-up loads older messages ──────────────────────────

  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    if (c.scrollTop < 100 && hasMore && !loadingMore && !loadingMessages) {
      void (async () => {
        setLoadingMore(true);
        const prevScrollHeight = c.scrollHeight;
        const nextPage = page + 1;
        try {
          const res = await messagingService.getMessages(activeConversationId, nextPage, 40);
          if (res?.success && res.data) {
            const older = (res.data.data || []).slice().reverse();
            setMessages((prev) => [...older, ...prev]);
            setHasMore(!!res.data.hasMore);
            setPage(nextPage);
            // Preserve scroll position so the viewport doesn't jump to top.
            requestAnimationFrame(() => {
              const el = messagesContainerRef.current;
              if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
            });
          }
        } catch {
          // silent — user can try again by scrolling
        } finally {
          setLoadingMore(false);
        }
      })();
    }
  }, [activeConversationId, hasMore, loadingMore, loadingMessages, page]);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    c.addEventListener('scroll', handleScroll);
    return () => c.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ── Poll for new messages every 3s while chat is open ───────

  useEffect(() => {
    if (!activeConversationId) return;

    const pollOnce = async () => {
      if (document.hidden) return;
      try {
        // Fetch newest page; filter for messages we don't yet have.
        const res = await messagingService.getMessages(activeConversationId, 1, 40);
        if (!res?.success || !res.data) return;

        const remote = (res.data.data || []).slice().reverse(); // oldest→newest
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          // Treat temp IDs as fresh so a just-sent temp message can be replaced.
          const fresh = remote.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;

          // Drop any temp messages whose content matches a real incoming one
          const tempSurvivors = prev.filter((m) => {
            if (!String(m.id).startsWith('temp-')) return true;
            const matched = fresh.find(
              (f) => f.senderId === m.senderId && (f.content || '') === (m.content || ''),
            );
            return !matched;
          });

          const combined = [...tempSurvivors, ...fresh];

          // Should we auto-scroll? Only if the user is currently near the bottom.
          const c = messagesContainerRef.current;
          const nearBottom = c
            ? c.scrollHeight - c.scrollTop - c.clientHeight < 100
            : true;

          if (!nearBottom) {
            setNewMessagesPending(true);
          } else {
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ block: 'end' });
            });
          }
          return combined;
        });
      } catch {
        // ignore poll failures
      }
    };

    const id = setInterval(pollOnce, 3000);
    const onVisibility = () => {
      if (!document.hidden) pollOnce();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeConversationId]);

  // ── Starting a new conversation from the modal ──────────────

  const handlePickUser = useCallback(
    async (u) => {
      setShowNewModal(false);
      try {
        const res = await messagingService.startConversation(u.id);
        if (res?.success && res.data) {
          const conv = res.data;
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
          openConversation(conv.id);
        } else {
          toast.error(res?.error || 'Could not start conversation');
        }
      } catch {
        toast.error('Could not start conversation');
      }
    },
    [openConversation],
  );

  // ── Sending a message (optimistic) ──────────────────────────

  const handleSend = useCallback(async () => {
    const content = messageInput.trim();
    if (!content || !activeConversationId) return;

    const tempId = `temp-${++tempIdCounterRef.current}`;
    const optimistic = {
      id: tempId,
      content,
      sentAt: new Date().toISOString(),
      isDeleted: false,
      senderId: user?.id,
      sender: { id: user?.id, name: user?.name || 'You' },
      _status: 'sending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    });

    try {
      const res = await messagingService.sendMessage(activeConversationId, content);
      if (res?.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.data, _status: 'sent' } : m)),
        );
        // Bump the conversation to the top of the list locally.
        setConversations((prev) => {
          const target = prev.find((c) => c.id === activeConversationId);
          if (!target) return prev;
          const updated = {
            ...target,
            updatedAt: res.data.sentAt,
            lastMessage: {
              content: res.data.content,
              sentAt: res.data.sentAt,
              senderId: res.data.senderId,
              isDeleted: false,
              isOwn: true,
            },
          };
          return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
        });
      } else {
        throw new Error(res?.error || 'Send failed');
      }
    } catch {
      // Mark failed + restore the input so the user can retry.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _status: 'failed' } : m)),
      );
      setMessageInput(content);
      toast.error('Message failed to send');
    }
  }, [activeConversationId, messageInput, user?.id, user?.name]);

  // ── Derived data ────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!listSearch.trim()) return conversations;
    const q = listSearch.toLowerCase();
    return conversations.filter((c) =>
      (c.otherUser?.name || '').toLowerCase().includes(q),
    );
  }, [conversations, listSearch]);

  // Prepare message rendering with grouping flags (computed once per render).
  const renderMessages = useMemo(() => {
    return messages.map((m, idx) => {
      const prev = messages[idx - 1];
      const isOwn = m.senderId === user?.id;
      const samePrev =
        prev &&
        prev.senderId === m.senderId &&
        Math.abs(new Date(m.sentAt) - new Date(prev.sentAt)) < 2 * 60 * 1000;
      return { ...m, isOwn, grouped: !!samePrev };
    });
  }, [messages, user?.id]);

  // ── Render ──────────────────────────────────────────────────

  const showListPanel = !activeConversationId || window.innerWidth >= 768;
  const showChatPanel = activeConversationId || window.innerWidth >= 768;

  return (
    <div className="chat-page">
      <div className="chat-shell">
        {/* ── Panel 1: Conversation list ── */}
        {(showListPanel || true) && (
          <div className={`chat-panel list-panel ${activeConversationId ? 'hide-mobile' : ''}`}>
            <div className="list-header">
              <h2 className="list-title">Messages</h2>
              <button
                className="new-btn"
                onClick={() => setShowNewModal(true)}
                title="New message"
              >
                <Plus size={16} /> <span>New</span>
              </button>
            </div>

            <div className="list-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search conversations…"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>

            <div className="list-body">
              {listLoading && (
                <div className="muted-center">Loading…</div>
              )}
              {!listLoading && filteredConversations.length === 0 && (
                <div className="muted-center">
                  {listSearch
                    ? 'No conversations match that name.'
                    : 'No conversations yet. Tap “New” to start one.'}
                </div>
              )}
              {!listLoading &&
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className={`conv-row ${isActive ? 'active' : ''}`}
                    >
                      <Avatar name={c.otherUser?.name} role={c.otherUser?.role} size={40} />
                      <div className="conv-meta">
                        <div className="conv-top">
                          <span className="conv-name">{c.otherUser?.name || 'Unknown'}</span>
                          <span className="conv-time">
                            {formatListTime(c.lastMessage?.sentAt || c.updatedAt)}
                          </span>
                        </div>
                        <div className="conv-preview">
                          <span className="conv-snippet">
                            {c.lastMessage
                              ? (c.lastMessage.isOwn ? 'You: ' : '') + previewContent(c.lastMessage)
                              : 'No messages yet'}
                          </span>
                          {c.unreadCount > 0 && <span className="unread-dot" aria-label={`${c.unreadCount} unread`} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Panel 2: Chat window ── */}
        <div className={`chat-panel chat-window ${!activeConversationId ? 'hide-mobile' : ''}`}>
          {!activeConversation && (
            <div className="empty-chat">
              <MessageSquare size={48} />
              <p className="empty-title">Select a conversation</p>
              <p className="empty-sub">Or start a new one to send your first message.</p>
            </div>
          )}

          {activeConversation && (
            <>
              <div className="chat-header">
                <button
                  className="back-btn"
                  onClick={() => setActiveConversationId(null)}
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar
                  name={activeConversation.otherUser?.name}
                  role={activeConversation.otherUser?.role}
                  size={38}
                />
                <div className="header-meta">
                  <div className="header-name">{activeConversation.otherUser?.name || 'Unknown'}</div>
                  <div className="header-role">{activeConversation.otherUser?.role || ''}</div>
                </div>
              </div>

              <div className="messages-body" ref={messagesContainerRef}>
                {loadingMessages && (
                  <div className="muted-center">Loading messages…</div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="muted-center">
                    No messages yet. Say hello!
                  </div>
                )}
                {loadingMore && (
                  <div className="muted-center" style={{ padding: '6px' }}>Loading older…</div>
                )}

                {renderMessages.map((m) => {
                  const showName = !m.isOwn && !m.grouped;
                  return (
                    <div
                      key={m.id}
                      className={`bubble-row ${m.isOwn ? 'own' : 'their'} ${m.grouped ? 'grouped' : ''}`}
                    >
                      <div className="bubble-wrap">
                        {showName && (
                          <div className="bubble-sender">{m.sender?.name || ''}</div>
                        )}
                        <div className={`bubble ${m.isOwn ? 'bubble-own' : 'bubble-their'} ${m.isDeleted ? 'bubble-deleted' : ''}`}>
                          {m.isDeleted ? (
                            <em>This message was deleted</em>
                          ) : (
                            m.content
                          )}
                        </div>
                        <div className="bubble-time">
                          {formatBubbleTime(m.sentAt)}
                          {m._status === 'sending' && <span> · sending…</span>}
                          {m._status === 'failed' && <span className="send-failed"> · failed</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {newMessagesPending && (
                <button
                  className="new-messages-pill"
                  onClick={() => {
                    setNewMessagesPending(false);
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  }}
                >
                  New messages ↓
                </button>
              )}

              <div className="input-row">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="chat-input"
                />
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  aria-label="Send"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onPick={handlePickUser}
      />

      <style>{`
        /* Chat-specific tokens.
           The app-wide --primary-600 inverts to a pale blue in dark mode,
           which would make white text on "own" bubbles unreadable. We
           pin a fixed brand blue here and override everything per-theme. */
        .chat-page {
          --chat-brand: #2563eb;
          --chat-brand-hover: #1d4ed8;
          --chat-own-bubble: #2563eb;
          --chat-own-text: #ffffff;
          --chat-their-bubble: #e5e7eb;
          --chat-their-text: #0f172a;
          --chat-surface: var(--bg-card, #ffffff);
          --chat-surface-muted: var(--bg-body, #f8fafc);
          --chat-border: var(--border-color, #e2e8f0);
          --chat-text: var(--text-primary, #0f172a);
          --chat-text-muted: var(--text-secondary, #64748b);
          --chat-active-row: #eff6ff;

          height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s ease-in-out;
        }
        [data-theme="dark"] .chat-page {
          --chat-their-bubble: #2a3142;
          --chat-their-text: #f1f5f9;
          --chat-active-row: #1e2a44;
        }
        .chat-shell {
          flex: 1;
          display: flex;
          background: var(--chat-surface);
          border-radius: var(--radius-lg, 12px);
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
          overflow: hidden;
          border: 1px solid var(--chat-border);
          min-height: 0;
        }
        .chat-panel {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .list-panel {
          width: 300px;
          border-right: 1px solid var(--chat-border);
          background: var(--chat-surface);
        }
        .chat-window {
          flex: 1;
          min-width: 0;
          background: var(--chat-surface-muted);
        }
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--chat-border);
        }
        .list-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          color: var(--chat-text);
        }
        .new-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.7rem;
          border-radius: 8px;
          border: none;
          background: var(--chat-brand);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .new-btn:hover { background: var(--chat-brand-hover); }
        .list-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          margin: 0.5rem;
          border: 1px solid var(--chat-border);
          border-radius: 8px;
          background: var(--chat-surface-muted);
          color: var(--chat-text-muted);
        }
        .list-search input {
          flex: 1;
          border: none;
          background: none;
          font-size: 0.85rem;
          outline: none;
          color: var(--chat-text);
        }
        .list-search input::placeholder { color: var(--chat-text-muted); }
        .list-body {
          flex: 1;
          overflow-y: auto;
        }
        .muted-center {
          padding: 1rem;
          font-size: 0.85rem;
          color: var(--chat-text-muted);
          text-align: center;
        }
        .conv-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          border-bottom: 1px solid var(--chat-border);
          cursor: pointer;
          color: var(--chat-text);
        }
        .conv-row:hover { background: var(--chat-surface-muted); }
        .conv-row.active { background: var(--chat-active-row); }
        .conv-meta { flex: 1; min-width: 0; }
        .conv-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
        }
        .conv-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--chat-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .conv-time {
          font-size: 0.7rem;
          color: var(--chat-text-muted);
          flex-shrink: 0;
        }
        .conv-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-top: 2px;
        }
        .conv-snippet {
          font-size: 0.78rem;
          color: var(--chat-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .unread-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--chat-brand);
          flex-shrink: 0;
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--chat-surface);
          border-bottom: 1px solid var(--chat-border);
        }
        .back-btn {
          display: none;
          border: none;
          background: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          color: var(--chat-text-muted);
        }
        .header-meta { min-width: 0; }
        .header-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--chat-text);
        }
        .header-role {
          font-size: 0.7rem;
          color: var(--chat-text-muted);
          text-transform: capitalize;
        }
        .messages-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--chat-surface-muted);
        }
        .bubble-row {
          display: flex;
        }
        .bubble-row.own { justify-content: flex-end; }
        .bubble-row.their { justify-content: flex-start; }
        .bubble-row.grouped { margin-top: -6px; }
        .bubble-wrap {
          max-width: min(72%, 520px);
          display: flex;
          flex-direction: column;
        }
        .bubble-sender {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--chat-text-muted);
          padding: 0 4px 2px;
        }
        .bubble {
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 0.9rem;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .bubble-own {
          background: var(--chat-own-bubble);
          color: var(--chat-own-text);
          border-bottom-right-radius: 4px;
        }
        .bubble-their {
          background: var(--chat-their-bubble);
          color: var(--chat-their-text);
          border-bottom-left-radius: 4px;
        }
        .bubble-deleted {
          color: var(--chat-text-muted) !important;
          font-style: italic;
          background: transparent !important;
          border: 1px dashed var(--chat-border);
        }
        .bubble-time {
          font-size: 0.65rem;
          color: var(--chat-text-muted);
          margin-top: 2px;
          padding: 0 4px;
        }
        .bubble-row.own .bubble-time { text-align: right; }
        .send-failed { color: #ef4444; }
        .new-messages-pill {
          position: absolute;
          right: 1rem;
          bottom: 90px;
          background: var(--chat-brand);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        }
        .input-row {
          display: flex;
          gap: 0.5rem;
          align-items: flex-end;
          padding: 0.75rem;
          border-top: 1px solid var(--chat-border);
          background: var(--chat-surface);
        }
        .chat-input {
          flex: 1;
          resize: none;
          border-radius: 20px;
          padding: 10px 16px;
          border: 1px solid var(--chat-border);
          background: var(--chat-surface-muted);
          color: var(--chat-text);
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1.5;
          max-height: 120px;
          outline: none;
          overflow-y: auto;
        }
        .chat-input::placeholder { color: var(--chat-text-muted); }
        .chat-input:focus {
          border-color: var(--chat-brand);
          background: var(--chat-surface);
        }
        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--chat-brand);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .send-btn:hover:not(:disabled) { background: var(--chat-brand-hover); }
        .send-btn:disabled {
          background: var(--chat-border);
          color: var(--chat-text-muted);
          cursor: default;
        }
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--chat-text-muted);
          text-align: center;
          padding: 2rem;
        }
        .empty-title { font-weight: 600; font-size: 1rem; margin: 8px 0 0; color: var(--chat-text); }
        .empty-sub   { font-size: 0.85rem; margin: 0; }

        @media (max-width: 767px) {
          .list-panel { width: 100%; }
          .chat-panel.hide-mobile { display: none; }
          .chat-window { position: relative; }
          .back-btn { display: inline-flex; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MessagesPage;
