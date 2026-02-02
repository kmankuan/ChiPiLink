/**
 * CategoryManager - Admin notification categories management
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EMOJI_OPTIONS = ['💳', '📍', '🎫', '🏆', '📊', '👥', '📢', '🎉', '🔔', '⚡', '🎮', '💬', '📧', '🎁', '🏅'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];
const MODULE_OPTIONS = ['wallet', 'membership', 'pinpanclub', 'social', 'admin', 'marketing', 'general'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

export default function CategoryManager({ token }) {
  const { t, i18n } = useTranslation();
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

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/categories`, {
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

  const openDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name || { es: '', en: '', zh: '' },
        description: category.description || { es: '', en: '', zh: '' },
        icon: category.icon || '🔔',
        color: category.color || '#6366f1',
        module: category.module || 'general',
        priority: category.priority || 'normal',
        default_enabled: category.default_enabled !== false
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: { es: '', en: '', zh: '' },
        description: { es: '', en: '', zh: '' },
        icon: '🔔',
        color: '#6366f1',
        module: 'general',
        priority: 'normal',
        default_enabled: true
      });
    }
    setIsDialogOpen(true);
  };

  const saveCategory = async () => {
    try {
      const url = editingCategory
        ? `${API_URL}/api/notifications/categories/${editingCategory.category_id}`
        : `${API_URL}/api/notifications/categories`;

      const res = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingCategory 
          ? t('notifications.categoryManager.updated') 
          : t('notifications.categoryManager.created')
        );
        setIsDialogOpen(false);
        fetchCategories();
      }
    } catch (error) {
      toast.error(t('notifications.error'));
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm(t('notifications.categoryManager.confirmDelete'))) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(t('notifications.categoryManager.deleted'));
        fetchCategories();
      }
    } catch (error) {
      toast.error(t('notifications.error'));
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || '';
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
    <div className="space-y-4" data-testid="category-manager">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                {t('notifications.categoryManager.title')}
              </CardTitle>
              <CardDescription>{t('notifications.categoryManager.subtitle')}</CardDescription>
            </div>
            <Button onClick={() => openDialog()} data-testid="new-category-btn">
              <Plus className="h-4 w-4 mr-2" />
              {t('notifications.categoryManager.newCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('notifications.categoryManager.noCategories')}
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.category_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <p className="font-medium">{getLocalizedText(category.name)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getLocalizedText(category.description)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{category.module}</Badge>
                    <Badge 
                      variant={category.priority === 'high' || category.priority === 'urgent' ? 'destructive' : 'secondary'}
                    >
                      {category.priority}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openDialog(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteCategory(category.category_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory 
                ? t('notifications.edit') 
                : t('notifications.categoryManager.newCategory')
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name in all languages */}
            <div className="space-y-2">
              <Label>{t('notifications.categoryManager.name')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.spanish')}</span>
                  <Input
                    value={formData.name.es}
                    onChange={(e) => setFormData({
                      ...formData,
                      name: { ...formData.name, es: e.target.value }
                    })}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.english')}</span>
                  <Input
                    value={formData.name.en}
                    onChange={(e) => setFormData({
                      ...formData,
                      name: { ...formData.name, en: e.target.value }
                    })}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t('notifications.categoryManager.chinese')}</span>
                  <Input
                    value={formData.name.zh}
                    onChange={(e) => setFormData({
                      ...formData,
                      name: { ...formData.name, zh: e.target.value }
                    })}
                    placeholder="名称"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('notifications.categoryManager.description')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={formData.description.es}
                  onChange={(e) => setFormData({
                    ...formData,
                    description: { ...formData.description, es: e.target.value }
                  })}
                  placeholder="Descripción"
                />
                <Input
                  value={formData.description.en}
                  onChange={(e) => setFormData({
                    ...formData,
                    description: { ...formData.description, en: e.target.value }
                  })}
                  placeholder="Description"
                />
                <Input
                  value={formData.description.zh}
                  onChange={(e) => setFormData({
                    ...formData,
                    description: { ...formData.description, zh: e.target.value }
                  })}
                  placeholder="描述"
                />
              </div>
            </div>

            {/* Icon and Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('notifications.categoryManager.icon')}</Label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`w-10 h-10 rounded-lg text-xl hover:bg-muted transition-colors ${
                        formData.icon === emoji ? 'ring-2 ring-primary bg-muted' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('notifications.categoryManager.color')}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-10 h-10 rounded-lg transition-transform ${
                        formData.color === color ? 'ring-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Module and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('notifications.categoryManager.module')}</Label>
                <Select 
                  value={formData.module} 
                  onValueChange={(v) => setFormData({ ...formData, module: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((mod) => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('notifications.categoryManager.priority')}</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
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
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>{t('notifications.categoryManager.defaultEnabled')}</Label>
              <Switch
                checked={formData.default_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, default_enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveCategory}>
              <Check className="h-4 w-4 mr-2" />
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
