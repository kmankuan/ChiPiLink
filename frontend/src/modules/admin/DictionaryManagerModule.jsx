/**
 * DictionaryManagerModule — Admin UI for managing the translation dictionary.
 * Core feature: add/edit/delete terms used by the auto-translate system.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { invalidateDictCache } from '@/utils/autoTranslate';
import {
  Edit2, Loader2, Plus, Save, Search, Trash2, X, Languages,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_COLORS = {
  people: 'bg-blue-100 text-blue-700',
  contact: 'bg-green-100 text-green-700',
  address: 'bg-amber-100 text-amber-700',
  education: 'bg-purple-100 text-purple-700',
  commerce: 'bg-orange-100 text-orange-700',
  documents: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-700',
};

export default function DictionaryManagerModule() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n?.language?.substring(0, 2) || 'en';
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editEntry, setEditEntry] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const texts = {
    en: { title: 'Translation Dictionary', desc: 'Core auto-translate terms used across all modules', addTerm: 'Add Term', search: 'Search terms...', all: 'All', entries: 'entries', custom: 'Custom', builtIn: 'Built-in', termAdded: 'Term added', termUpdated: 'Term updated', termDeleted: 'Term deleted', deleteConfirm: 'Delete this term?', duplicate: 'Term already exists', noResults: 'No terms match your search' },
    es: { title: 'Diccionario de Traducción', desc: 'Términos de auto-traducción utilizados en todos los módulos', addTerm: 'Agregar Término', search: 'Buscar términos...', all: 'Todos', entries: 'términos', custom: 'Personalizado', builtIn: 'Predeterminado', termAdded: 'Término agregado', termUpdated: 'Término actualizado', termDeleted: 'Término eliminado', deleteConfirm: '¿Eliminar este término?', duplicate: 'El término ya existe', noResults: 'Ningún término coincide con tu búsqueda' },
    zh: { title: '翻译词典', desc: '所有模块使用的核心自动翻译术语', addTerm: '添加术语', search: '搜索术语...', all: '全部', entries: '条目', custom: '自定义', builtIn: '内置', termAdded: '术语已添加', termUpdated: '术语已更新', termDeleted: '术语已删除', deleteConfirm: '删除此术语？', duplicate: '术语已存在', noResults: '没有匹配的术语' },
  };
  const t = texts[lang] || texts.en;

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCat) params.set('category', filterCat);
      if (search) params.set('search', search);
      const res = await fetch(`${API}/api/translations/admin/dictionary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Dict fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, filterCat, search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async (data, isNew) => {
    setSaving(true);
    try {
      const url = isNew
        ? `${API}/api/translations/admin/dictionary`
        : `${API}/api/translations/admin/dictionary/${data.term_id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success(isNew ? t.termAdded : t.termUpdated);
        setEditEntry(null);
        setShowAdd(false);
        invalidateDictCache();
        fetchEntries();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (termId) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await fetch(`${API}/api/translations/admin/dictionary/${termId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t.termDeleted);
      invalidateDictCache();
      fetchEntries();
    } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Languages className="h-5 w-5" /> {t.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.desc} &middot; {entries.length} {t.entries}</p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(true); setEditEntry(null); }} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> {t.addTerm}
        </Button>
      </div>

      {/* Search + Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant={!filterCat ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilterCat('')}>
            {t.all}
          </Button>
          {categories.map(cat => (
            <Button key={cat} size="sm" variant={filterCat === cat ? 'default' : 'outline'} className="h-8 text-xs capitalize" onClick={() => setFilterCat(cat)}>
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editEntry) && (
        <EntryForm
          entry={editEntry}
          isNew={showAdd}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setShowAdd(false); setEditEntry(null); }}
        />
      )}

      {/* Terms Table */}
      <div className="rounded-lg border bg-card divide-y">
        <div className="grid grid-cols-[1fr_1fr_80px_60px_50px] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
          <span>English</span>
          <span>Español</span>
          <span>中文</span>
          <span>Category</span>
          <span></span>
        </div>
        {entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t.noResults}</div>
        ) : entries.map(entry => (
          <div key={entry.term_id} className="grid grid-cols-[1fr_1fr_80px_60px_50px] gap-2 px-3 py-2 items-center text-sm hover:bg-muted/30">
            <span className="font-medium truncate">{entry.en}</span>
            <span className="truncate text-muted-foreground">{entry.es}</span>
            <span className="truncate text-muted-foreground">{entry.zh}</span>
            <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general}`}>
              {entry.category}
            </Badge>
            <div className="flex gap-0.5 justify-end">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditEntry(entry); setShowAdd(false); }}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(entry.term_id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Entry Form ============ */
function EntryForm({ entry, isNew, saving, onSave, onCancel }) {
  const [form, setForm] = useState({
    en: entry?.en || '',
    es: entry?.es || '',
    zh: entry?.zh || '',
    category: entry?.category || 'general',
  });

  return (
    <Card className="border-primary/30">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{isNew ? 'Add New Term' : `Edit: ${entry.en}`}</Label>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">English *</Label>
            <Input value={form.en} onChange={e => setForm(p => ({ ...p, en: e.target.value }))} className="h-8 text-sm" autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Español</Label>
            <Input value={form.es} onChange={e => setForm(p => ({ ...p, es: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">中文</Label>
            <Input value={form.zh} onChange={e => setForm(p => ({ ...p, zh: e.target.value }))} className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Category</Label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
              {['general', 'people', 'contact', 'address', 'education', 'commerce', 'documents'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => onSave(isNew ? form : { ...form, term_id: entry.term_id }, isNew)} disabled={saving || !form.en.trim()} className="gap-1.5 mt-5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isNew ? 'Add' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
