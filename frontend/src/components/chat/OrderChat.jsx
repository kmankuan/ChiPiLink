/**
 * OrderChat - Chat thread connected to Monday.com Updates for a textbook order
 * Shows conversation between client user and staff via Monday.com CRM
 */
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  MessageCircle,
  Send,
  Loader2,
  X,
  User,
  Headphones,
  ChevronDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function OrderChat({ orderId, studentName, isOpen, onClose, lang = 'es' }) {
  const { token } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef(null);

  const t = {
    en: { title: 'Messages', placeholder: 'Type a message...', send: 'Send', empty: 'No messages yet. Send a message to start the conversation.', staffLabel: 'Staff', youLabel: 'You' },
    es: { title: 'Mensajes', placeholder: 'Escribe un mensaje...', send: 'Enviar', empty: 'Sin mensajes aún. Envía un mensaje para iniciar la conversación.', staffLabel: 'Equipo', youLabel: 'Tú' },
    zh: { title: '消息', placeholder: '输入消息...', send: '发送', empty: '暂无消息。发送消息开始对话。', staffLabel: '团队', youLabel: '你' },
  }[lang] || {
    title: 'Mensajes', placeholder: 'Escribe un mensaje...', send: 'Enviar', empty: 'Sin mensajes aún. Envía un mensaje para iniciar la conversación.', staffLabel: 'Equipo', youLabel: 'Tú'
  };

  const fetchUpdates = async () => {
    if (!orderId || !token) return;
    try {
      const res = await fetch(`${API}/api/store/textbook-orders/${orderId}/updates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      }
    } catch (e) {
      console.error('Error fetching updates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUpdates();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/store/textbook-orders/${orderId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() })
      });
      if (res.ok) {
        setMessage('');
        await fetchUpdates();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error');
      }
    } catch (e) {
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col shadow-2xl"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.title}</h3>
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{studentName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[50vh]" data-testid="chat-messages">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8">
              <Headphones className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">{t.empty}</p>
            </div>
          ) : (
            updates.map((u, i) => (
              <div key={u.id || i} className={`flex ${u.is_staff ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] ${u.is_staff ? '' : ''}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm ${
                    u.is_staff
                      ? 'bg-muted rounded-tl-sm'
                      : 'bg-purple-600 text-white rounded-tr-sm'
                  }`}>
                    {u.body}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 ${u.is_staff ? '' : 'justify-end'}`}>
                    <span className="text-[10px] text-muted-foreground">
                      {u.is_staff ? u.author || t.staffLabel : t.youLabel}
                    </span>
                    {u.created_at && (
                      <span className="text-[10px] text-muted-foreground/60">
                        &middot; {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="border-t px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t.placeholder}
              className="flex-1 text-sm bg-muted/50 rounded-full px-4 py-2 border-0 outline-none focus:ring-2 focus:ring-purple-500"
              disabled={sending}
              data-testid="chat-input"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="h-9 w-9 rounded-full p-0 bg-purple-600 hover:bg-purple-700 shrink-0"
              data-testid="chat-send-btn"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
