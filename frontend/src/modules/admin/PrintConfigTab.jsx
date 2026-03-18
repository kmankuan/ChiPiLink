import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Printer, Copy, Trash2, Check, Star, StarOff, Pencil, Plus, X, Save,
} from 'lucide-react';
import axios from 'axios';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('auth_token')}` });

const FONT_OPTIONS = [
  { value: 'Verdana, Arial, Helvetica, sans-serif', label: 'Verdana (Recommended)' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: 'Georgia, serif', label: 'Georgia (Serif)' },
  { value: "'Courier New', monospace", label: 'Courier New (Monospace)' },
  { value: "'Lucida Console', monospace", label: 'Lucida Console (Monospace)' },
];

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '16px'];

export default function PrintConfigTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [cloneFrom, setCloneFrom] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/print/templates`, { headers: hdrs() });
      setTemplates(r.data.templates || []);
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setEditForm(JSON.parse(JSON.stringify(tpl.format_config)));
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/print/templates/${id}`, { format_config: editForm }, { headers: hdrs() });
      toast.success('Template saved');
      cancelEdit();
      fetchTemplates();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const activate = async (id) => {
    try {
      await axios.post(`${API}/api/print/templates/${id}/activate`, {}, { headers: hdrs() });
      toast.success('Template activated — print config updated');
      fetchTemplates();
    } catch { toast.error('Activation failed'); }
  };

  const deleteTpl = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API}/api/print/templates/${id}`, { headers: hdrs() });
      toast.success('Deleted');
      fetchTemplates();
    } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  const createTemplate = async () => {
    if (!newName.trim()) { toast.error('Name required'); return; }
    try {
      const body = { name: newName.trim() };
      if (cloneFrom) body.clone_from = cloneFrom;
      await axios.post(`${API}/api/print/templates`, body, { headers: hdrs() });
      toast.success('Template created');
      setCreating(false);
      setNewName('');
      setCloneFrom('');
      fetchTemplates();
    } catch { toast.error('Create failed'); }
  };

  const updateEditStyle = (key, val) => {
    setEditForm(f => ({ ...f, style: { ...f.style, [key]: val } }));
  };

  const updateEditHeader = (key, val) => {
    setEditForm(f => ({ ...f, header: { ...f.header, [key]: val } }));
  };

  const updateEditFooter = (key, val) => {
    setEditForm(f => ({ ...f, footer: { ...f.footer, [key]: val } }));
  };

  const updateEditBody = (key, val) => {
    setEditForm(f => ({ ...f, body: { ...f.body, [key]: val } }));
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4" data-testid="print-config-tab">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{templates.length} template(s)</p>
        <Button size="sm" onClick={() => setCreating(true)} data-testid="create-template-btn">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Template
        </Button>
      </div>

      {creating && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Template name" value={newName} onChange={e => setNewName(e.target.value)} className="h-9 text-sm" data-testid="new-template-name" />
            <div>
              <Label className="text-xs text-muted-foreground">Clone from (optional)</Label>
              <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)} className="h-9 w-full px-2 text-xs border rounded-md bg-background mt-1" data-testid="clone-from-select">
                <option value="">Start from scratch (defaults)</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewName(''); setCloneFrom(''); }}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={createTemplate} data-testid="confirm-create-btn"><Check className="h-3.5 w-3.5 mr-1" /> Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.map(tpl => {
        const isEditing = editingId === tpl.id;
        const cfg = isEditing ? editForm : tpl.format_config;
        const style = cfg?.style || {};

        return (
          <Card key={tpl.id} className={`${tpl.is_active ? 'border-primary/50 bg-primary/5' : ''}`} data-testid={`template-${tpl.id}`}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{tpl.name}</CardTitle>
                  {tpl.is_active && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">Active</Badge>}
                </div>
                <div className="flex gap-1">
                  {!tpl.is_active && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => activate(tpl.id)} data-testid={`activate-${tpl.id}`}>
                      <Star className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  )}
                  {!isEditing ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(tpl)} data-testid={`edit-${tpl.id}`}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(tpl.id)} disabled={saving} data-testid={`save-${tpl.id}`}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                      </Button>
                    </>
                  )}
                  {!tpl.is_active && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteTpl(tpl.id)} data-testid={`delete-${tpl.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {tpl.description && <p className="text-[10px] text-muted-foreground mt-1">{tpl.description}</p>}
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Typography */}
              <div>
                <p className="text-xs font-semibold mb-2">Typography</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Font Family</Label>
                    <select
                      value={style.font_family || 'Verdana, Arial, Helvetica, sans-serif'}
                      onChange={e => updateEditStyle('font_family', e.target.value)}
                      disabled={!isEditing}
                      className="h-8 w-full px-2 text-xs border rounded-md bg-background mt-1"
                      data-testid={`font-family-${tpl.id}`}
                    >
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Base Font Size</Label>
                    <select
                      value={style.font_size || '12px'}
                      onChange={e => updateEditStyle('font_size', e.target.value)}
                      disabled={!isEditing}
                      className="h-8 w-full px-2 text-xs border rounded-md bg-background mt-1"
                      data-testid={`font-size-${tpl.id}`}
                    >
                      {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {/* Font preview */}
                <div className="mt-2 p-2 border rounded bg-white dark:bg-gray-900 text-center">
                  <span style={{ fontFamily: style.font_family || 'Verdana', fontSize: style.font_size || '12px', color: '#000' }}>
                    The quick brown fox — 0123456789 — $49.99
                  </span>
                </div>
              </div>

              <Separator />

              {/* Header Config */}
              <div>
                <p className="text-xs font-semibold mb-2">Header</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Title</Label>
                    <Input value={cfg?.header?.title || ''} onChange={e => updateEditHeader('title', e.target.value)} disabled={!isEditing} className="h-8 text-xs mt-1" />
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {[
                      ['show_date', 'Show Date'],
                      ['show_order_id', 'Show Order ID'],
                      ['show_logo', 'Show Logo'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <input type="checkbox" checked={cfg?.header?.[key] ?? true} onChange={e => updateEditHeader(key, e.target.checked)} disabled={!isEditing} className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Body Config */}
              <div>
                <p className="text-xs font-semibold mb-2">Body / Items</p>
                <div className="flex gap-4 flex-wrap">
                  {[
                    ['show_checkboxes', 'Checkboxes'],
                    ['show_item_code', 'Code'],
                    ['show_item_name', 'Name'],
                    ['show_item_quantity', 'Quantity'],
                    ['show_item_price', 'Price'],
                    ['show_item_status', 'Status'],
                    ['show_student_name', 'Student Name'],
                    ['show_grade', 'Grade'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                      <input type="checkbox" checked={cfg?.body?.[key] ?? true} onChange={e => updateEditBody(key, e.target.checked)} disabled={!isEditing} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Footer Config */}
              <div>
                <p className="text-xs font-semibold mb-2">Footer</p>
                <div className="flex gap-4 flex-wrap mb-2">
                  {[
                    ['show_total', 'Total'],
                    ['show_item_count', 'Item Count'],
                    ['show_signature_line', 'Signature Line'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                      <input type="checkbox" checked={cfg?.footer?.[key] ?? true} onChange={e => updateEditFooter(key, e.target.checked)} disabled={!isEditing} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Signature Label</Label>
                    <Input value={cfg?.footer?.signature_label || ''} onChange={e => updateEditFooter('signature_label', e.target.value)} disabled={!isEditing} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Custom Footer Text</Label>
                    <Input value={cfg?.footer?.custom_text || ''} onChange={e => updateEditFooter('custom_text', e.target.value)} disabled={!isEditing} className="h-8 text-xs mt-1" />
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground pt-2">
                {tpl.created_by && <span>by {tpl.created_by}</span>}
                {tpl.updated_at && <span>updated {new Date(tpl.updated_at).toLocaleDateString()}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
