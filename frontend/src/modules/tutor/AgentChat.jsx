/**
 * Agent Chat — 3-mode chat with student's AI agent
 * Modes: staff (advisor), student (tutor), parent (translator)
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Bot, Users, GraduationCap, Loader2 } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const MODES = [
  { id: 'staff', label: 'Staff', icon: Users, color: 'bg-blue-600', desc: 'Get advice on what to teach' },
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'bg-green-600', desc: 'AI teaches the student' },
  { id: 'parent', label: 'Parent', icon: Bot, color: 'bg-purple-600', desc: 'Translated updates for parent' },
];

export default function AgentChat() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');
  const [student, setStudent] = useState(null);
  const [mode, setMode] = useState('staff');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/api/tutor/students/${studentId}`, { headers: h }).then(r => r.ok ? r.json() : null).then(setStudent).catch(() => {});
    fetch(`${API}/api/tutor/students/${studentId}/chat-history?limit=20`, { headers: h }).then(r => r.ok ? r.json() : []).then(hist => {
      setHistory(hist.reverse());
      setMessages(hist.reverse().map(h => [
        { role: 'user', text: h.message, mode: h.mode, name: h.user_name },
        { role: 'agent', text: h.response, mode: h.mode },
      ]).flat());
    }).catch(() => {});
  }, [studentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg, mode }]);
    setSending(true);

    try {
      const r = await fetch(`${API}/api/tutor/students/${studentId}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, mode }),
      });
      if (r.ok) {
        const data = await r.json();
        setMessages(prev => [...prev, { role: 'agent', text: data.response, mode }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', text: 'Error: Could not get response', mode }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Network error', mode }]);
    }
    setSending(false);
  };

  const currentMode = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate(`/tutor/student/${studentId}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <Bot className="h-5 w-5 text-white" />
            <div>
              <h1 className="text-sm font-bold text-white">{student?.name || 'Student'}'s Agent</h1>
              <p className="text-green-200 text-[10px]">Mode: {currentMode.label} — {currentMode.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 px-4 py-2 max-w-2xl mx-auto w-full">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-medium transition-all ${
              mode === m.id ? `${m.color} text-white` : 'bg-white/50 text-muted-foreground'
            }`}>
            <m.icon className="h-3 w-3" /> {m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 max-w-2xl mx-auto w-full space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-green-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Ask {student?.name}'s agent anything</p>
            <div className="flex flex-wrap gap-1 justify-center mt-3">
              {mode === 'staff' && [
                'What should I focus on today?',
                'Generate a Math worksheet',
                'How is this student doing overall?',
              ].map(s => (
                <button key={s} className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100" onClick={() => { setInput(s); }}>{s}</button>
              ))}
              {mode === 'parent' && [
                '我儿子这周怎么样？',
                '他需要买什么书吗？',
                'How is my child doing?',
              ].map(s => (
                <button key={s} className="text-[10px] px-2 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100" onClick={() => { setInput(s); }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-green-600 text-white rounded-br-sm'
                : 'bg-white border rounded-bl-sm shadow-sm'
            }`}>
              {msg.role === 'agent' && <Badge className="text-[8px] h-3.5 mb-1 bg-green-100 text-green-700"><Bot className="h-2 w-2 mr-0.5" /> Agent</Badge>}
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl bg-white border rounded-bl-sm shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-green-600" /></div></div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-2 bg-white border-t max-w-2xl mx-auto w-full">
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={mode === 'parent' ? '输入消息... / Type message...' : 'Ask the agent...'}
            className="flex-1 h-10" disabled={sending} />
          <Button className="h-10 bg-green-600" onClick={sendMessage} disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
