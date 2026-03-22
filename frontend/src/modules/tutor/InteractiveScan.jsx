import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bot, Send, Loader2, StopCircle, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' });

export default function InteractiveScan({ studentId, studentName }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const pollRef = useRef(null);

  const startScan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tutor/interactive-scan/start/${studentId}`, { method: 'POST', headers: getHeaders() });
      if (res.ok) { const s = await res.json(); setSession(s); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Failed to start'); }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!selectedAction || !session) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tutor/interactive-scan/session/${session.session_id}/answer`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ action: selectedAction, value: answerValue, save_to_playbook: true }),
      });
      if (res.ok) { const s = await res.json(); setSession(s); setAnswerValue(''); setSelectedAction(''); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Failed'); }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  const stopScan = async () => {
    if (!session) return;
    await fetch(`${API}/api/tutor/interactive-scan/session/${session.session_id}/stop`, { method: 'POST', headers: getHeaders() });
    setSession(null);
    toast.info('Scan stopped');
  };

  // Poll for session updates
  useEffect(() => {
    if (!session || session.status === 'completed' || session.status === 'stopped' || session.status === 'failed') return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API}/api/tutor/interactive-scan/session/${session.session_id}`, { headers: getHeaders() });
      if (res.ok) { const s = await res.json(); setSession(s); }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [session?.session_id, session?.status]);

  const statusColor = { started: 'bg-blue-100 text-blue-700', navigating: 'bg-blue-100 text-blue-700', waiting_admin: 'bg-amber-100 text-amber-700', executing: 'bg-purple-100 text-purple-700', extracting: 'bg-green-100 text-green-700', completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', stopped: 'bg-gray-100 text-gray-600' };

  if (!session) {
    return (
      <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-xs h-8 gap-1" onClick={startScan} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
        AI Scan (Interactive)
      </Button>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1">
            <Bot className="h-3.5 w-3.5 text-purple-600" /> AI Scan: {studentName}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge className={`text-[9px] ${statusColor[session.status] || ''}`}>{session.status}</Badge>
            {session.status !== 'completed' && session.status !== 'stopped' && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={stopScan}><StopCircle className="h-3 w-3 text-red-500" /></Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {/* Screenshot */}
        {session.screenshot && (
          <div className="rounded border overflow-hidden">
            <img src={`data:image/jpeg;base64,${session.screenshot}`} alt="Page" className="w-full" />
          </div>
        )}

        {/* Page text preview */}
        {session.page_text && (
          <div className="bg-muted/50 rounded p-2 max-h-20 overflow-y-auto">
            <p className="text-[9px] text-muted-foreground font-mono">{session.page_text}</p>
          </div>
        )}

        {/* AI Question */}
        {session.question && session.status === 'waiting_admin' && (
          <div className="space-y-2">
            <p className="text-xs font-medium">{session.question.text}</p>
            
            <div className="space-y-1">
              {(session.question.options || []).map(opt => (
                <button key={opt.action}
                  className={`w-full text-left p-2 rounded border text-xs transition-colors ${selectedAction === opt.action ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => { setSelectedAction(opt.action); setAnswerValue(opt.action === 'done' || opt.action === 'skip' ? '' : answerValue); }}>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            {selectedAction && selectedAction !== 'done' && selectedAction !== 'skip' && (
              <Input className="h-8 text-xs" value={answerValue} onChange={e => setAnswerValue(e.target.value)}
                placeholder={(session.question.options || []).find(o => o.action === selectedAction)?.placeholder || 'Enter value...'} 
                onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }} />
            )}

            <Button size="sm" className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700 gap-1" onClick={submitAnswer} disabled={!selectedAction || loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {selectedAction === 'done' ? 'Finish' : selectedAction === 'extract' ? 'Extract Data' : 'Execute & Continue'}
            </Button>
          </div>
        )}

        {/* Completed */}
        {session.status === 'completed' && (
          <div className="text-center py-2">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-700">Scan complete! {session.items_found || 0} items found</p>
            <Button size="sm" variant="outline" className="text-xs h-7 mt-2" onClick={() => setSession(null)}>Close</Button>
          </div>
        )}

        {/* Steps taken */}
        {session.steps?.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-[9px] font-bold text-muted-foreground mb-1">Steps ({session.steps.length}):</p>
            {session.steps.map((s, i) => (
              <div key={i} className="text-[9px] text-muted-foreground flex items-center gap-1">
                <span className="font-mono">{i+1}.</span> {s.action}: {s.value?.substring(0, 40)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
