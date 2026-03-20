import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Brain, LayoutDashboard, Globe, Clock, Save, Loader2, ChevronLeft, RefreshCw, Play, Zap } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' });

export default function SchoolFeedConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/tutor/school-feed-config`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConfig(d); })
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  const update = (path, value) => {
    setConfig(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/tutor/school-feed-config`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(config) });
      if (res.ok) { toast.success('Config saved!'); setDirty(false); }
      else toast.error('Save failed');
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const scanAll = async () => {
    setScanning(true);
    toast.info('Scanning all students...');
    try {
      const res = await fetch(`${API}/api/tutor/scan-all-students`, { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        const r = await res.json();
        toast.success(`Scanned ${r.scanned} students, found ${r.items_found} items`);
      } else toast.error('Scan failed');
    } catch { toast.error('Network error'); }
    setScanning(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!config) return <p className="text-center text-muted-foreground py-8">Failed to load config</p>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tutor')}><ChevronLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> School Feed Config</h1>
            <p className="text-xs text-muted-foreground">AI extraction, Monday.com board, platform setup</p>
          </div>
        </div>
        <div className="flex gap-2">
          {dirty && <Badge variant="outline" className="text-amber-600 border-amber-300">Unsaved</Badge>}
          <Button size="sm" variant="outline" onClick={scanAll} disabled={scanning}>
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            Scan All
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="ai" className="text-xs gap-1"><Brain className="h-3.5 w-3.5" /> AI</TabsTrigger>
          <TabsTrigger value="monday" className="text-xs gap-1"><LayoutDashboard className="h-3.5 w-3.5" /> Monday</TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs gap-1"><Globe className="h-3.5 w-3.5" /> Platforms</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
        </TabsList>

        {/* AI Instructions */}
        <TabsContent value="ai">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI Extraction Instructions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-bold">Extraction Prompt</Label>
                <p className="text-[10px] text-muted-foreground mb-1">What the AI looks for when reading school pages</p>
                <textarea className="w-full h-40 text-xs p-3 rounded-md border bg-background resize-y"
                  value={config.ai_instructions?.extraction_prompt || ''}
                  onChange={e => update('ai_instructions.extraction_prompt', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-bold">Summary Prompt</Label>
                <p className="text-[10px] text-muted-foreground mb-1">How daily reports are summarized for staff</p>
                <textarea className="w-full h-32 text-xs p-3 rounded-md border bg-background resize-y"
                  value={config.ai_instructions?.summary_prompt || ''}
                  onChange={e => update('ai_instructions.summary_prompt', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-bold">Classification Keywords</Label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {Object.entries(config.ai_instructions?.classification_rules || {}).map(([key, words]) => (
                    <div key={key}>
                      <Label className="text-[10px] capitalize">{key.replace('_', ' ')}</Label>
                      <Input className="h-8 text-xs" value={(words || []).join(', ')}
                        onChange={e => update(`ai_instructions.classification_rules.${key}`, e.target.value.split(',').map(w => w.trim()).filter(Boolean))} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monday.com Board */}
        <TabsContent value="monday">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monday.com Board</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Push to Monday.com</Label>
                <Switch checked={config.monday_board?.enabled || false}
                  onCheckedChange={v => update('monday_board.enabled', v)} />
              </div>
              <div>
                <Label className="text-xs">Board ID</Label>
                <Input className="h-8 text-xs font-mono" value={config.monday_board?.board_id || ''} readOnly
                  placeholder="Created automatically" />
                {config.monday_board?.board_id && (
                  <a href={`https://chipilink-club.monday.com/boards/${config.monday_board.board_id}`}
                    target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">
                    Open in Monday.com →
                  </a>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold">Column Mapping</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(config.monday_board?.column_map || {}).map(([key, colId]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] w-28 capitalize text-muted-foreground">{key.replace('_', ' ')}</span>
                      <Input className="h-7 text-[10px] font-mono flex-1" value={colId || ''} readOnly />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platforms */}
        <TabsContent value="platforms">
          <div className="space-y-3">
            {Object.entries(config.platforms || {}).map(([pid, platform]) => (
              <Card key={pid}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" /> {platform.name || pid}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Login URL</Label>
                    <Input className="h-8 text-xs" value={platform.login_url || ''}
                      onChange={e => update(`platforms.${pid}.login_url`, e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">CSS Selectors</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {['username', 'password', 'submit'].map(sel => (
                        <div key={sel}>
                          <Label className="text-[10px] capitalize">{sel}</Label>
                          <Input className="h-7 text-[10px] font-mono" value={platform.selectors?.[sel] || ''}
                            onChange={e => update(`platforms.${pid}.selectors.${sel}`, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Sections to Scan ({(platform.sections || []).length})</Label>
                    {(platform.sections || []).map((section, i) => (
                      <div key={i} className="flex items-center gap-2 mt-1 p-2 bg-muted/30 rounded text-xs">
                        <span className="font-mono text-[10px] w-20">{section.name}</span>
                        <span className="text-muted-foreground flex-1 truncate text-[10px]">{section.prompt?.substring(0, 60)}...</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto-Scan Schedule */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Auto-Scan Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Enable Auto-Scan</Label>
                  <p className="text-[10px] text-muted-foreground">Automatically scan all students daily</p>
                </div>
                <Switch checked={config.auto_scan?.enabled || false}
                  onCheckedChange={v => update('auto_scan.enabled', v)} />
              </div>
              <div>
                <Label className="text-xs">Cron Schedule</Label>
                <Input className="h-8 text-xs font-mono" value={config.auto_scan?.cron || '0 6 * * 1-5'}
                  onChange={e => update('auto_scan.cron', e.target.value)}
                  placeholder="0 6 * * 1-5 (6AM Mon-Fri)" />
                <p className="text-[10px] text-muted-foreground mt-1">Default: 6:00 AM Monday to Friday</p>
              </div>
              <div className="space-y-2">
                {[
                  ['auto_scan.scan_all_students', 'Scan all students'],
                  ['auto_scan.notify_staff_after', 'Notify staff after scan'],
                  ['auto_scan.push_to_monday', 'Push results to Monday.com'],
                ].map(([path, label]) => (
                  <div key={path} className="flex items-center justify-between">
                    <Label className="text-xs">{label}</Label>
                    <Switch checked={path.split('.').reduce((o, k) => o?.[k], config) ?? false}
                      onCheckedChange={v => update(path, v)} />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full gap-1" onClick={scanAll} disabled={scanning}>
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Run Scan Now (All Students)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
