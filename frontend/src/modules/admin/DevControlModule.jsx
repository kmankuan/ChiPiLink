import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Loader2, FolderTree, Blocks, BookOpen, Globe, Map,
  StickyNote, Plus, Trash2, Pin, PinOff, Pencil, X, Check,
  ChevronRight, ChevronDown, FileCode, Folder, Search,
  Copy, Database, GitCommit, Package, Bot,
  ShieldCheck, Activity, LayoutGrid, Gauge,
  Send, MessageSquare, RotateCcw
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

// ─── File Tree ──────────────────────────────────────────────
function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = node.type === 'dir';
  const hasChildren = isDir && node.children?.length > 0;
  return (
    <div>
      <button
        onClick={() => isDir && setOpen(!open)}
        className={`flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded text-xs hover:bg-accent/50 transition-colors ${isDir ? 'cursor-pointer font-medium' : 'cursor-default text-muted-foreground'}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        data-testid={`tree-node-${node.name}`}
      >
        {isDir ? (open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />) : <span className="w-3" />}
        {isDir ? <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <FileCode className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && open && hasChildren && node.children.map(c => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
    </div>
  );
}

// ─── Not Available Banner ────────────────────────────────────
function NotAvailableBanner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><X className="h-5 w-5" /></div>
      <p className="text-sm font-medium">{message || 'Not available in this environment'}</p>
      <p className="text-xs max-w-md">This feature requires access to local development tools (git, filesystem). It works in the development preview environment.</p>
    </div>
  );
}

// ─── Architecture Tab ───────────────────────────────────────
function ArchitectureTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  useEffect(() => { axios.get(`${API}/api/dev-control/architecture`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  const filterTree = (nodes, q) => {
    if (!q) return nodes;
    return nodes.reduce((acc, n) => {
      if (n.name.toLowerCase().includes(q.toLowerCase())) { acc.push(n); }
      else if (n.children) { const f = filterTree(n.children, q); if (f.length) acc.push({ ...n, children: f }); }
      return acc;
    }, []);
  };
  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Filter files..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-xs" data-testid="architecture-filter" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[{ tree: filterTree(data.backend, filter), label: 'Backend', color: 'text-amber-500' }, { tree: filterTree(data.frontend, filter), label: 'Frontend (src)', color: 'text-sky-500' }].map(s => (
          <Card key={s.label}>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><Folder className={`h-4 w-4 ${s.color}`} /> {s.label}</CardTitle></CardHeader>
            <CardContent className="px-2 pb-3"><ScrollArea className="h-[420px]">{s.tree.map(n => <TreeNode key={n.path} node={n} />)}{s.tree.length === 0 && <p className="text-xs text-muted-foreground p-2">No matches</p>}</ScrollArea></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Modules Tab ────────────────────────────────────────────
function ModulesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${API}/api/dev-control/modules`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  const sc = { active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', placeholder: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data.modules.length} modules detected from filesystem</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.modules.map(m => (
          <Card key={m.id} className="hover:shadow-md transition-shadow" data-testid={`module-card-${m.id}`}>
            <CardHeader className="py-3 px-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{m.name}</CardTitle>
                <Badge variant="secondary" className={`text-[10px] ${sc[m.status] || sc.active}`}>{m.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground">{m.path}</p>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>{m.files} files</span>
                <span>{m.subdirs} subdirs</span>
                {m.endpoint_count > 0 && <span className="text-primary font-medium">{m.endpoint_count} endpoints</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Principles Tab ─────────────────────────────────────────
function PrinciplesTab() {
  const [principles, setPrinciples] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${API}/api/dev-control/principles`, { headers: hdrs() }).then(r => setPrinciples(r.data.principles)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  return (
    <div className="space-y-4">
      {principles.map(g => (
        <Card key={g.category}>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">{g.category}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {g.items.map((item, i) => (
              <div key={i} className="flex gap-3 items-start" data-testid={`principle-${g.category}-${i}`}>
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div><p className="text-xs font-semibold">{item.title}</p><p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── API Reference Tab ──────────────────────────────────────
function ApiReferenceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  useEffect(() => { axios.get(`${API}/api/dev-control/endpoints`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  const mc = { GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', POST: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400' };
  const toggle = g => setExpanded(p => ({ ...p, [g]: !p[g] }));
  const groups = Object.entries(data.groups).filter(([t, eps]) => !filter || t.toLowerCase().includes(filter.toLowerCase()) || eps.some(e => e.path.toLowerCase().includes(filter.toLowerCase())));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Filter endpoints..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-xs" data-testid="api-filter" /></div>
        <Badge variant="outline" className="text-xs">{data.total} endpoints</Badge>
      </div>
      {groups.map(([tag, eps]) => {
        const isOpen = expanded[tag] !== false;
        const feps = filter ? eps.filter(e => e.path.toLowerCase().includes(filter.toLowerCase())) : eps;
        if (filter && !feps.length) return null;
        return (
          <Card key={tag}>
            <button onClick={() => toggle(tag)} className="w-full flex items-center justify-between py-2.5 px-4 hover:bg-accent/30 transition-colors" data-testid={`api-group-${tag}`}>
              <div className="flex items-center gap-2">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}<span className="text-sm font-semibold">{tag}</span><Badge variant="secondary" className="text-[10px]">{feps.length}</Badge></div>
            </button>
            {isOpen && <CardContent className="px-4 pb-3 pt-0 space-y-1">{feps.map((ep, i) => (
              <div key={i} className="flex items-center gap-2 py-1 group"><Badge className={`text-[10px] font-mono w-14 justify-center shrink-0 ${mc[ep.method] || ''}`}>{ep.method}</Badge><code className="text-xs font-mono text-muted-foreground flex-1 truncate">{ep.path}</code><button onClick={() => { navigator.clipboard.writeText(ep.path); toast.success('Copied!'); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button></div>
            ))}</CardContent>}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Roadmap Tab ────────────────────────────────────────────
function RoadmapTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { axios.get(`${API}/api/dev-control/roadmap`, { headers: hdrs() }).then(r => setItems(r.data.items)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  const updateStatus = async (id, s) => { try { await axios.put(`${API}/api/dev-control/roadmap/${id}`, { status: s }, { headers: hdrs() }); setItems(p => p.map(it => it.id === id ? { ...it, status: s } : it)); toast.success('Updated'); } catch { toast.error('Failed'); } };
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  const pc = { P0: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800', P1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800', P2: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400 border-sky-200 dark:border-sky-800', P3: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border ${pc[item.priority] || ''}`} data-testid={`roadmap-item-${item.id}`}>
          <Badge variant="outline" className="text-[10px] font-bold w-8 justify-center shrink-0">{item.priority}</Badge>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold">{item.title}</p><p className="text-[10px] text-muted-foreground">{item.description}</p></div>
          <select value={item.status} onChange={e => updateStatus(item.id, e.target.value)} className="h-7 px-2 text-[10px] border rounded bg-background" data-testid={`roadmap-status-${item.id}`}>
            {['planned', 'in_progress', 'done', 'blocked'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

// ─── Annotations Tab ────────────────────────────────────────
const CATEGORIES = ['general', 'guideline', 'architecture', 'bug', 'idea'];
function AnnotationsTab() {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', pinned: false });
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const fetch_ = useCallback(() => { setLoading(true); axios.get(`${API}/api/dev-control/annotations`, { headers: hdrs() }).then(r => setAnnotations(r.data.annotations)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  const reset = () => { setForm({ title: '', content: '', category: 'general', pinned: false }); setShowForm(false); setEditingId(null); };
  const save = async () => { if (!form.content.trim()) { toast.error('Content required'); return; } try { editingId ? await axios.put(`${API}/api/dev-control/annotations/${editingId}`, form, { headers: hdrs() }) : await axios.post(`${API}/api/dev-control/annotations`, form, { headers: hdrs() }); toast.success(editingId ? 'Updated' : 'Created'); reset(); fetch_(); } catch { toast.error('Failed'); } };
  const del = async id => { if (!window.confirm('Delete?')) return; try { await axios.delete(`${API}/api/dev-control/annotations/${id}`, { headers: hdrs() }); toast.success('Deleted'); fetch_(); } catch { toast.error('Failed'); } };
  const edit = a => { setForm({ title: a.title, content: a.content, category: a.category, pinned: a.pinned }); setEditingId(a.id); setShowForm(true); };
  const togglePin = async a => { try { await axios.put(`${API}/api/dev-control/annotations/${a.id}`, { pinned: !a.pinned }, { headers: hdrs() }); fetch_(); } catch { toast.error('Failed'); } };
  const cc = { general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', guideline: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', architecture: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', bug: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', idea: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400' };
  const filtered = annotations.filter(a => filterCat === 'all' || a.category === filterCat).filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered.filter(a => a.pinned), ...filtered.filter(a => !a.pinned)];
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs w-52" data-testid="annotations-search" /></div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-9 px-2 text-xs border rounded-md bg-background" data-testid="annotations-category-filter"><option value="all">All categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        <Button size="sm" onClick={() => { reset(); setShowForm(true); }} data-testid="add-annotation-btn"><Plus className="h-3.5 w-3.5 mr-1" /> New Note</Button>
      </div>
      {showForm && (
        <Card className="border-primary/30"><CardContent className="p-4 space-y-3">
          <Input placeholder="Title (optional)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" data-testid="annotation-title-input" />
          <Textarea placeholder="Write your note..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} className="text-sm" data-testid="annotation-content-input" />
          <div className="flex items-center gap-3">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="h-8 px-2 text-xs border rounded-md bg-background" data-testid="annotation-category-select">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="rounded" />Pin</label>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
            <Button size="sm" onClick={save} data-testid="save-annotation-btn"><Check className="h-3.5 w-3.5 mr-1" /> {editingId ? 'Update' : 'Save'}</Button>
          </div>
        </CardContent></Card>
      )}
      {sorted.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No annotations yet.</div>}
      <div className="space-y-2">
        {sorted.map(a => (
          <Card key={a.id} className={`group ${a.pinned ? 'border-primary/40 bg-primary/5' : ''}`} data-testid={`annotation-${a.id}`}>
            <CardContent className="p-3"><div className="flex items-start gap-2">
              {a.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                {a.title && <p className="text-sm font-semibold mb-0.5">{a.title}</p>}
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
                <div className="flex items-center gap-2 mt-2"><Badge variant="secondary" className={`text-[9px] ${cc[a.category] || cc.general}`}>{a.category}</Badge><span className="text-[9px] text-muted-foreground">{a.created_by} &middot; {new Date(a.created_at).toLocaleDateString()}</span></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => togglePin(a)} className="p-1 rounded hover:bg-accent">{a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
                <button onClick={() => edit(a)} className="p-1 rounded hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(a.id)} className="p-1 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── DB Explorer Tab ────────────────────────────────────────
function DbExplorerTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expandedCol, setExpandedCol] = useState(null);
  useEffect(() => { axios.get(`${API}/api/dev-control/db-explorer`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  const cols = data.collections.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));
  const totalDocs = data.collections.reduce((s, c) => s + c.count, 0);
  return (
    <div className="space-y-3" data-testid="db-explorer">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Filter collections..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-xs" data-testid="db-filter" /></div>
        <Badge variant="outline" className="text-xs">{data.total_collections} collections</Badge>
        <Badge variant="outline" className="text-xs">{totalDocs.toLocaleString()} total docs</Badge>
      </div>
      <div className="space-y-1.5">
        {cols.map(c => (
          <Card key={c.name} className="overflow-hidden">
            <button onClick={() => setExpandedCol(expandedCol === c.name ? null : c.name)} className="w-full flex items-center gap-3 py-2 px-4 hover:bg-accent/30 transition-colors text-left" data-testid={`db-col-${c.name}`}>
              {expandedCol === c.name ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <Database className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-xs font-mono font-medium flex-1">{c.name}</span>
              <Badge variant="secondary" className="text-[10px]">{c.count.toLocaleString()} docs</Badge>
              <Badge variant="outline" className="text-[10px]">{c.fields.length} fields</Badge>
            </button>
            {expandedCol === c.name && c.sample && (
              <CardContent className="px-4 pb-3 pt-0 border-t bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 mt-2">Fields:</p>
                <div className="flex flex-wrap gap-1 mb-2">{c.fields.map(f => <Badge key={f} variant="outline" className="text-[9px] font-mono">{f}</Badge>)}</div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Sample Document:</p>
                <pre className="text-[10px] bg-background p-2 rounded border overflow-x-auto max-h-40">{JSON.stringify(c.sample, null, 2)}</pre>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Changes Log Tab ────────────────────────────────────────
function ChangesLogTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCommit, setExpandedCommit] = useState(null);
  const [commitFiles, setCommitFiles] = useState({});
  useEffect(() => { axios.get(`${API}/api/dev-control/changes-log`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => setData({ commits: [], total: 0, available: false, reason: 'Failed to connect' })).finally(() => setLoading(false)); }, []);
  const loadFiles = async (hash) => {
    if (commitFiles[hash]) { setExpandedCommit(expandedCommit === hash ? null : hash); return; }
    try {
      const r = await axios.get(`${API}/api/dev-control/changes-log/${hash}`, { headers: hdrs() });
      setCommitFiles(p => ({ ...p, [hash]: r.data.files }));
      setExpandedCommit(hash);
    } catch { toast.error('Failed'); }
  };
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  const statusLabel = { A: 'Added', M: 'Modified', D: 'Deleted', R: 'Renamed' };
  const statusColor = { A: 'text-emerald-600', M: 'text-amber-600', D: 'text-red-600', R: 'text-sky-600' };
  return (
    <div className="space-y-2" data-testid="changes-log">
      <p className="text-xs text-muted-foreground">{data.total} recent commits</p>
      {data.commits.map(c => (
        <Card key={c.full_hash} className="overflow-hidden">
          <button onClick={() => loadFiles(c.full_hash)} className="w-full flex items-center gap-3 py-2 px-4 hover:bg-accent/30 transition-colors text-left" data-testid={`commit-${c.hash}`}>
            <GitCommit className="h-3.5 w-3.5 shrink-0 text-primary" />
            <code className="text-[10px] text-muted-foreground shrink-0">{c.hash}</code>
            <span className="text-xs flex-1 truncate">{c.message}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{new Date(c.date).toLocaleDateString()}</span>
          </button>
          {expandedCommit === c.full_hash && commitFiles[c.full_hash] && (
            <CardContent className="px-4 pb-3 pt-0 border-t bg-muted/30">
              <div className="space-y-0.5 mt-2">{commitFiles[c.full_hash].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`font-mono text-[10px] w-6 ${statusColor[f.status] || ''}`}>{statusLabel[f.status] || f.status}</span>
                  <code className="text-[10px] text-muted-foreground">{f.file}</code>
                </div>
              ))}{commitFiles[c.full_hash].length === 0 && <p className="text-[10px] text-muted-foreground">No files changed (initial commit)</p>}</div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Dependencies Tab ───────────────────────────────────────
function DependenciesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('node');
  const [filter, setFilter] = useState('');
  useEffect(() => { axios.get(`${API}/api/dev-control/dependencies`, { headers: hdrs() }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);
  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;
  return (
    <div className="space-y-3" data-testid="dependencies">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button size="sm" variant={tab === 'node' ? 'default' : 'outline'} onClick={() => setTab('node')} className="text-xs h-8" data-testid="deps-node-btn">Node.js ({data.node.total})</Button>
          <Button size="sm" variant={tab === 'python' ? 'default' : 'outline'} onClick={() => setTab('python')} className="text-xs h-8" data-testid="deps-python-btn">Python ({data.python.total})</Button>
        </div>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Filter packages..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-9 text-xs" /></div>
      </div>
      {tab === 'node' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[{ title: 'Dependencies', deps: data.node.dependencies }, { title: 'Dev Dependencies', deps: data.node.devDependencies }].map(s => (
            <Card key={s.title}>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">{s.title} ({Object.keys(s.deps).length})</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3"><ScrollArea className="h-[350px]"><div className="space-y-0.5">
                {Object.entries(s.deps).filter(([n]) => !filter || n.toLowerCase().includes(filter.toLowerCase())).map(([name, ver]) => (
                  <div key={name} className="flex justify-between py-0.5"><code className="text-xs">{name}</code><span className="text-[10px] text-muted-foreground">{ver}</span></div>
                ))}
              </div></ScrollArea></CardContent>
            </Card>
          ))}
        </div>
      )}
      {tab === 'python' && (
        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Python Packages ({data.python.total})</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><ScrollArea className="h-[450px]"><div className="space-y-0.5">
            {data.python.packages.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase())).map(p => (
              <div key={p.name} className="flex justify-between py-0.5"><code className="text-xs">{p.name}</code><span className="text-[10px] text-muted-foreground">{p.version}</span></div>
            ))}
          </div></ScrollArea></CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── AI Dev Helper Tab ──────────────────────────────────────
function AiHelperTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const loadSessions = async () => { try { const r = await axios.get(`${API}/api/dev-control/ai-helper/sessions`, { headers: hdrs() }); setSessions(r.data.sessions); } catch {} };
  const loadSession = async (id) => { try { const r = await axios.get(`${API}/api/dev-control/ai-helper/sessions/${id}`, { headers: hdrs() }); setMessages(r.data.messages); setSessionId(id); setShowSessions(false); } catch { toast.error('Failed'); } };
  const newChat = () => { setMessages([]); setSessionId(''); setShowSessions(false); };
  const deleteSession = async (id) => { try { await axios.delete(`${API}/api/dev-control/ai-helper/sessions/${id}`, { headers: hdrs() }); setSessions(s => s.filter(x => x.id !== id)); if (sessionId === id) newChat(); toast.success('Deleted'); } catch { toast.error('Failed'); } };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg, created_at: new Date().toISOString() }]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/dev-control/ai-helper/chat`, { message: msg, session_id: sessionId }, { headers: hdrs() });
      setSessionId(r.data.session_id);
      setMessages(p => [...p, { role: 'assistant', content: r.data.response, model_label: r.data.model, created_at: new Date().toISOString() }]);
      loadSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'AI error');
      setMessages(p => p.slice(0, -1)); // remove optimistic user msg
    } finally { setLoading(false); }
  };

  const quickAction = async (action) => {
    const labels = { health_check: 'Run a comprehensive health check', security_scan: 'Perform a security audit', architecture_review: 'Review the overall architecture', dependency_audit: 'Audit dependencies for issues' };
    send(labels[action] || action);
  };

  const modelBadge = (label) => {
    if (!label) return null;
    const isGpt = label.includes('GPT');
    return <Badge variant="outline" className={`text-[9px] ${isGpt ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : 'border-amber-300 text-amber-700 dark:text-amber-400'}`}>{label}</Badge>;
  };

  return (
    <div className="flex gap-4 h-[600px]" data-testid="ai-helper">
      {/* Sidebar */}
      <div className={`${showSessions ? 'flex' : 'hidden'} md:flex flex-col w-56 shrink-0 border rounded-lg bg-card overflow-hidden`}>
        <div className="p-2 border-b">
          <Button size="sm" onClick={newChat} className="w-full text-xs h-8" data-testid="new-chat-btn"><Plus className="h-3 w-3 mr-1" /> New Chat</Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {sessions.map(s => (
              <div key={s.id} className={`flex items-center gap-1 group rounded px-2 py-1.5 cursor-pointer hover:bg-accent/50 ${sessionId === s.id ? 'bg-accent' : ''}`} onClick={() => loadSession(s.id)} data-testid={`session-${s.id}`}>
                <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-[10px] flex-1 truncate">{s.title}</span>
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }} className="opacity-0 group-hover:opacity-100 p-0.5"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-[10px] text-muted-foreground p-2">No sessions yet</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Button variant="ghost" size="sm" className="md:hidden h-7 w-7 p-0" onClick={() => setShowSessions(!showSessions)}><MessageSquare className="h-3.5 w-3.5" /></Button>
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">ChiPi Dev Helper</span>
          <span className="text-[10px] text-muted-foreground">GPT-4o + Claude Sonnet 4.5 (auto-routed)</span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-semibold mb-1">Your AI Development Assistant</p>
                <p className="text-xs text-muted-foreground max-w-md">Ask about app health, security, architecture, or get code guidance. I have real-time access to your database, endpoints, and codebase.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  { action: 'health_check', icon: Activity, label: 'Health Check', color: 'text-emerald-600' },
                  { action: 'security_scan', icon: ShieldCheck, label: 'Security Scan', color: 'text-red-600' },
                  { action: 'architecture_review', icon: LayoutGrid, label: 'Architecture Review', color: 'text-sky-600' },
                  { action: 'dependency_audit', icon: Package, label: 'Dependency Audit', color: 'text-amber-600' },
                ].map(qa => (
                  <Button key={qa.action} variant="outline" size="sm" onClick={() => quickAction(qa.action)} className="text-xs h-8 gap-1.5" data-testid={`qa-${qa.action}`}>
                    <qa.icon className={`h-3.5 w-3.5 ${qa.color}`} /> {qa.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <Bot className="h-5 w-5 text-primary shrink-0 mt-1" />}
                <div className={`max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2' : 'bg-muted rounded-2xl rounded-bl-md px-4 py-3'}`}>
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  {m.model_label && <div className="mt-1.5 flex justify-end">{modelBadge(m.model_label)}</div>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3"><Bot className="h-5 w-5 text-primary shrink-0 mt-1" /><div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about health, security, architecture, code..."
              className="flex-1 text-sm h-10"
              disabled={loading}
              data-testid="ai-input"
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()} className="h-10 w-10 p-0" data-testid="ai-send-btn">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Module ────────────────────────────────────────────
export default function DevControlModule() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="dev-control-module">
      <Tabs defaultValue="ai-helper">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ai-helper" className="gap-1.5 text-xs" data-testid="tab-ai-helper"><Bot className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.aiHelper', 'AI Dev Helper')}</span><span className="sm:hidden">AI</span></TabsTrigger>
          <TabsTrigger value="annotations" className="gap-1.5 text-xs" data-testid="tab-annotations"><StickyNote className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.annotations', 'Annotations')}</span><span className="sm:hidden">Notes</span></TabsTrigger>
          <TabsTrigger value="db-explorer" className="gap-1.5 text-xs" data-testid="tab-db-explorer"><Database className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.dbExplorer', 'Database')}</span><span className="sm:hidden">DB</span></TabsTrigger>
          <TabsTrigger value="changes" className="gap-1.5 text-xs" data-testid="tab-changes"><GitCommit className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.changes', 'Changes')}</span><span className="sm:hidden">Git</span></TabsTrigger>
          <TabsTrigger value="architecture" className="gap-1.5 text-xs" data-testid="tab-architecture"><FolderTree className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.architecture', 'Architecture')}</span><span className="sm:hidden">Files</span></TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5 text-xs" data-testid="tab-modules"><Blocks className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.modules', 'Modules')}</span><span className="sm:hidden">Mods</span></TabsTrigger>
          <TabsTrigger value="dependencies" className="gap-1.5 text-xs" data-testid="tab-dependencies"><Package className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.dependencies', 'Dependencies')}</span><span className="sm:hidden">Deps</span></TabsTrigger>
          <TabsTrigger value="principles" className="gap-1.5 text-xs" data-testid="tab-principles"><BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.principles', 'Principles')}</span><span className="sm:hidden">Rules</span></TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-xs" data-testid="tab-api"><Globe className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.api', 'API Reference')}</span><span className="sm:hidden">API</span></TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5 text-xs" data-testid="tab-roadmap"><Map className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('devControl.tabs.roadmap', 'Roadmap')}</span><span className="sm:hidden">Plan</span></TabsTrigger>
        </TabsList>

        <TabsContent value="ai-helper"><AiHelperTab /></TabsContent>
        <TabsContent value="annotations"><AnnotationsTab /></TabsContent>
        <TabsContent value="db-explorer"><DbExplorerTab /></TabsContent>
        <TabsContent value="changes"><ChangesLogTab /></TabsContent>
        <TabsContent value="architecture"><ArchitectureTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="dependencies"><DependenciesTab /></TabsContent>
        <TabsContent value="principles"><PrinciplesTab /></TabsContent>
        <TabsContent value="api"><ApiReferenceTab /></TabsContent>
        <TabsContent value="roadmap"><RoadmapTab /></TabsContent>
      </Tabs>
    </div>
  );
}
