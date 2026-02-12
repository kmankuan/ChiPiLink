import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Save,
  RefreshCw,
  Languages,
  AlertCircle,
  Check,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TranslationsModule() {
  const { api } = useAuth();
  const { t, i18n } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Inline edit state
  const [editingCell, setEditingCell] = useState(null); // { key, lang }
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const inputRef = useRef(null);

  // Edit dialog (for full edit)
  const [editDialog, setEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ key: '', es: '', zh: '', en: '' });
  const [saving, setSaving] = useState(false);

  // Add new dialog
  const [addDialog, setAddDialog] = useState(false);
  const [newKey, setNewKey] = useState('');

  const canEdit = hasPermission('translations.edit') || isSuperAdmin;
  const canManage = hasPermission('translations.manage') || isSuperAdmin;

  useEffect(() => {
    fetchTranslations();
  }, [page, categoryFilter, missingOnly]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (missingOnly) params.append('missing_only', 'true');

      const res = await api.get(`/translations/admin/list?${params}`);
      setTranslations(res.data.items || []);
      setCategories(res.data.categories || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTranslations();
  };

  const syncFromFiles = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/translations/admin/sync-from-files');
      toast.success(t('translationsMgmt.synced', { count: res.data.synced }));
      fetchTranslations();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSyncing(false);
    }
  };

  // Inline cell editing
  const startInlineEdit = (item, lang) => {
    if (!canEdit) return;
    setEditingCell({ key: item.key, lang });
    setEditValue(item[lang] || '');
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    setSavingCell(true);
    try {
      await api.post('/translations/admin/update', null, {
        params: {
          key: editingCell.key,
          lang: editingCell.lang,
          value: editValue,
        }
      });
      // Update local state
      setTranslations(prev =>
        prev.map(item =>
          item.key === editingCell.key
            ? { ...item, [editingCell.lang]: editValue }
            : item
        )
      );
      toast.success(t('translationsMgmt.saved'));
      setEditingCell(null);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingCell(false);
    }
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Full edit dialog
  const openEditDialog = (item) => {
    setEditingItem(item);
    setEditForm({ ...item });
    setEditDialog(true);
  };

  const saveTranslation = async () => {
    try {
      setSaving(true);
      for (const lang of ['es', 'zh', 'en']) {
        if (editForm[lang] !== editingItem[lang]) {
          await api.post('/translations/admin/update', null, {
            params: { key: editForm.key, lang, value: editForm[lang] }
          });
        }
      }
      toast.success(t('translationsMgmt.saved'));
      setEditDialog(false);
      fetchTranslations();
      i18n.reloadResources();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const addNewKey = async () => {
    if (!newKey.trim()) {
      toast.error(t('translationsMgmt.enterKey'));
      return;
    }
    try {
      await api.post('/translations/admin/update', null, {
        params: { key: newKey, lang: 'en', value: '' }
      });
      toast.success(t('translationsMgmt.keyCreated'));
      setAddDialog(false);
      setNewKey('');
      fetchTranslations();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const deleteKey = async (key) => {
    if (!confirm(`${t('translationsMgmt.deleteConfirm')} "${key}"?`)) return;
    try {
      await api.delete(`/translations/admin/delete/${encodeURIComponent(key)}`);
      toast.success(t('translationsMgmt.keyDeleted'));
      fetchTranslations();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const getMissingBadge = (item) => {
    const missing = [];
    if (!item.es) missing.push('ES');
    if (!item.zh) missing.push('ZH');
    if (!item.en) missing.push('EN');

    if (missing.length === 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
          <Check className="h-3 w-3 mr-1" />{t('translationsMgmt.complete')}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        {t('translationsMgmt.missing')}: {missing.join(', ')}
      </Badge>
    );
  };

  const renderCell = (item, lang) => {
    const isEditing = editingCell?.key === item.key && editingCell?.lang === lang;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveInlineEdit();
              if (e.key === 'Escape') cancelInlineEdit();
            }}
            className="h-7 text-xs"
            disabled={savingCell}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveInlineEdit} disabled={savingCell}>
            {savingCell ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelInlineEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    const val = item[lang];
    return (
      <div
        className={`max-w-xs truncate cursor-pointer rounded px-1 py-0.5 transition-colors ${canEdit ? 'hover:bg-muted' : ''} ${!val ? 'italic text-muted-foreground' : ''}`}
        onClick={() => canEdit && startInlineEdit(item, lang)}
        title={val || t('translationsMgmt.untranslated')}
        data-testid={`cell-${item.key}-${lang}`}
      >
        {val || t('translationsMgmt.untranslated')}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="translations-module">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('translationsMgmt.title')}
          </CardTitle>
          <CardDescription>
            {t('translationsMgmt.desc')}
            {totalItems > 0 && <span className="ml-1">({totalItems} {t('translationsMgmt.key').toLowerCase()}s)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('translationsMgmt.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                  data-testid="translations-search"
                />
              </div>
              <Button onClick={handleSearch} data-testid="translations-search-btn">
                {t('translationsMgmt.search')}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="category-filter">
                  <SelectValue placeholder={t('translationsMgmt.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('translationsMgmt.allCategories')}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={missingOnly ? 'default' : 'outline'}
                onClick={() => { setMissingOnly(!missingOnly); setPage(1); }}
                data-testid="missing-only-filter"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                {t('translationsMgmt.missingOnly')}
              </Button>
            </div>
          </div>

          {/* Actions (permission-gated) */}
          {canManage && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={syncFromFiles} disabled={syncing} data-testid="sync-files-btn">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('translationsMgmt.syncFromFiles')}
              </Button>
              <Button variant="outline" onClick={() => setAddDialog(true)} data-testid="add-key-btn">
                <Plus className="h-4 w-4 mr-2" />
                {t('translationsMgmt.newKey')}
              </Button>
            </div>
          )}

          {canEdit && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Edit2 className="h-3 w-3" />
              {t('translationsMgmt.inlineEditHint')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Translations Table */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile scroll hint */}
          <div className="md:hidden px-3 py-2 bg-blue-50 dark:bg-blue-950 border-b text-xs text-blue-700 dark:text-blue-300">
            {t('translationsMgmt.scrollHint')}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full min-w-[800px]" data-testid="translations-table">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium whitespace-nowrap min-w-[140px]">{t('translationsMgmt.key')}</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap min-w-[170px]">EN</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap min-w-[170px]">ES</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap min-w-[170px]">ZH</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap min-w-[90px]">{t('translationsMgmt.status')}</th>
                    {(canEdit || canManage) && (
                      <th className="text-right p-3 font-medium whitespace-nowrap min-w-[70px]">{t('translationsMgmt.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {translations.map((item) => (
                    <tr key={item.key} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded break-all">{item.key}</code>
                      </td>
                      <td className="p-3">{renderCell(item, 'en')}</td>
                      <td className="p-3">{renderCell(item, 'es')}</td>
                      <td className="p-3">{renderCell(item, 'zh')}</td>
                      <td className="p-3">{getMissingBadge(item)}</td>
                      {(canEdit || canManage) && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(item)} data-testid={`edit-btn-${item.key}`}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canManage && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteKey(item.key)} data-testid={`delete-btn-${item.key}`}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {translations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {t('translationsMgmt.noTranslations')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            {t('translationsMgmt.previous')}
          </Button>
          <span className="py-2 px-4 text-sm text-muted-foreground">
            {t('translationsMgmt.pageOf', { page, total: totalPages })}
          </span>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            {t('translationsMgmt.next')}
          </Button>
        </div>
      )}

      {/* Full Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('translationsMgmt.editTranslation')}</DialogTitle>
            <DialogDescription>
              <code className="text-xs bg-muted px-2 py-1 rounded">{editForm.key}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">EN</label>
              <Textarea
                value={editForm.en}
                onChange={(e) => setEditForm({ ...editForm, en: e.target.value })}
                rows={2}
                data-testid="edit-en"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2">ES</label>
              <Textarea
                value={editForm.es}
                onChange={(e) => setEditForm({ ...editForm, es: e.target.value })}
                rows={2}
                data-testid="edit-es"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2">ZH</label>
              <Textarea
                value={editForm.zh}
                onChange={(e) => setEditForm({ ...editForm, zh: e.target.value })}
                rows={2}
                data-testid="edit-zh"
              />
            </div>
            <Button onClick={saveTranslation} disabled={saving} className="w-full" data-testid="save-translation-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t('translationsMgmt.saveTranslation')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Key Dialog */}
      {canManage && (
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('translationsMgmt.newKeyTitle')}</DialogTitle>
              <DialogDescription>{t('translationsMgmt.keyHint')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder={t('translationsMgmt.keyPlaceholder')}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewKey()}
                  data-testid="new-key-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('translationsMgmt.keyExample')}
                </p>
              </div>
              <Button onClick={addNewKey} className="w-full" data-testid="create-key-btn">
                <Plus className="h-4 w-4 mr-2" />
                {t('translationsMgmt.createKey')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
