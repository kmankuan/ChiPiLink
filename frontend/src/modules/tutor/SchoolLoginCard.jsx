import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { School, Key, Globe, Loader2, Eye, EyeOff, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' });

const PLATFORMS = [
  { id: 'imereb', name: 'iMereb / BS Educativo', url: 'https://bseducativo.com/MrbRoot/mrbindex.aspx' },
  { id: 'smart_academy', name: 'Smart Academy (ISAE)', url: 'https://apps.smartacademy.edu.pa/isae/login1.asp' },
  { id: 'other', name: 'Other (custom URL)', url: '' },
];

export default function SchoolLoginCard({ student, onUpdate }) {
  const creds = student.school_credentials || {};
  const [platform, setPlatform] = useState(student.school_platform || '');
  const [url, setUrl] = useState(creds.url || '');
  const [username, setUsername] = useState(creds.username || '');
  const [password, setPassword] = useState(creds.password || '');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reading, setReading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handlePlatformChange = (pid) => {
    setPlatform(pid);
    const p = PLATFORMS.find(x => x.id === pid);
    if (p && p.url) setUrl(p.url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/tutor/students/${student.student_id}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({
          school_platform: platform,
          school_credentials: { url, username, password },
        }),
      });
      if (res.ok) { toast.success('Credentials saved'); if (onUpdate) onUpdate(); }
      else toast.error('Save failed');
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!url || !username || !password) { toast.error('Fill all fields first'); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${API}/api/tutor/students/${student.student_id}/test-school-login`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ credentials: { url, username, password } }),
      });
      if (res.ok) { setTestResult(await res.json()); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Test failed'); }
    } catch { toast.error('Network error'); }
    setTesting(false);
  };

  const handleRead = async () => {
    if (!url || !username || !password) { toast.error('Save credentials first'); return; }
    setReading(true);
    toast.info('Reading school platform...');
    try {
      const res = await fetch(`${API}/api/tutor/students/${student.student_id}/read-school`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ credentials: { url, username, password } }),
      });
      if (res.ok) {
        const r = await res.json();
        toast.success(`Found ${r.items?.length || 0} items! ${r.errors?.length || 0} errors`);
      } else { const e = await res.json().catch(() => ({})); toast.error(e.detail || 'Read failed'); }
    } catch { toast.error('Network error'); }
    setReading(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <School className="h-4 w-4 text-green-600" /> School Platform
            {creds.username && <Badge variant="outline" className="text-[9px] text-green-600 border-green-200">Configured</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Platform</Label>
            <Select value={platform || 'other'} onValueChange={handlePlatformChange}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">School URL</Label>
            <div className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input className="h-8 text-xs" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Username / Email</Label>
            <div className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input className="h-8 text-xs" value={username} onChange={e => setUsername(e.target.value)} placeholder="parent@email.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <div className="flex items-center gap-1">
              <Input className="h-8 text-xs flex-1" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Key className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
              Test Login
            </Button>
            <Button size="sm" className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700" onClick={handleRead} disabled={reading}>
              {reading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BookOpen className="h-3 w-3 mr-1" />}
              Read Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test result dialog with screenshot */}
      <Dialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {testResult?.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
              {testResult?.success ? 'Login Successful!' : 'Login Check'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{testResult?.message}</p>
          <p className="text-[10px] font-mono text-muted-foreground">URL: {testResult?.url}</p>
          {testResult?.screenshot && (
            <img src={`data:image/jpeg;base64,${testResult.screenshot}`} alt="Login result" className="w-full rounded-md border" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
