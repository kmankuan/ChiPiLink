/**
 * Parent Portal — Parent sees child's progress, school feed, messages, worksheets
 * Accessible via /tutor/parent (auto-detects linked student)
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { GraduationCap, BookOpen, Bell, MessageCircle, Clock, FileText, Send, Bot, Loader2, TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { AblyChatProvider, useAblyChannel } from '@/modules/ably/AblyProvider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function ParentChat({ studentId, parentName }) {
  const getToken = () => localStorage.getItem('auth_token');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/tutor/parent/messages`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : []).then(m => setMessages(m.reverse())).catch(() => {});
  }, []);

  // Real-time via Ably
  useAblyChannel(studentId ? `tutor:parent:${studentId}` : null, (event, data) => {
    if (event === 'new_message' && data.sender !== 'parent') {
      setMessages(prev => [...prev, { sender_type: 'staff', sender_name: 'Staff', message: data.text, created_at: new Date().toISOString() }]);
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/api/tutor/parent/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(prev => [...prev, msg]);
        setInput('');
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="flex flex-col h-64">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No messages yet. Send a message to the tutoring team.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender_type === 'parent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs ${
              m.sender_type === 'parent' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-muted rounded-bl-sm'
            }`}>
              {m.sender_type !== 'parent' && <p className="text-[9px] font-bold text-muted-foreground mb-0.5">{m.sender_name || 'Staff'}</p>}
              <p>{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 p-2 border-t">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Type message..." className="h-8 text-xs flex-1" disabled={sending} />
        <Button size="sm" className="h-8 bg-green-600" onClick={send} disabled={sending || !input.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function AgentAsk({ studentId }) {
  const getToken = () => localStorage.getItem('auth_token');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ask = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setAsking(true);
    try {
      const r = await fetch(`${API}/api/tutor/parent/ask-agent`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      if (r.ok) {
        const d = await r.json();
        setMessages(prev => [...prev, { role: 'agent', text: d.response }]);
      }
    } catch {}
    setAsking(false);
  };

  return (
    <div className="flex flex-col h-64">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <Bot className="h-8 w-8 text-green-300 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Ask about your child's progress</p>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {['我儿子这周怎么样？', 'How is my child doing?', '¿Cómo va mi hijo?'].map(s => (
                <button key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs ${
              m.role === 'user' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-muted rounded-bl-sm'
            }`}>
              {m.role === 'agent' && <Badge className="text-[7px] h-3 mb-0.5 bg-green-100 text-green-700"><Bot className="h-2 w-2 mr-0.5" /> AI</Badge>}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {asking && <div className="flex justify-start"><div className="px-3 py-1.5 rounded-2xl bg-muted"><Loader2 className="h-4 w-4 animate-spin text-green-600" /></div></div>}
      </div>
      <div className="flex gap-1 p-2 border-t">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(); }}
          placeholder="Ask about your child..." className="h-8 text-xs flex-1" disabled={asking} />
        <Button size="sm" className="h-8 bg-green-600" onClick={ask} disabled={asking || !input.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

const PERF_COLORS = { excellent: '#10b981', good: '#3b82f6', fair: '#f59e0b', needs_work: '#ef4444' };
const PERF_LABELS = { excellent: 'Excellent', good: 'Good', fair: 'Fair', needs_work: 'Needs Work' };

function ProgressCharts({ sessions = [], stats = {}, learningProfile = {} }) {
  // Performance distribution pie chart
  const perfCounts = {};
  sessions.forEach(s => {
    const p = s.student_performance || 'fair';
    perfCounts[p] = (perfCounts[p] || 0) + 1;
  });
  const perfData = Object.entries(perfCounts).map(([key, val]) => ({
    name: PERF_LABELS[key] || key,
    value: val,
    color: PERF_COLORS[key] || '#94a3b8',
  }));

  // Sessions per week (last 8 weeks)
  const weeklyData = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = sessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    const mins = sessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= weekStart && d < weekEnd;
    }).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    weeklyData.push({
      week: `W${8 - w}`,
      sessions: count,
      minutes: mins,
    });
  }

  // Subject breakdown
  const subjectCounts = {};
  sessions.forEach(s => {
    const subj = s.subject || 'Other';
    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
  });
  const subjectData = Object.entries(subjectCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const SUBJ_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No session data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Charts will appear after tutoring sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Weekly Activity */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center gap-1"><Calendar className="h-4 w-4" /> Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="sessions" fill="#10b981" radius={[4, 4, 0, 0]} name="Sessions" />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {/* Performance Distribution */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {perfData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={perfData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={3}>
                    {perfData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">No data</p>
            )}
            <div className="flex flex-wrap gap-1 justify-center mt-1">
              {perfData.map(d => (
                <span key={d.name} className="text-[8px] flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subject Breakdown */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Subjects</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={3}>
                    {subjectData.map((d, i) => <Cell key={i} fill={SUBJ_COLORS[i % SUBJ_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">No data</p>
            )}
            <div className="flex flex-wrap gap-1 justify-center mt-1">
              {subjectData.map((d, i) => (
                <span key={d.name} className="text-[8px] flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: SUBJ_COLORS[i % SUBJ_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Profile */}
      {(learningProfile.strengths || learningProfile.weaknesses) && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Learning Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {learningProfile.learning_style && (
              <p className="text-xs mb-2"><span className="font-semibold">Style:</span> {learningProfile.learning_style}</p>
            )}
            {learningProfile.strengths?.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold text-green-700 mb-1">💪 Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {learningProfile.strengths.map(s => (
                    <Badge key={s} variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {learningProfile.weaknesses?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-700 mb-1">🎯 Areas to Improve</p>
                <div className="flex flex-wrap gap-1">
                  {learningProfile.weaknesses.map(w => (
                    <Badge key={w} variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">{w}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ParentPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const getToken = () => localStorage.getItem('auth_token');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    fetch(`${API}/api/tutor/parent/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>;

  if (!data?.linked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
        <GraduationCap className="h-16 w-16 text-green-300 mb-4" />
        <h1 className="text-xl font-bold mb-2">ChiPi Tutor</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">{data?.message || 'No student linked to your account.'}</p>
        <p className="text-xs text-muted-foreground">Contact the club to link your child's profile.</p>
      </div>
    );
  }

  const s = data.student;
  const stats = data.stats || {};

  return (
    <AblyChatProvider clientId={user?.user_id || 'parent'}>
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">{(s.name||'?')[0]}</div>
            <div>
              <h1 className="text-lg font-bold text-white">{s.name}</h1>
              <p className="text-green-200 text-xs">{s.grade} · {s.school}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center px-2 py-1.5 rounded-lg bg-white/10">
              <p className="text-lg font-bold text-white">{stats.total_sessions || 0}</p>
              <p className="text-[9px] text-green-200">Sessions</p>
            </div>
            <div className="text-center px-2 py-1.5 rounded-lg bg-white/10">
              <p className="text-lg font-bold text-white">{stats.total_minutes || 0}</p>
              <p className="text-[9px] text-green-200">Minutes</p>
            </div>
            <div className="text-center px-2 py-1.5 rounded-lg bg-white/10">
              <p className="text-lg font-bold text-white">{stats.worksheets_generated || 0}</p>
              <p className="text-[9px] text-green-200">Worksheets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="overview" className="flex-1 text-xs gap-1"><TrendingUp className="h-3 w-3" /> Overview</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1 text-xs gap-1"><BarChart3 className="h-3 w-3" /> Progress</TabsTrigger>
            <TabsTrigger value="chat" className="flex-1 text-xs gap-1"><MessageCircle className="h-3 w-3" /> Chat</TabsTrigger>
            <TabsTrigger value="agent" className="flex-1 text-xs gap-1"><Bot className="h-3 w-3" /> Ask AI</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3">
            {/* Notifications */}
            {(data.notifications || []).length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-3">
                  <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1 mb-2"><Bell className="h-3.5 w-3.5" /> Notifications</h3>
                  {data.notifications.map(n => (
                    <div key={n.notif_id} className="py-1.5 border-b last:border-0 text-xs">
                      <p>{n.translated_message || n.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* School Feed */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><BookOpen className="h-4 w-4" /> School Updates</CardTitle></CardHeader>
              <CardContent className="p-2">
                {(data.school_feed || []).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">No school updates yet</p>
                ) : (
                  <div className="space-y-1">
                    {data.school_feed.slice(0, 8).map(f => (
                      <div key={f.feed_id} className="p-2 rounded bg-muted/30 text-xs">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Badge variant="outline" className="text-[8px] h-4">{f.type}</Badge>
                          {f.urgency === 'urgent' && <Badge className="bg-red-100 text-red-700 text-[8px] h-4">Urgent</Badge>}
                          {f.subject && <Badge variant="outline" className="text-[8px] h-4">{f.subject}</Badge>}
                        </div>
                        <p className="font-medium">{f.title}</p>
                        <p className="text-muted-foreground">{f.translated_content || f.display_content || f.content}</p>
                        {f.due_date && <p className="text-[9px] text-amber-600 mt-0.5">Due: {f.due_date}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-4 w-4" /> Recent Sessions</CardTitle></CardHeader>
              <CardContent className="p-2">
                {(data.sessions || []).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">No sessions yet</p>
                ) : (
                  <div className="space-y-1">
                    {data.sessions.slice(0, 5).map(s => (
                      <div key={s.session_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-xs">
                        <div>
                          <span className="font-medium">{s.subject}: {s.topic}</span>
                          <span className="text-muted-foreground ml-1">({s.duration_minutes} min)</span>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {s.student_performance === 'excellent' ? '⭐' : s.student_performance === 'good' ? '✅' : s.student_performance === 'fair' ? '⚠️' : '🚩'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Charts */}
          <TabsContent value="progress">
            <ProgressCharts
              sessions={data.sessions || []}
              stats={stats}
              learningProfile={data.learning_profile || {}}
            />
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><MessageCircle className="h-4 w-4" /> Chat with Staff</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ParentChat studentId={s.student_id} parentName={user?.name || 'Parent'} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ask AI Agent */}
          <TabsContent value="agent">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Bot className="h-4 w-4 text-green-600" /> Ask AI About {s.name}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <AgentAsk studentId={s.student_id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AblyChatProvider>
  );
}
