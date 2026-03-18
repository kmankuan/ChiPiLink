/**
 * LiveChat — Real-time chat for sport matches using Ably
 * Supports: messages, reactions, auto-translation (via OpenAI)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAblyChat, useAblyPresence } from './AblyProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Globe } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LiveChat({ roomId, userName = 'Spectator', compact = false }) {
  const chatClient = useAblyChat();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [room, setRoom] = useState(null);
  const scrollRef = useRef(null);
  const members = useAblyPresence(roomId ? `sport:${roomId}` : null);

  // Connect to chat room
  useEffect(() => {
    if (!chatClient || !roomId) return;
    
    let chatRoom;
    const setup = async () => {
      try {
        chatRoom = chatClient.rooms.get(`sport:${roomId}`, {
          messages: { subscribe: true },
          presence: { enter: true },
        });
        setRoom(chatRoom);
        
        // Subscribe to messages
        const { unsubscribe } = chatRoom.messages.subscribe((event) => {
          const msg = event.message || event;
          setMessages(prev => [...prev.slice(-100), {
            id: msg.serial || Date.now(),
            text: msg.text || msg.data?.text || '',
            sender: msg.clientId || msg.data?.sender || 'anonymous',
            senderName: msg.data?.senderName || msg.clientId || 'User',
            timestamp: msg.createdAt || new Date().toISOString(),
            translation: msg.data?.translation,
          }]);
        });

        // Load recent history
        try {
          const history = await chatRoom.messages.get({ limit: 30, direction: 'backwards' });
          if (history?.items?.length > 0) {
            const historical = history.items.reverse().map(msg => ({
              id: msg.serial || msg.timeserial || Date.now(),
              text: msg.text || msg.data?.text || '',
              sender: msg.clientId || 'anonymous',
              senderName: msg.data?.senderName || msg.clientId || 'User',
              timestamp: msg.createdAt || '',
              translation: msg.data?.translation,
            }));
            setMessages(historical);
          }
        } catch (e) {
          console.log('No chat history:', e);
        }

        return unsubscribe;
      } catch (e) {
        console.error('Chat room error:', e);
      }
    };
    
    const cleanup = setup();
    return () => { cleanup?.then(unsub => unsub?.()); };
  }, [chatClient, roomId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !room) return;
    setSending(true);
    try {
      // Send via backend for auto-translation
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/ably/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ room_id: roomId, text: input.trim() }),
      });
      if (res.ok) {
        setInput('');
      } else {
        // Fallback: send directly to Ably without translation
        await room.messages.send({
          text: input.trim(),
          data: { senderName: userName, text: input.trim() },
        });
        setInput('');
      }
    } catch (e) {
      // Fallback: direct send
      try {
        await room.messages.send({
          text: input.trim(),
          data: { senderName: userName, text: input.trim() },
        });
        setInput('');
      } catch (e2) {
        console.error('Send error:', e2);
      }
    }
    setSending(false);
  };

  const height = compact ? 'h-32' : 'h-48';

  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-black/20 border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-black/30">
        <span className="text-[10px] text-white/40 font-bold">💬 Chat</span>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-white/30" />
          <span className="text-[9px] text-white/30">{members.length}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className={`${height} overflow-y-auto px-2 py-1 space-y-0.5`}>
        {messages.length === 0 ? (
          <p className="text-white/20 text-[10px] text-center py-4">No messages yet. Say something!</p>
        ) : messages.map((msg, i) => (
          <div key={msg.id || i} className="text-[10px]">
            <span className="font-bold text-white/60">{msg.senderName}: </span>
            <span className="text-white/80">{msg.text}</span>
            {msg.translation && (
              <span className="text-white/30 italic ml-1">
                <Globe className="inline h-2.5 w-2.5 mr-0.5" />
                {msg.translation}
              </span>
            )}
            {msg.translations && Object.keys(msg.translations).length > 0 && !msg.translation && (
              <span className="text-white/30 italic ml-1">
                <Globe className="inline h-2.5 w-2.5 mr-0.5" />
                {Object.values(msg.translations)[0]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1 px-1.5 py-1 bg-black/30">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Type message..."
          className="h-7 text-[10px] bg-white/5 border-white/10 text-white placeholder-white/20 flex-1"
        />
        <Button size="sm" className="h-7 w-7 p-0 bg-white/10 hover:bg-white/20" onClick={sendMessage} disabled={sending || !input.trim()}>
          <Send className="h-3 w-3 text-white/60" />
        </Button>
      </div>
    </div>
  );
}
