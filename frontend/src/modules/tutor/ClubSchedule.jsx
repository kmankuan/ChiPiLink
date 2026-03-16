/**
 * Club Schedule — Today's plan, create sessions, start/stop timer
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Plus, Play, Square, Clock, BookOpen, GraduationCap, Timer, CheckCircle } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function formatDuration(startIso) {
  if (!startIso) return '0:00';
  const d = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  return `${Math.floor(d/60)}:${(d%60).toString().padStart(2,'0')}`;
}

export default function ClubSchedule() {
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [schedule, setSchedule] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEnd, setShowEnd] = useState(null);
  const [endNotes, setEndNotes] = useState({ tutor_notes: '', student_performance: '' });
  const [newItem, setNewItem] = useState({ student_id: '', subject: '', topic: '', time_start: '', time_end: '', tutor: '', type: 'study' });
  const [timer, setTimer] = useState({});
  const today = new Date().toISOString().split('T')[0];

  const fetchAll = () => {
    Promise.all([
      fetch(`${API}/api/tutor/schedule?date=${today}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/tutor/students`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/tutor/sessions/active`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([s, st, a]) => { setSchedule(s); setStudents(st); setActiveSessions(a); }).catch(() => {});
  };
  useEffect(() => { fetchAll(); }, []);

  // Timer tick
  useEffect(() => {
    const iv = setInterval(() => {
      const t = {};
      activeSessions.forEach(s => { t[s.session_id] = formatDuration(s.started_at); });
      setTimer(t);
    }, 1000);
    return () => clearInterval(iv);
  }, [activeSessions]);

  const addItem = async () => {
    const student = students.find(s => s.student_id === newItem.student_id);
    const r = await fetch(`${API}/api/tutor/schedule`, { method: 'POST', headers, body: JSON.stringify({ ...newItem, student_name: student?.name || '', date: today }) });
    if (r.ok) { toast.success('Added to schedule'); setShowAdd(false); fetchAll(); }
  };

  const startSession = async (scheduleId) => {
    const r = await fetch(`${API}/api/tutor/sessions/start/${scheduleId}`, { method: 'POST', headers, body: JSON.stringify({}) });
    if (r.ok) { toast.success('Session started!'); fetchAll(); }
    else { const e = await r.json(); toast.error(e.detail || 'Error'); }
  };

  const endSession = async () => {
    if (!showEnd) return;
    const r = await fetch(`${API}/api/tutor/sessions/${showEnd.session_id}/end`, { method: 'POST', headers, body: JSON.stringify(endNotes) });
    if (r.ok) { toast.success('Session completed!'); setShowEnd(null); setEndNotes({ tutor_notes: '', student_performance: '' }); fetchAll(); }
  };

  const activeMap = {};
  activeSessions.forEach(s => { activeMap[s.schedule_id] = s; });

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/tutor')}><ArrowLeft className="h-4 w-4" /></Button>
            <Calendar className="h-5 w-5 text-white" />
            <div><h1 className="text-base font-bold text-white">Today's Schedule</h1><p className="text-green-200 text-[10px]">{today}</p></div>
          </div>
          <Button size="sm" className="bg-white/20 text-white" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Active sessions alert */}
        {activeSessions.length > 0 && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1"><Timer className="h-3.5 w-3.5 animate-pulse" /> Active Sessions</h3>
              {activeSessions.map(s => (
                <div key={s.session_id} className="flex items-center justify-between py-1.5">
                  <div className="text-xs"><span className="font-medium">{s.student_name}</span> — {s.subject}: {s.topic}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-green-700">{timer[s.session_id] || '0:00'}</span>
                    <Button size="sm" className="h-7 bg-red-500 text-white text-xs" onClick={() => { setShowEnd(s); setEndNotes({ tutor_notes: '', student_performance: '' }); }}>
                      <Square className="h-3 w-3 mr-1" /> End
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Schedule items */}
        {schedule.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No sessions scheduled today</p>
            <p className="text-xs text-muted-foreground mt-1">Add study sessions for your students</p>
          </CardContent></Card>
        ) : (
          schedule.map(item => {
            const active = activeMap[item.schedule_id];
            return (
              <Card key={item.schedule_id} className={active ? 'border-green-300' : item.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <BookOpen className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.student_name || 'Student'}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{item.type}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{item.subject}: {item.topic} {item.time_start && `· ${item.time_start}-${item.time_end}`} {item.tutor && `· Tutor: ${item.tutor}`}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {active ? (
                        <Badge className="bg-green-600 text-white animate-pulse text-[10px]">
                          <Timer className="h-3 w-3 mr-0.5" /> {timer[active.session_id] || '...'}
                        </Badge>
                      ) : item.status === 'completed' ? (
                        <Badge className="bg-green-100 text-green-700 text-[9px]">✓ Done</Badge>
                      ) : (
                        <Button size="sm" className="h-7 text-xs bg-green-600" onClick={() => startSession(item.schedule_id)}>
                          <Play className="h-3 w-3 mr-1" /> Start
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add to Schedule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Student</Label>
              <Select value={newItem.student_id} onValueChange={v => setNewItem(p => ({ ...p, student_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.student_id} value={s.student_id}>{s.name} ({s.grade})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Subject</Label><Input value={newItem.subject} onChange={e => setNewItem(p => ({ ...p, subject: e.target.value }))} placeholder="Math" className="h-9" /></div>
              <div><Label className="text-xs">Topic</Label><Input value={newItem.topic} onChange={e => setNewItem(p => ({ ...p, topic: e.target.value }))} placeholder="Fractions" className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Start Time</Label><Input type="time" value={newItem.time_start} onChange={e => setNewItem(p => ({ ...p, time_start: e.target.value }))} className="h-9" /></div>
              <div><Label className="text-xs">End Time</Label><Input type="time" value={newItem.time_end} onChange={e => setNewItem(p => ({ ...p, time_end: e.target.value }))} className="h-9" /></div>
            </div>
            <div><Label className="text-xs">Tutor</Label><Input value={newItem.tutor} onChange={e => setNewItem(p => ({ ...p, tutor: e.target.value }))} placeholder="Maria" className="h-9" /></div>
          </div>
          <DialogFooter><Button onClick={addItem}>Add to Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session Dialog */}
      <Dialog open={!!showEnd} onOpenChange={() => setShowEnd(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>End Session — {showEnd?.student_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{showEnd?.subject}: {showEnd?.topic} · Duration: {showEnd && timer[showEnd.session_id]}</p>
            <div><Label className="text-xs">How did the student perform?</Label>
              <Select value={endNotes.student_performance} onValueChange={v => setEndNotes(p => ({ ...p, student_performance: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent ⭐</SelectItem>
                  <SelectItem value="good">Good ✅</SelectItem>
                  <SelectItem value="fair">Fair ⚠️</SelectItem>
                  <SelectItem value="poor">Needs More Work 🚩</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Tutor Notes</Label>
              <Textarea value={endNotes.tutor_notes} onChange={e => setEndNotes(p => ({ ...p, tutor_notes: e.target.value }))} placeholder="How did the session go? What to focus on next..." className="min-h-[80px] text-xs" />
            </div>
          </div>
          <DialogFooter><Button onClick={endSession} className="bg-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Complete Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
