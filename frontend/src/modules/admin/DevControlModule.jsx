import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Copy, ArrowUpDown
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

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
        {isDir ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : <span className="w-3" />}
        {isDir ? <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <FileCode className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Architecture Tab ───────────────────────────────────────
function ArchitectureTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/dev-control/architecture`, { headers: headers() })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load architecture'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;

  const filterTree = (nodes, q) => {
    if (!q) return nodes;
    return nodes.reduce((acc, node) => {
      if (node.name.toLowerCase().includes(q.toLowerCase())) {
        acc.push(node);
      } else if (node.children) {
        const filtered = filterTree(node.children, q);
        if (filtered.length > 0) acc.push({ ...node, children: filtered });
      }
      return acc;
    }, []);
  };

  const backend = filterTree(data.backend, filter);
  const frontend = filterTree(data.frontend, filter);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter files..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="pl-8 h-9 text-xs"
          data-testid="architecture-filter"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-500" /> Backend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ScrollArea className="h-[420px]">
              {backend.map(n => <TreeNode key={n.path} node={n} />)}
              {backend.length === 0 && <p className="text-xs text-muted-foreground p-2">No matches</p>}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="h-4 w-4 text-sky-500" /> Frontend (src)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ScrollArea className="h-[420px]">
              {frontend.map(n => <TreeNode key={n.path} node={n} />)}
              {frontend.length === 0 && <p className="text-xs text-muted-foreground p-2">No matches</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Modules Tab ────────────────────────────────────────────
function ModulesTab() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/dev-control/modules`, { headers: headers() })
      .then(r => setModules(r.data.modules))
      .catch(() => toast.error('Failed to load modules'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
    planned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400',
    wip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {modules.map(m => (
        <Card key={m.id} className="hover:shadow-md transition-shadow" data-testid={`module-card-${m.id}`}>
          <CardHeader className="py-3 px-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{m.name}</CardTitle>
              <Badge variant="secondary" className={`text-[10px] ${statusColors[m.status] || statusColors.active}`}>
                {m.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{m.path}</p>
            {m.endpoints?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.endpoints.slice(0, 3).map(ep => (
                  <Badge key={ep} variant="outline" className="text-[9px] font-mono">{ep}</Badge>
                ))}
                {m.endpoints.length > 3 && (
                  <Badge variant="outline" className="text-[9px]">+{m.endpoints.length - 3}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Principles Tab ─────────────────────────────────────────
function PrinciplesTab() {
  const [principles, setPrinciples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/dev-control/principles`, { headers: headers() })
      .then(r => setPrinciples(r.data.principles))
      .catch(() => toast.error('Failed to load principles'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      {principles.map(group => (
        <Card key={group.category}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">{group.category}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-3">
              {group.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start" data-testid={`principle-${group.category}-${i}`}>
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
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
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    axios.get(`${API}/api/dev-control/endpoints`, { headers: headers() })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load endpoints'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!data) return null;

  const methodColors = {
    GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
    POST: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400',
    PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
    PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
  };

  const toggleGroup = (g) => setExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }));
  const groups = Object.entries(data.groups).filter(([tag, endpoints]) =>
    !filter || tag.toLowerCase().includes(filter.toLowerCase()) ||
    endpoints.some(e => e.path.toLowerCase().includes(filter.toLowerCase()))
  );

  const copyPath = (path) => {
    navigator.clipboard.writeText(path);
    toast.success('Copied!');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter endpoints..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-8 h-9 text-xs"
            data-testid="api-filter"
          />
        </div>
        <Badge variant="outline" className="text-xs">{data.total} endpoints</Badge>
      </div>
      {groups.map(([tag, endpoints]) => {
        const isOpen = expandedGroups[tag] !== false; // default open
        const filteredEndpoints = filter
          ? endpoints.filter(e => e.path.toLowerCase().includes(filter.toLowerCase()) || e.method.toLowerCase().includes(filter.toLowerCase()))
          : endpoints;
        if (filter && filteredEndpoints.length === 0) return null;
        return (
          <Card key={tag}>
            <button
              onClick={() => toggleGroup(tag)}
              className="w-full flex items-center justify-between py-2.5 px-4 hover:bg-accent/30 transition-colors"
              data-testid={`api-group-${tag}`}
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="text-sm font-semibold">{tag}</span>
                <Badge variant="secondary" className="text-[10px]">{filteredEndpoints.length}</Badge>
              </div>
            </button>
            {isOpen && (
              <CardContent className="px-4 pb-3 pt-0">
                <div className="space-y-1">
                  {filteredEndpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 group" data-testid={`endpoint-${ep.method}-${ep.path}`}>
                      <Badge className={`text-[10px] font-mono w-14 justify-center shrink-0 ${methodColors[ep.method] || ''}`}>
                        {ep.method}
                      </Badge>
                      <code className="text-xs font-mono text-muted-foreground flex-1 truncate">{ep.path}</code>
                      <button
                        onClick={() => copyPath(ep.path)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy path"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
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

  useEffect(() => {
    axios.get(`${API}/api/dev-control/roadmap`, { headers: headers() })
      .then(r => setItems(r.data.items))
      .catch(() => toast.error('Failed to load roadmap'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/api/dev-control/roadmap/${id}`, { status: newStatus }, { headers: headers() });
      setItems(prev => prev.map(it => it.id === id ? { ...it, status: newStatus } : it));
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  const prioColors = {
    P0: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800',
    P1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    P2: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    P3: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
  const statusOpts = ['planned', 'in_progress', 'done', 'blocked'];

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border ${prioColors[item.priority] || ''}`}
          data-testid={`roadmap-item-${item.id}`}
        >
          <Badge variant="outline" className="text-[10px] font-bold w-8 justify-center shrink-0">{item.priority}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.description}</p>
          </div>
          <select
            value={item.status}
            onChange={(e) => updateStatus(item.id, e.target.value)}
            className="h-7 px-2 text-[10px] border rounded bg-background"
            data-testid={`roadmap-status-${item.id}`}
          >
            {statusOpts.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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

  const fetchAnnotations = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/dev-control/annotations`, { headers: headers() })
      .then(r => setAnnotations(r.data.annotations))
      .catch(() => toast.error('Failed to load annotations'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  const resetForm = () => {
    setForm({ title: '', content: '', category: 'general', pinned: false });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.content.trim()) {
      toast.error('Content is required');
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API}/api/dev-control/annotations/${editingId}`, form, { headers: headers() });
        toast.success('Updated');
      } else {
        await axios.post(`${API}/api/dev-control/annotations`, form, { headers: headers() });
        toast.success('Created');
      }
      resetForm();
      fetchAnnotations();
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this annotation?')) return;
    try {
      await axios.delete(`${API}/api/dev-control/annotations/${id}`, { headers: headers() });
      toast.success('Deleted');
      fetchAnnotations();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const startEdit = (ann) => {
    setForm({ title: ann.title, content: ann.content, category: ann.category, pinned: ann.pinned });
    setEditingId(ann.id);
    setShowForm(true);
  };

  const togglePin = async (ann) => {
    try {
      await axios.put(`${API}/api/dev-control/annotations/${ann.id}`, { pinned: !ann.pinned }, { headers: headers() });
      fetchAnnotations();
    } catch {
      toast.error('Failed to update');
    }
  };

  const catColors = {
    general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    guideline: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
    architecture: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400',
    bug: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
    idea: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
  };

  const filtered = annotations
    .filter(a => filterCat === 'all' || a.category === filterCat)
    .filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase()));
  // Pinned first
  const sorted = [...filtered.filter(a => a.pinned), ...filtered.filter(a => !a.pinned)];

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs w-52"
              data-testid="annotations-search"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="h-9 px-2 text-xs border rounded-md bg-background"
            data-testid="annotations-category-filter"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="add-annotation-btn">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Note
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Title (optional)"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="h-9 text-sm"
              data-testid="annotation-title-input"
            />
            <Textarea
              placeholder="Write your note, guideline, or instruction..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              className="text-sm"
              data-testid="annotation-content-input"
            />
            <div className="flex items-center gap-3">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="h-8 px-2 text-xs border rounded-md bg-background"
                data-testid="annotation-category-select"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="rounded"
                />
                Pin to top
              </label>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} data-testid="save-annotation-btn">
                <Check className="h-3.5 w-3.5 mr-1" /> {editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No annotations yet. Click "New Note" to add your first one.
        </div>
      )}
      <div className="space-y-2">
        {sorted.map(ann => (
          <Card key={ann.id} className={`group ${ann.pinned ? 'border-primary/40 bg-primary/5' : ''}`} data-testid={`annotation-${ann.id}`}>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                {ann.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  {ann.title && <p className="text-sm font-semibold mb-0.5">{ann.title}</p>}
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className={`text-[9px] ${catColors[ann.category] || catColors.general}`}>
                      {ann.category}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {ann.created_by} &middot; {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => togglePin(ann)} className="p-1 rounded hover:bg-accent" title={ann.pinned ? 'Unpin' : 'Pin'}>
                    {ann.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => startEdit(ann)} className="p-1 rounded hover:bg-accent" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(ann.id)} className="p-1 rounded hover:bg-destructive/20 text-destructive" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Module ────────────────────────────────────────────
export default function DevControlModule() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4" data-testid="dev-control-module">
      <Tabs defaultValue="annotations">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="annotations" className="gap-1.5 text-xs" data-testid="tab-annotations">
            <StickyNote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.annotations', 'Annotations')}</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="architecture" className="gap-1.5 text-xs" data-testid="tab-architecture">
            <FolderTree className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.architecture', 'Architecture')}</span>
            <span className="sm:hidden">Files</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5 text-xs" data-testid="tab-modules">
            <Blocks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.modules', 'Modules')}</span>
            <span className="sm:hidden">Mods</span>
          </TabsTrigger>
          <TabsTrigger value="principles" className="gap-1.5 text-xs" data-testid="tab-principles">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.principles', 'Principles')}</span>
            <span className="sm:hidden">Rules</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-xs" data-testid="tab-api">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.api', 'API Reference')}</span>
            <span className="sm:hidden">API</span>
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5 text-xs" data-testid="tab-roadmap">
            <Map className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('devControl.tabs.roadmap', 'Roadmap')}</span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="annotations"><AnnotationsTab /></TabsContent>
        <TabsContent value="architecture"><ArchitectureTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="principles"><PrinciplesTab /></TabsContent>
        <TabsContent value="api"><ApiReferenceTab /></TabsContent>
        <TabsContent value="roadmap"><RoadmapTab /></TabsContent>
      </Tabs>
    </div>
  );
}
