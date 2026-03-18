/**
 * Worksheet Generator — AI creates study materials for students
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2, Zap, BookOpen, ListChecks, CreditCard } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const TYPES = [
  { value: 'worksheet', label: 'Worksheet', icon: FileText, desc: '10 questions, mixed difficulty' },
  { value: 'quiz', label: 'Quick Quiz', icon: ListChecks, desc: '5 multiple choice questions' },
  { value: 'study_guide', label: 'Study Guide', icon: BookOpen, desc: '1-page concept summary' },
  { value: 'flash_cards', label: 'Flash Cards', icon: CreditCard, desc: '10 term/definition pairs' },
];

export default function WorksheetGenerator() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [student, setStudent] = useState(null);
  const [worksheets, setWorksheets] = useState([]);
  const [form, setForm] = useState({ subject: '', topic: '', type: 'worksheet', difficulty: 'adaptive' });
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/tutor/students/${studentId}`, { headers }).then(r => r.ok ? r.json() : null).then(setStudent).catch(() => {});
    fetch(`${API}/api/tutor/students/${studentId}/worksheets`, { headers }).then(r => r.ok ? r.json() : []).then(setWorksheets).catch(() => {});
  }, [studentId]);

  const generate = async () => {
    if (!form.subject || !form.topic) { toast.error('Subject and topic required'); return; }
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/tutor/students/${studentId}/worksheets`, { method: 'POST', headers, body: JSON.stringify(form) });
      if (r.ok) {
        const ws = await r.json();
        toast.success('Generated!');
        setWorksheets(prev => [ws, ...prev]);
        setViewing(ws);
      } else { const e = await r.json(); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Error'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate(`/tutor/student/${studentId}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <Zap className="h-5 w-5 text-yellow-300" />
          <div><h1 className="text-base font-bold text-white">AI Worksheets</h1><p className="text-green-200 text-[10px]">{student?.name || 'Student'}</p></div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Generator */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} placeholder="Math" className="h-9" /></div>
              <div><Label className="text-xs">Topic</Label><Input value={form.topic} onChange={e => setForm(p => ({...p, topic: e.target.value}))} placeholder="Fractions Ch.5" className="h-9" /></div>
            </div>
            <div><Label className="text-xs">Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {TYPES.map(t => (
                  <button key={t.value} className={`text-left p-2 rounded-lg border transition-all text-xs ${form.type === t.value ? 'border-green-500 bg-green-50' : 'hover:border-green-200'}`}
                    onClick={() => setForm(p => ({...p, type: t.value}))}>
                    <t.icon className="h-3.5 w-3.5 inline mr-1" />{t.label}
                    <span className="block text-[9px] text-muted-foreground">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full h-10 bg-green-600" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              {generating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </CardContent>
        </Card>

        {/* Viewing */}
        {viewing && (
          <Card className="border-green-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><FileText className="h-4 w-4" /> {viewing.subject}: {viewing.topic} ({viewing.type})</CardTitle></CardHeader>
            <CardContent className="p-3">
              <div className="prose prose-sm max-w-none text-xs whitespace-pre-wrap bg-white rounded-lg p-3 border max-h-80 overflow-y-auto">{viewing.content}</div>
              <Button size="sm" variant="outline" className="mt-2 w-full text-xs" onClick={() => setViewing(null)}>Close</Button>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {worksheets.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Generated ({worksheets.length})</CardTitle></CardHeader>
            <CardContent className="p-2 space-y-1">
              {worksheets.map(ws => (
                <div key={ws.worksheet_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setViewing(ws)}>
                  <div className="text-xs"><span className="font-medium">{ws.subject}: {ws.topic}</span><Badge variant="outline" className="text-[8px] h-4 ml-1">{ws.type}</Badge></div>
                  <span className="text-[9px] text-muted-foreground">{new Date(ws.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
