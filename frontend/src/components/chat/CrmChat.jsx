/**
 * CrmChat — Multi-topic chat connected to Monday.com CRM board
 * Shows topics (Updates) and their replies for a student's CRM item.
 * Supports: browsing topics, viewing thread, creating new topic, replying.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Loader2, X, ArrowLeft, Plus,
  Headphones, ChevronRight, Clock, User
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function TopicList({ topics, onSelect, onNewTopic, studentName, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2">
        <Button
          size="sm"
          onClick={onNewTopic}
          className="w-full gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
          data-testid="new-topic-btn"
        >
          <Plus className="h-3.5 w-3.5" /> New Topic
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2" data-testid="topic-list">
        {topics.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Headphones className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              No conversations yet. Start one!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {topics.map((topic) => {
              const preview = topic.body?.slice(0, 80) || '';
              const subject = preview.match(/^\[(.+?)\]/)?.[1] || 'Message';
              const bodyPreview = preview.replace(/^\[.+?\]\s*/, '').replace(/^From:.*\n?/, '').trim();
              return (
                <button
                  key={topic.id}
                  onClick={() => onSelect(topic)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/60 transition-colors group"
                  data-testid={`topic-${topic.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{subject}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{bodyPreview || '...'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/60">{topic.author}</span>
                        {topic.reply_count > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {topic.reply_count} replies
                          </Badge>
                        )}
                        {topic.created_at && (
                          <span className="text-[10px] text-muted-foreground/60 ml-auto">
                            {new Date(topic.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadView({ topic, studentId, token, onBack, isAdmin, adminId }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef(null);

  const fetchReplies = useCallback(async () => {
    if (!topic?.id) return;
    try {
      const prefix = isAdmin ? `/api/store/crm-chat/admin/${studentId}/topics` : `/api/store/crm-chat/${studentId}/topics/${topic.id}`;
      const url = isAdmin ? `${API}/api/store/crm-chat/admin/${studentId}/topics` : `${API}/api/store/crm-chat/${studentId}/topics/${topic.id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (isAdmin) {
          const t = (data.topics || []).find((t) => String(t.id) === String(topic.id));
          setReplies(t?.replies || []);
        } else {
          setReplies(data.replies || []);
        }
      }
    } catch (e) {
      console.error('Error fetching replies:', e);
    } finally {
      setLoading(false);
    }
  }, [topic, studentId, token, isAdmin]);

  useEffect(() => {
    setLoading(true);
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const url = isAdmin
        ? `${API}/api/store/crm-chat/admin/${studentId}/topics/${topic.id}/reply`
        : `${API}/api/store/crm-chat/${studentId}/topics/${topic.id}/reply`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (res.ok) {
        setMessage('');
        await fetchReplies();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error sending');
      }
    } catch {
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const subject = topic.body?.match(/^\[(.+?)\]/)?.[1] || 'Conversation';

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 w-7 p-0" data-testid="thread-back-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{subject}</p>
          <p className="text-[10px] text-muted-foreground truncate">{topic.author}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]" data-testid="thread-messages">
        {/* Original topic message */}
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="rounded-2xl px-3 py-2 text-sm bg-muted rounded-tl-sm">
              {topic.body?.replace(/^\[.+?\]\s*\n*/, '').replace(/^From:.*\n?/, '') || topic.body}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{topic.author}</span>
              {topic.created_at && (
                <span className="text-[10px] text-muted-foreground/60">
                  &middot; {new Date(topic.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          replies.map((r, i) => {
            const isStaff = r.author?.includes('Staff') || false;
            const isClient = !isStaff;
            const displayBody = r.body?.replace(/^\[.+?\]:\s*/, '') || r.body;
            return (
              <div key={r.id || i} className={`flex ${isClient && !isAdmin ? 'justify-end' : isStaff && isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3 py-2 text-sm ${
                    (isClient && !isAdmin) || (isStaff && isAdmin)
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  }`}>
                    {displayBody}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 ${(isClient && !isAdmin) || (isStaff && isAdmin) ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">{r.author}</span>
                    {r.created_at && (
                      <span className="text-[10px] text-muted-foreground/60">
                        &middot; {new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Reply input */}
      <div className="border-t px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Reply..."
            className="flex-1 text-sm bg-muted/50 rounded-full px-4 py-2 border-0 outline-none focus:ring-2 focus:ring-purple-500"
            disabled={sending}
            data-testid="thread-reply-input"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="h-9 w-9 rounded-full p-0 bg-purple-600 hover:bg-purple-700 shrink-0"
            data-testid="thread-send-btn"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewTopicForm({ studentId, token, onBack, onCreated, isAdmin }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const QUICK_SUBJECTS = ['Order Question', 'Payment Issue', 'Delivery Update', 'General Inquiry', 'Grade Change'];

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSending(true);
    try {
      const url = isAdmin
        ? `${API}/api/store/crm-chat/admin/${studentId}/topics`
        : `${API}/api/store/crm-chat/${studentId}/topics`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (res.ok) {
        toast.success('Topic created');
        onCreated();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error creating topic');
      }
    } catch {
      toast.error('Error creating topic');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 w-7 p-0" data-testid="new-topic-back-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-xs font-semibold">New Topic</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quick select</label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  subject === s
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-muted/50 text-muted-foreground hover:border-purple-300'
                }`}
                data-testid={`quick-subject-${s.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this about?"
            className="h-9 text-sm"
            data-testid="new-topic-subject"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question or issue..."
            rows={4}
            className="w-full text-sm bg-muted/50 rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            data-testid="new-topic-message"
          />
        </div>
      </div>
      <div className="border-t px-4 py-3 shrink-0">
        <Button
          onClick={handleCreate}
          disabled={!subject.trim() || !message.trim() || sending}
          className="w-full gap-1.5 bg-purple-600 hover:bg-purple-700"
          data-testid="create-topic-submit"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}

export default function CrmChat({ studentId, studentName, isOpen, onClose, isAdmin = false }) {
  const { token } = useAuth();
  const [view, setView] = useState('topics'); // topics | thread | new
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mondayLinked, setMondayLinked] = useState(false);

  const fetchTopics = useCallback(async () => {
    if (!studentId || !token) return;
    setLoading(true);
    try {
      const url = isAdmin
        ? `${API}/api/store/crm-chat/admin/${studentId}/topics`
        : `${API}/api/store/crm-chat/${studentId}/topics`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
        setMondayLinked(data.monday_linked || false);
      }
    } catch (e) {
      console.error('Error fetching topics:', e);
    } finally {
      setLoading(false);
    }
  }, [studentId, token, isAdmin]);

  useEffect(() => {
    if (isOpen) {
      setView('topics');
      setSelectedTopic(null);
      fetchTopics();
    }
  }, [isOpen, fetchTopics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col shadow-2xl"
        style={{ maxHeight: '80vh', height: '70vh' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="crm-chat-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Messages</h3>
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {studentName}
                {!mondayLinked && !loading && (
                  <span className="text-amber-500 ml-1">(not linked to CRM)</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" data-testid="crm-chat-close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === 'topics' && (
            <TopicList
              topics={topics}
              loading={loading}
              studentName={studentName}
              onSelect={(topic) => {
                setSelectedTopic(topic);
                setView('thread');
              }}
              onNewTopic={() => setView('new')}
            />
          )}
          {view === 'thread' && selectedTopic && (
            <ThreadView
              topic={selectedTopic}
              studentId={studentId}
              token={token}
              isAdmin={isAdmin}
              onBack={() => {
                setView('topics');
                setSelectedTopic(null);
                fetchTopics();
              }}
            />
          )}
          {view === 'new' && (
            <NewTopicForm
              studentId={studentId}
              token={token}
              isAdmin={isAdmin}
              onBack={() => setView('topics')}
              onCreated={() => {
                setView('topics');
                fetchTopics();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
