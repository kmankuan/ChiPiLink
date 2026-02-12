/**
 * Schools Management Component
 * Allows admins to add, edit, and manage schools for textbook access
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  School,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Translations
const translations = {
  en: {
    title: 'Schools Management',
    subtitle: 'Add and manage schools available for textbook access requests',
    addSchool: 'Add School',
    editSchool: 'Edit School',
    name: 'School Name',
    shortName: 'Short Name',
    catalogId: 'Catalog ID',
    active: 'Active',
    noSchools: 'No schools configured',
    noSchoolsDesc: 'Add the first school to allow textbook access requests.',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this school?',
    errors: {
      loadFailed: 'Failed to load schools',
      saveFailed: 'Failed to save school',
      deleteFailed: 'Failed to delete school'
    },
    success: {
      saved: 'School saved successfully',
      deleted: 'School deleted successfully'
    }
  },
  es: {
    title: 'Gestión de Escuelas',
    subtitle: 'Agregue y gestione escuelas disponibles para solicitudes de acceso a books',
    addSchool: 'Agregar Escuela',
    editSchool: 'Editar Escuela',
    name: 'Nombre de la Escuela',
    shortName: 'Nombre Corto',
    catalogId: 'ID del Catálogo',
    active: 'Activo',
    noSchools: 'No hay escuelas configuradas',
    noSchoolsDesc: 'Agregue la primera escuela para permitir solicitudes de acceso a books.',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    deleteConfirm: '¿Está seguro de que desea eliminar esta escuela?',
    errors: {
      loadFailed: 'Error al cargar escuelas',
      saveFailed: 'Error al guardar escuela',
      deleteFailed: 'Error al eliminar escuela'
    },
    success: {
      saved: 'Escuela guardada exitosamente',
      deleted: 'Escuela eliminada exitosamente'
    }
  },
  zh: {
    title: '学校管理',
    subtitle: '添加和管理可用于教科书访问请求的学校',
    addSchool: '添加学校',
    editSchool: '编辑学校',
    name: '学校名称',
    shortName: '简称',
    catalogId: '目录ID',
    active: '启用',
    noSchools: '没有配置学校',
    noSchoolsDesc: '添加第一所学校以允许教科书访问请求。',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    deleteConfirm: '确定要删除这所学校吗？',
    errors: {
      loadFailed: '加载学校失败',
      saveFailed: '保存学校失败',
      deleteFailed: '删除学校失败'
    },
    success: {
      saved: '学校保存成功',
      deleted: '学校删除成功'
    }
  }
};

const defaultFormData = {
  name: '',
  short_name: '',
  catalog_id: '',
  is_active: true
};

export default function SchoolsManagementTab({ token }) {
  const { i18n } = useTranslation();
  const t = translations[i18n.language] || translations.en;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [search, setSearch] = useState('');

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/textbook-access/schools`);
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } catch (err) {
      toast.error(t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.errors.loadFailed]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleOpenDialog = (school = null) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name || '',
        short_name: school.short_name || '',
        catalog_id: school.catalog_id || '',
        is_active: school.is_active !== false
      });
    } else {
      setEditingSchool(null);
      setFormData(defaultFormData);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSchool(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('School name is required');
      return;
    }

    setSaving(true);
    try {
      const url = editingSchool 
        ? `${API}/api/store/textbook-access/admin/schools/${editingSchool.school_id}`
        : `${API}/api/store/textbook-access/admin/schools`;
      
      const method = editingSchool ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          short_name: formData.short_name.trim() || formData.name.substring(0, 10),
          catalog_id: formData.catalog_id.trim() || formData.name.toLowerCase().replace(/\s+/g, '_').substring(0, 20),
          is_active: formData.is_active
        })
      });

      if (res.ok) {
        toast.success(t.success.saved);
        handleCloseDialog();
        fetchSchools();
      } else {
        const error = await res.json();
        toast.error(error.detail || t.errors.saveFailed);
      }
    } catch (err) {
      toast.error(t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (school) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      const res = await fetch(`${API}/api/store/textbook-access/admin/schools/${school.school_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(t.success.deleted);
        fetchSchools();
      } else {
        toast.error(t.errors.deleteFailed);
      }
    } catch (err) {
      toast.error(t.errors.deleteFailed);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                {t.title}
              </CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchSchools}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleOpenDialog()} data-testid="add-school-btn">
                <Plus className="h-4 w-4 mr-2" />
                {t.addSchool}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          {schools.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schools..." className="pl-8 h-9 text-sm" data-testid="search-schools" />
            </div>
          )}
          {schools.length === 0 ? (
            <div className="text-center py-12">
              <School className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">{t.noSchools}</h3>
              <p className="text-muted-foreground mt-1">{t.noSchoolsDesc}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t.addSchool}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.shortName}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.catalogId}</TableHead>
                  <TableHead className="text-center">{t.active}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.short_name?.toLowerCase().includes(search.toLowerCase())).map((school) => (
                  <TableRow key={school.school_id}>
                    <TableCell className="font-medium">
                      {school.name}
                      <p className="text-xs text-muted-foreground sm:hidden">{school.short_name}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{school.short_name}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{school.catalog_id}</TableCell>
                    <TableCell className="text-center">
                      {school.is_active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(school)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(school)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSchool ? t.editSchool : t.addSchool}
            </DialogTitle>
            <DialogDescription>
              {editingSchool 
                ? 'Update the school information below.'
                : 'Enter the school details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.name} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Panama Christian Academy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_name">{t.shortName}</Label>
              <Input
                id="short_name"
                value={formData.short_name}
                onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                placeholder="e.g. PCA"
              />
              <p className="text-xs text-muted-foreground">
                Short abbreviation for the school
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog_id">{t.catalogId}</Label>
              <Input
                id="catalog_id"
                value={formData.catalog_id}
                onChange={(e) => setFormData(prev => ({ ...prev, catalog_id: e.target.value }))}
                placeholder="e.g. pca"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for linking to textbook catalog
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t.active}</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
