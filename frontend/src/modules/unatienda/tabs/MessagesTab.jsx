/**
 * MessagesTab — Admin CRM Messages Hub
 * Shows all customer conversations, allows replying and creating topics.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  MessageCircle, Search, Loader2, Inbox, User, Clock,
  ChevronRight, RefreshCw, Settings, Bell
} from 'lucide-react';
import CrmChat from '@/components/chat/CrmChat';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MessagesTab({ token }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [chatStudent, setChatStudent] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/crm-chat/admin/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Error fetching inbox:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.student_name?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="messages-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            Messages
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] h-5 px-1.5">{totalUnread}</Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Customer conversations via Monday.com CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setLoading(true); fetchInbox(); }}
            className="gap-1 text-xs"
            data-testid="refresh-inbox-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            className="gap-1 text-xs"
            data-testid="messages-config-btn"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && <CrmConfigPanel token={token} />}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{conversations.length}</span>
          <span className="text-muted-foreground">conversations</span>
        </div>
        {totalUnread > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-red-600">{totalUnread}</span>
            <span className="text-muted-foreground">unread</span>
          </div>
        )}
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or email..."
            className="pl-8 h-8 text-xs"
            data-testid="inbox-search"
          />
        </div>
      )}

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              {conversations.length === 0
                ? 'No conversations yet'
                : 'No conversations match your search'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              Conversations appear when students send messages
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((conv) => (
            <button
              key={conv.student_id}
              onClick={() => setChatStudent(conv)}
              className="w-full text-left p-3 rounded-xl border hover:bg-muted/30 transition-colors group flex items-center gap-3"
              data-testid={`conv-${conv.student_id}`}
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{conv.student_name}</span>
                  {conv.unread_count > 0 && (
                    <Badge className="bg-red-500 text-white text-[9px] h-4 px-1.5 shrink-0">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{conv.user_email}</p>
                {conv.last_topic && (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                    {conv.last_topic.body}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className="text-[9px]">
                  {conv.topic_count} topics
                </Badge>
                {conv.last_topic?.created_at && (
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(conv.last_topic.created_at).toLocaleDateString()}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat modal */}
      {chatStudent && (
        <CrmChat
          studentId={chatStudent.student_id}
          studentName={chatStudent.student_name}
          isOpen={!!chatStudent}
          onClose={() => {
            setChatStudent(null);
            fetchInbox();
          }}
          isAdmin={true}
        />
      )}
    </div>
  );
}

function CrmConfigPanel({ token }) {
  const [config, setConfig] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [saving, setSaving] = useState(false);
  const [webhookRegistering, setWebhookRegistering] = useState(false);
  const [webhookId, setWebhookId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/store/crm-chat/admin/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          setBoardId(data.board_id || '');
          setEmailCol(data.email_column_id || '');
          setWebhookId(data.webhook_id || '');
        }
        // Try to load columns if board is configured
        const colRes = await fetch(`${API}/api/store/crm-chat/admin/config/board-columns`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (colRes.ok) {
          const colData = await colRes.json();
          setColumns(colData.columns || []);
        }
      } catch (e) {
        console.error('Error loading config:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/store/crm-chat/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ board_id: boardId, email_column_id: emailCol }),
      });
      if (res.ok) {
        toast.success('CRM config saved');
      }
    } catch {
      toast.error('Error saving config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  const emailColumns = columns.filter((c) => c.type === 'email');

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <p className="text-xs font-bold">CRM Board Configuration</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Board ID</label>
            <Input
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="e.g. 5931665026"
              className="h-8 text-xs mt-0.5"
              data-testid="crm-config-board-id"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Email Column</label>
            {emailColumns.length > 0 ? (
              <select
                value={emailCol}
                onChange={(e) => setEmailCol(e.target.value)}
                className="w-full h-8 px-2 text-xs border rounded-md bg-background mt-0.5"
                data-testid="crm-config-email-col"
              >
                <option value="">Select...</option>
                {emailColumns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                ))}
              </select>
            ) : (
              <Input
                value={emailCol}
                onChange={(e) => setEmailCol(e.target.value)}
                placeholder="e.g. email"
                className="h-8 text-xs mt-0.5"
                data-testid="crm-config-email-col-input"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs" data-testid="save-crm-config">
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Save
          </Button>
          <Button
            size="sm"
            variant={webhookId ? 'outline' : 'default'}
            disabled={!boardId || webhookRegistering}
            onClick={async () => {
              setWebhookRegistering(true);
              try {
                const callbackUrl = `${API}/api/store/crm-chat/webhooks/update-created`;
                const res = await fetch(`${API}/api/store/crm-chat/admin/config/register-webhook`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ callback_url: callbackUrl }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setWebhookId(data.webhook_id);
                  toast.success('Push notifications webhook registered!');
                } else {
                  const err = await res.json();
                  toast.error(err.detail || 'Failed to register webhook');
                }
              } catch {
                toast.error('Error registering webhook');
              } finally {
                setWebhookRegistering(false);
              }
            }}
            className="text-xs gap-1"
            data-testid="register-webhook-btn"
          >
            {webhookRegistering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            {webhookId ? 'Re-register Webhook' : 'Enable Push Notifications'}
          </Button>
          {webhookId && (
            <Badge variant="outline" className="text-[9px] text-green-600 border-green-300">
              Webhook active
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
