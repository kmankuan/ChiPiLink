import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  Eye, Code, FileText, X, Check, Pencil, ExternalLink, Image,
} from 'lucide-react';
import axios from 'axios';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

const SECTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'steps', label: 'Steps (Ordered List)' },
  { value: 'list', label: 'Item List' },
  { value: 'faq', label: 'FAQ' },
];

function SectionEditor({ section, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (key, val) => onChange({ ...section, [key]: val });

  const updateItem = (idx, field, val) => {
    const items = [...(section.items || [])];
    items[idx] = { ...items[idx], [field]: val };
    onChange({ ...section, items });
  };

  const addItem = () => {
    const items = [...(section.items || []), { title: '', content: '' }];
    onChange({ ...section, items });
  };

  const removeItem = (idx) => {
    const items = (section.items || []).filter((_, i) => i !== idx);
    onChange({ ...section, items });
  };

  const updateStep = (idx, val) => {
    const steps = [...(section.steps || [])];
    steps[idx] = val;
    onChange({ ...section, steps });
  };

  const addStep = () => onChange({ ...section, steps: [...(section.steps || []), ''] });
  const removeStep = (idx) => onChange({ ...section, steps: (section.steps || []).filter((_, i) => i !== idx) });

  const updateTip = (idx, field, val) => {
    const tips = [...(section.tips || [])];
    tips[idx] = { ...tips[idx], [field]: val };
    onChange({ ...section, tips });
  };

  const addTip = () => onChange({ ...section, tips: [...(section.tips || []), { title: '', content: '' }] });
  const removeTip = (idx) => onChange({ ...section, tips: (section.tips || []).filter((_, i) => i !== idx) });

  return (
    <Card className="border-l-4 border-l-primary/30" data-testid={`section-editor-${section.id}`}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="p-0.5">
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <Badge variant="outline" className="text-[9px]">{section.type}</Badge>
          <span className="text-xs font-semibold flex-1 truncate">{section.title || 'Untitled'}</span>
          <div className="flex gap-0.5">
            {!isFirst && <button onClick={onMoveUp} className="p-1 rounded hover:bg-accent"><ChevronUp className="h-3 w-3" /></button>}
            {!isLast && <button onClick={onMoveDown} className="p-1 rounded hover:bg-accent"><ChevronDown className="h-3 w-3" /></button>}
            <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-3 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Section Title</Label>
              <Input value={section.title || ''} onChange={e => update('title', e.target.value)} className="h-8 text-xs mt-1" data-testid={`section-title-${section.id}`} />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Type</Label>
              <select value={section.type || 'text'} onChange={e => update('type', e.target.value)} className="h-8 w-full px-2 text-xs border rounded-md bg-background mt-1" data-testid={`section-type-${section.id}`}>
                {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Description / Content</Label>
            <Textarea value={section.content || ''} onChange={e => update('content', e.target.value)} rows={2} className="text-xs mt-1" />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">Image URL (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={section.image_url || ''} onChange={e => update('image_url', e.target.value)} className="h-8 text-xs flex-1" placeholder="/guides/guide-login.gif" />
              {section.image_url && <img src={section.image_url} alt="" className="h-8 w-12 object-cover rounded border" />}
            </div>
          </div>

          {/* Steps (for type=steps) */}
          {section.type === 'steps' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] text-muted-foreground">Steps</Label>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={addStep}><Plus className="h-2.5 w-2.5 mr-0.5" /> Add Step</Button>
              </div>
              <div className="space-y-1">
                {(section.steps || []).map((step, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <span className="text-[10px] text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                    <Input value={step} onChange={e => updateStep(i, e.target.value)} className="h-7 text-[10px] flex-1" />
                    <button onClick={() => removeStep(i)} className="p-0.5 text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips (for type=steps) */}
          {section.type === 'steps' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] text-muted-foreground">Tips / Troubleshooting</Label>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={addTip}><Plus className="h-2.5 w-2.5 mr-0.5" /> Add Tip</Button>
              </div>
              <div className="space-y-1">
                {(section.tips || []).map((tip, i) => (
                  <div key={i} className="flex gap-1 items-start">
                    <Input value={tip.title || ''} onChange={e => updateTip(i, 'title', e.target.value)} className="h-7 text-[10px] w-1/3" placeholder="Title" />
                    <Input value={tip.content || ''} onChange={e => updateTip(i, 'content', e.target.value)} className="h-7 text-[10px] flex-1" placeholder="Content" />
                    <button onClick={() => removeTip(i)} className="p-0.5 text-destructive mt-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items (for type=list or faq) */}
          {(section.type === 'list' || section.type === 'faq') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] text-muted-foreground">{section.type === 'faq' ? 'Questions' : 'Items'}</Label>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={addItem}><Plus className="h-2.5 w-2.5 mr-0.5" /> Add</Button>
              </div>
              <div className="space-y-1">
                {(section.items || []).map((item, i) => (
                  <div key={i} className="flex gap-1 items-start">
                    <Input value={item.title || ''} onChange={e => updateItem(i, 'title', e.target.value)} className="h-7 text-[10px] w-1/3" placeholder={section.type === 'faq' ? 'Question' : 'Title'} />
                    <Input value={item.content || ''} onChange={e => updateItem(i, 'content', e.target.value)} className="h-7 text-[10px] flex-1" placeholder={section.type === 'faq' ? 'Answer' : 'Content'} />
                    <button onClick={() => removeItem(i)} className="p-0.5 text-destructive mt-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function HelpGuideEditorTab() {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('structured'); // 'structured' or 'code'
  const [codeText, setCodeText] = useState('');
  const [meta, setMeta] = useState({});

  const fetchGuide = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/dev-control/help-guide`, { headers: hdrs() });
      setGuide(r.data.guide);
      setCodeText(JSON.stringify(r.data.guide, null, 2));
      setMeta({ source: r.data.source, updated_at: r.data.updated_at, updated_by: r.data.updated_by });
    } catch { toast.error('Failed to load help guide'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGuide(); }, [fetchGuide]);

  const saveGuide = async () => {
    setSaving(true);
    try {
      let guideToSave = guide;
      if (mode === 'code') {
        try {
          guideToSave = JSON.parse(codeText);
          setGuide(guideToSave);
        } catch {
          toast.error('Invalid JSON');
          setSaving(false);
          return;
        }
      }
      await axios.put(`${API}/api/dev-control/help-guide`, { guide: guideToSave }, { headers: hdrs() });
      toast.success('Help guide saved');
      setCodeText(JSON.stringify(guideToSave, null, 2));
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const switchMode = (newMode) => {
    if (newMode === 'code' && guide) {
      setCodeText(JSON.stringify(guide, null, 2));
    } else if (newMode === 'structured' && codeText) {
      try {
        setGuide(JSON.parse(codeText));
      } catch {
        toast.error('Invalid JSON — fix it before switching to structured mode');
        return;
      }
    }
    setMode(newMode);
  };

  const updateSection = (idx, updated) => {
    const sections = [...guide.sections];
    sections[idx] = updated;
    setGuide({ ...guide, sections });
  };

  const removeSection = (idx) => {
    if (!window.confirm('Remove this section?')) return;
    const sections = guide.sections.filter((_, i) => i !== idx);
    setGuide({ ...guide, sections });
  };

  const moveSection = (idx, dir) => {
    const sections = [...guide.sections];
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    sections.forEach((s, i) => { s.order = i; });
    setGuide({ ...guide, sections });
  };

  const addSection = () => {
    const id = `section-${Date.now()}`;
    const sections = [...guide.sections, {
      id, title: '', type: 'text', content: '', image_url: '', order: guide.sections.length,
      steps: [], tips: [], items: [],
    }];
    setGuide({ ...guide, sections });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;
  if (!guide) return <p className="text-sm text-muted-foreground text-center py-8">No guide data found.</p>;

  return (
    <div className="space-y-4" data-testid="help-guide-editor">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 border rounded-md p-0.5">
            <Button variant={mode === 'structured' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => switchMode('structured')} data-testid="mode-structured">
              <FileText className="h-3 w-3 mr-1" /> Structured
            </Button>
            <Button variant={mode === 'code' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => switchMode('code')} data-testid="mode-code">
              <Code className="h-3 w-3 mr-1" /> Code
            </Button>
          </div>
          {meta.source && <Badge variant="outline" className="text-[9px]">Source: {meta.source}</Badge>}
          {meta.updated_by && <span className="text-[9px] text-muted-foreground">Last edit: {meta.updated_by} @ {meta.updated_at ? new Date(meta.updated_at).toLocaleString() : ''}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.open('/help-guide', '_blank')} data-testid="preview-guide-btn">
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={saveGuide} disabled={saving} data-testid="save-guide-btn">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
          </Button>
        </div>
      </div>

      {mode === 'structured' ? (
        <div className="space-y-4">
          {/* Guide Header */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground">Guide Title</Label>
                <Input value={guide.title || ''} onChange={e => setGuide({ ...guide, title: e.target.value })} className="h-9 text-sm mt-1" data-testid="guide-title-input" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Introduction</Label>
                <Textarea value={guide.intro || ''} onChange={e => setGuide({ ...guide, intro: e.target.value })} rows={2} className="text-xs mt-1" data-testid="guide-intro-input" />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Sections */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{guide.sections?.length || 0} Sections</p>
            <Button size="sm" className="h-7 text-xs" onClick={addSection} data-testid="add-section-btn">
              <Plus className="h-3 w-3 mr-1" /> Add Section
            </Button>
          </div>

          <div className="space-y-2">
            {(guide.sections || []).map((section, idx) => (
              <SectionEditor
                key={section.id}
                section={section}
                onChange={(updated) => updateSection(idx, updated)}
                onRemove={() => removeSection(idx)}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === guide.sections.length - 1}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Edit the raw JSON. Changes will be validated on save.</p>
          <Textarea
            value={codeText}
            onChange={e => setCodeText(e.target.value)}
            rows={30}
            className="font-mono text-xs"
            data-testid="code-editor-textarea"
          />
        </div>
      )}
    </div>
  );
}
