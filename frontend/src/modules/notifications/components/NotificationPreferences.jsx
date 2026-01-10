/**
 * NotificationPreferences - Preferencias de notificación del usuario
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Mail, Smartphone, Moon, RefreshCw, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationPreferences({ token }) {
  const { i18n } = useTranslation();
  const [preferences, setPreferences] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Preferencias de Notificaciones',
      subtitle: 'Configura cómo y cuándo recibir notificaciones',
      globalSettings: 'Configuración General',
      pushEnabled: 'Notificaciones Push',
      pushEnabledDesc: 'Recibir notificaciones en tu dispositivo',
      emailEnabled: 'Notificaciones por Email',
      emailEnabledDesc: 'Recibir resúmenes por correo',
      quietHours: 'Horario Silencioso',
      quietHoursDesc: 'No recibir notificaciones durante estas horas',
      quietFrom: 'Desde',
      quietTo: 'Hasta',
      categories: 'Categorías',
      categoriesDesc: 'Elige qué tipos de notificaciones deseas recibir',
      push: 'Push',
      email: 'Email',
      enabled: 'Activo',
      save: 'Guardar',
      saving: 'Guardando...',
      saved: 'Preferencias guardadas',
      error: 'Error al guardar',
      loading: 'Cargando...'
    },
    en: {
      title: 'Notification Preferences',
      subtitle: 'Configure how and when to receive notifications',
      globalSettings: 'Global Settings',
      pushEnabled: 'Push Notifications',
      pushEnabledDesc: 'Receive notifications on your device',
      emailEnabled: 'Email Notifications',
      emailEnabledDesc: 'Receive email summaries',
      quietHours: 'Quiet Hours',
      quietHoursDesc: 'Do not receive notifications during these hours',
      quietFrom: 'From',
      quietTo: 'To',
      categories: 'Categories',
      categoriesDesc: 'Choose which types of notifications you want to receive',
      push: 'Push',
      email: 'Email',
      enabled: 'Active',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Preferences saved',
      error: 'Error saving',
      loading: 'Loading...'
    },
    zh: {
      title: '通知偏好设置',
      subtitle: '配置如何以及何时接收通知',
      globalSettings: '全局设置',
      pushEnabled: '推送通知',
      pushEnabledDesc: '在您的设备上接收通知',
      emailEnabled: '电子邮件通知',
      emailEnabledDesc: '通过电子邮件接收摘要',
      quietHours: '安静时段',
      quietHoursDesc: '在此期间不接收通知',
      quietFrom: '从',
      quietTo: '到',
      categories: '分类',
      categoriesDesc: '选择您想要接收的通知类型',
      push: '推送',
      email: '邮件',
      enabled: '启用',
      save: '保存',
      saving: '保存中...',
      saved: '偏好已保存',
      error: '保存错误',
      loading: '加载中...'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [prefsRes, catsRes] = await Promise.all([
        fetch(`${API_URL}/api/notifications/preferences`, { headers }),
        fetch(`${API_URL}/api/notifications/categories`, { headers })
      ]);

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setPreferences(data.preferences);
      }

      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGlobalPreference = async (key, value) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: value })
      });

      if (res.ok) {
        setPreferences(prev => ({ ...prev, [key]: value }));
        toast.success(txt.saved);
      }
    } catch (error) {
      toast.error(txt.error);
    }
  };

  const updateCategoryPreference = async (categoryId, field, value) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/preferences/category/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (res.ok) {
        setPreferences(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            [categoryId]: {
              ...prev.categories?.[categoryId],
              [field]: value
            }
          }
        }));
        toast.success(txt.saved);
      }
    } catch (error) {
      toast.error(txt.error);
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
    <div className="space-y-6" data-testid="notification-preferences">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {txt.globalSettings}
          </CardTitle>
          <CardDescription>{txt.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">{txt.pushEnabled}</Label>
                <p className="text-sm text-muted-foreground">{txt.pushEnabledDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.push_enabled ?? true}
              onCheckedChange={(v) => updateGlobalPreference('push_enabled', v)}
              data-testid="push-toggle"
            />
          </div>

          <Separator />

          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">{txt.emailEnabled}</Label>
                <p className="text-sm text-muted-foreground">{txt.emailEnabledDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_enabled ?? true}
              onCheckedChange={(v) => updateGlobalPreference('email_enabled', v)}
              data-testid="email-toggle"
            />
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">{txt.quietHours}</Label>
                <p className="text-sm text-muted-foreground">{txt.quietHoursDesc}</p>
                {preferences?.quiet_hours?.enabled && (
                  <p className="text-xs text-primary mt-1">
                    {preferences.quiet_hours.start} - {preferences.quiet_hours.end}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={preferences?.quiet_hours?.enabled ?? false}
              onCheckedChange={(v) => updateGlobalPreference('quiet_hours', {
                ...preferences?.quiet_hours,
                enabled: v
              })}
              data-testid="quiet-hours-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{txt.categories}</CardTitle>
          <CardDescription>{txt.categoriesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => {
              const catPrefs = preferences?.categories?.[category.category_id] || {};
              const isEnabled = catPrefs.enabled ?? category.default_enabled;
              
              return (
                <div 
                  key={category.category_id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isEnabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                  data-testid={`category-${category.category_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-2xl p-2 rounded-lg"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </span>
                      <div>
                        <Label className="font-medium">
                          {category.name?.[lang] || category.name?.es || 'Categoria'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {category.description?.[lang] || category.description?.es || ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" style={{ borderColor: category.color, color: category.color }}>
                            {category.module}
                          </Badge>
                          <Badge variant={category.priority === 'high' ? 'destructive' : 'secondary'}>
                            {category.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 items-end">
                      {/* Main Toggle */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{txt.enabled}</Label>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(v) => updateCategoryPreference(category.category_id, 'enabled', v)}
                        />
                      </div>
                      
                      {/* Sub toggles */}
                      {isEnabled && (
                        <div className="flex gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            <Switch
                              checked={catPrefs.push ?? true}
                              onCheckedChange={(v) => updateCategoryPreference(category.category_id, 'push', v)}
                              className="scale-75"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <Switch
                              checked={catPrefs.email ?? false}
                              onCheckedChange={(v) => updateCategoryPreference(category.category_id, 'email', v)}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
