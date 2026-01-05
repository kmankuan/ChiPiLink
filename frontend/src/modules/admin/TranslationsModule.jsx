import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
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
  Download,
  Upload,
  RefreshCw,
  Languages,
  AlertCircle,
  Check,
  Loader2,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';

export default function TranslationsModule() {
  const { api } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ key: '', es: '', zh: '', en: '' });
  const [saving, setSaving] = useState(false);
  
  // Add new dialog
  const [addDialog, setAddDialog] = useState(false);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    fetchTranslations();
  }, [page, categoryFilter, missingOnly]);

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
    } catch (error) {
      toast.error('Error al cargar traducciones');
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
      toast.success(`Sincronizados ${res.data.synced} términos`);
      fetchTranslations();
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setEditForm({ ...item });
    setEditDialog(true);
  };

  const saveTranslation = async () => {
    try {
      setSaving(true);
      
      // Update each language
      for (const lang of ['es', 'zh', 'en']) {
        if (editForm[lang] !== editingItem[lang]) {
          await api.post('/translations/admin/update', null, {
            params: {
              key: editForm.key,
              lang,
              value: editForm[lang]
            }
          });
        }
      }
      
      toast.success('Traducción guardada');
      setEditDialog(false);
      fetchTranslations();
      
      // Reload i18n to apply changes
      i18n.reloadResources();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addNewKey = async () => {
    if (!newKey.trim()) {
      toast.error('Ingresa una clave');
      return;
    }
    
    try {
      // Create empty translations for the new key
      await api.post('/translations/admin/update', null, {
        params: { key: newKey, lang: 'es', value: '' }
      });
      
      toast.success('Clave creada');
      setAddDialog(false);
      setNewKey('');
      fetchTranslations();
    } catch (error) {
      toast.error('Error al crear clave');
    }
  };

  const deleteKey = async (key) => {
    if (!confirm(`¿Eliminar "${key}"?`)) return;
    
    try {
      await api.delete(`/translations/admin/delete/${encodeURIComponent(key)}`);
      toast.success('Clave eliminada');
      fetchTranslations();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getMissingBadge = (item) => {
    const missing = [];
    if (!item.es) missing.push('ES');
    if (!item.zh) missing.push('ZH');
    if (!item.en) missing.push('EN');
    
    if (missing.length === 0) {
      return <Badge variant="outline" className="bg-green-50 text-green-700"><Check className="h-3 w-3 mr-1" />Completo</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Falta: {missing.join(', ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Gestión de Traducciones
          </CardTitle>
          <CardDescription>
            Administra los textos de la aplicación en los 3 idiomas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por clave o texto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>Buscar</Button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant={missingOnly ? "default" : "outline"}
                onClick={() => setMissingOnly(!missingOnly)}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Faltantes
              </Button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={syncFromFiles} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar desde archivos
            </Button>
            <Button variant="outline" onClick={() => setAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva clave
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Translations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium whitespace-nowrap">Clave</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap">🇺🇸 English</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap">🇵🇦 Español</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap">🇨🇳 中文</th>
                    <th className="text-left p-3 font-medium whitespace-nowrap">Estado</th>
                    <th className="text-right p-3 font-medium whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {translations.map((item) => (
                    <tr key={item.key} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{item.key}</code>
                      </td>
                      <td className="p-3 max-w-xs truncate" title={item.en}>
                        {item.en || <span className="text-muted-foreground italic">Sin traducir</span>}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={item.es}>
                        {item.es || <span className="text-muted-foreground italic">Sin traducir</span>}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={item.zh}>
                        {item.zh || <span className="text-muted-foreground italic">Sin traducir</span>}
                      </td>
                      <td className="p-3">{getMissingBadge(item)}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteKey(item.key)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {translations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No hay traducciones. Haz clic en "Sincronizar desde archivos" para importar.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="py-2 px-4">Página {page} de {totalPages}</span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Traducción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Clave</label>
              <Input value={editForm.key} disabled className="bg-muted" />
            </div>
            
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                🇺🇸 English
              </label>
              <Textarea
                value={editForm.en}
                onChange={(e) => setEditForm({...editForm, en: e.target.value})}
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                🇵🇦 Español
              </label>
              <Textarea
                value={editForm.es}
                onChange={(e) => setEditForm({...editForm, es: e.target.value})}
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                🇨🇳 中文 (Chino)
              </label>
              <Textarea
                value={editForm.zh}
                onChange={(e) => setEditForm({...editForm, zh: e.target.value})}
                rows={2}
              />
            </div>
            
            <Button onClick={saveTranslation} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Traducciones
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Key Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Clave de Traducción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Clave (usar punto para categorías)</label>
              <Input
                placeholder="categoria.subcategoria.nombre"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplo: nav.myAccount, membership.checkIn
              </p>
            </div>
            <Button onClick={addNewKey} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Crear Clave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
