/**
 * CategoryManager - Gestión de categorías de notificaciones (Admin)
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, Edit2, Trash2, RefreshCw, GripVertical, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EMOJI_OPTIONS = ['💳', '📍', '🎫', '🏆', '📊', '👥', '📢', '🎉', '🔔', '⚡', '🎮', '💬', '📧', '🎁', '🏅'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];
const MODULE_OPTIONS = ['wallet', 'membership', 'pinpanclub', 'social', 'admin', 'marketing', 'general'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

export default function CategoryManager({ token }) {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: { es: '', en: '', zh: '' },
    description: { es: '', en: '', zh: '' },
    icon: '🔔',
    color: '#6366f1',
    module: 'general',
    priority: 'normal',
    default_enabled: true
  });

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Categorías de Notificación',
      subtitle: 'Gestiona las categorías para organizar notificaciones',
      newCategory: 'Nueva Categoría',
      edit: 'Editar',
      delete: 'Eliminar',
      name: 'Nombre',
      description: 'Descripción',
      icon: 'Icono',
      color: 'Color',
      module: 'Módulo',
      priority: 'Prioridad',
      defaultEnabled: 'Activo por defecto',
      save: 'Guardar',
      cancel: 'Cancelar',
      created: 'Categoría creada',
      updated: 'Categoría actualizada',
      deleted: 'Categoría eliminada',
      confirmDelete: '¿Eliminar esta categoría?',
      spanish: 'Español',
      english: 'Inglés',
      chinese: 'Chino'
    },
    en: {
      title: 'Notification Categories',
      subtitle: 'Manage categories to organize notifications',
      newCategory: 'New Category',
      edit: 'Edit',
      delete: 'Delete',
      name: 'Name',
      description: 'Description',
      icon: 'Icon',
      color: 'Color',
      module: 'Module',
      priority: 'Priority',
      defaultEnabled: 'Enabled by default',
      save: 'Save',
      cancel: 'Cancel',
      created: 'Category created',
      updated: 'Category updated',
      deleted: 'Category deleted',
      confirmDelete: 'Delete this category?',
      spanish: 'Spanish',
      english: 'English',
      chinese: 'Chinese'
    },
    zh: {
      title: '通知分类',
      subtitle: '管理分类以组织通知',
      newCategory: '新建分类',
      edit: '编辑',
      delete: '删除',
      name: '名称',
      description: '描述',
      icon: '图标',
      color: '颜色',
      module: '模块',
      priority: '优先级',
      defaultEnabled: '默认启用',
      save: '保存',
      cancel: '取消',
      created: '分类已创建',
      updated: '分类已更新',
      deleted: '分类已删除',
      confirmDelete: '删除此分类？',
      spanish: '西班牙语',
      english: '英语',
      chinese: '中文'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/categories?active_only=false`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: { es: '', en: '', zh: '' },
      description: { es: '', en: '', zh: '' },
      icon: '🔔',
      color: '#6366f1',
      module: 'general',
      priority: 'normal',
      default_enabled: true
    });
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || { es: '', en: '', zh: '' },
      description: category.description || { es: '', en: '', zh: '' },
      icon: category.icon || '🔔',
      color: category.color || '#6366f1',
      module: category.module || 'general',
      priority: category.priority || 'normal',
      default_enabled: category.default_enabled ?? true
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.es) {
      toast.error('El nombre en español es requerido');
      return;
    }

    try {
      const url = editingCategory
        ? `${API_URL}/api/notifications/admin/categories/${editingCategory.category_id}`
        : `${API_URL}/api/notifications/admin/categories`;
      
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingCategory ? txt.updated : txt.created);
        setIsDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    } catch (error) {
      toast.error('Error saving category');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm(txt.confirmDelete)) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(txt.deleted);
        fetchCategories();
      }
    } catch (error) {
      toast.error('Error deleting category');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="category-manager">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              {txt.title}
            </CardTitle>
            <CardDescription>{txt.subtitle}</CardDescription>
          </div>
          <Button onClick={openCreateDialog} data-testid="new-category-btn">
            <Plus className="h-4 w-4 mr-2" />
            {txt.newCategory}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((category) => (
              <div 
                key={category.category_id}
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  !category.is_active ? 'opacity-50 bg-muted/30' : ''
                }`}
                data-testid={`category-item-${category.category_id}`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span 
                    className="text-2xl p-2 rounded-lg"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </span>
                  <div>
                    <p className="font-medium">
                      {category.name?.[lang] || category.name?.es || category.category_id}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {category.description?.[lang] || category.description?.es || ''}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" style={{ borderColor: category.color }}>
                        {category.module}
                      </Badge>
                      <Badge variant={category.priority === 'high' || category.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {category.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(category.category_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? txt.edit : txt.newCategory}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Names */}
            <div className="space-y-3">
              <Label className="font-semibold">{txt.name}</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{txt.spanish}</Label>
                  <Input
                    value={formData.name.es}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, es: e.target.value }
                    }))}
                    placeholder="Nombre en español"
                    data-testid="category-name-es"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{txt.english}</Label>
                  <Input
                    value={formData.name.en}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, en: e.target.value }
                    }))}
                    placeholder="English name"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{txt.chinese}</Label>
                  <Input
                    value={formData.name.zh}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: { ...prev.name, zh: e.target.value }
                    }))}
                    placeholder="中文名称"
                  />
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-3">
              <Label className="font-semibold">{txt.description}</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  value={formData.description.es}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, es: e.target.value }
                  }))}
                  placeholder="Descripción"
                />
                <Input
                  value={formData.description.en}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, en: e.target.value }
                  }))}
                  placeholder="Description"
                />
                <Input
                  value={formData.description.zh}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, zh: e.target.value }
                  }))}
                  placeholder="描述"
                />
              </div>
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{txt.icon}</Label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`text-2xl p-2 rounded-lg border transition-all ${
                        formData.icon === emoji 
                          ? 'border-primary bg-primary/10 scale-110' 
                          : 'border-transparent hover:bg-muted'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{txt.color}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-primary scale-110 ring-2 ring-offset-2' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Module & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{txt.module}</Label>
                <Select 
                  value={formData.module}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, module: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{txt.priority}</Label>
                <Select 
                  value={formData.priority}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Enabled */}
            <div className="flex items-center justify-between">
              <Label>{txt.defaultEnabled}</Label>
              <Switch
                checked={formData.default_enabled}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, default_enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {txt.cancel}
            </Button>
            <Button onClick={handleSave} data-testid="save-category-btn">
              {txt.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
