/**
 * NotificationPreferences - User notification preferences
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Mail, Smartphone, Moon, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationPreferences({ token }) {
  const { t, i18n } = useTranslation();
  const [preferences, setPreferences] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n.language || 'es';

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
        toast.success(t('notifications.saved'));
      }
    } catch (error) {
      toast.error(t('notifications.error'));
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
        toast.success(t('notifications.saved'));
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
    <div className="space-y-6" data-testid="notification-preferences">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.globalSettings')}
          </CardTitle>
          <CardDescription>{t('notifications.preferencesSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {t('notifications.pushEnabled')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('notifications.pushEnabledDesc')}</p>
            </div>
            <Switch
              checked={preferences?.push_enabled}
              onCheckedChange={(checked) => updateGlobalPreference('push_enabled', checked)}
              data-testid="push-toggle"
            />
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('notifications.emailEnabled')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('notifications.emailEnabledDesc')}</p>
            </div>
            <Switch
              checked={preferences?.email_enabled}
              onCheckedChange={(checked) => updateGlobalPreference('email_enabled', checked)}
              data-testid="email-toggle"
            />
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                {t('notifications.quietHours')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('notifications.quietHoursDesc')}</p>
            </div>
            <Switch
              checked={preferences?.quiet_hours_enabled}
              onCheckedChange={(checked) => updateGlobalPreference('quiet_hours_enabled', checked)}
              data-testid="quiet-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('notifications.categories')}</CardTitle>
            <CardDescription>{t('notifications.categoriesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryPrefs = preferences?.categories?.[category.category_id] || {};
                
                return (
                  <div 
                    key={category.category_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon || '🔔'}</span>
                      <div>
                        <p className="font-medium">{getLocalizedText(category.name)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getLocalizedText(category.description)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('notifications.push')}</Label>
                        <Switch
                          checked={categoryPrefs.push_enabled !== false}
                          onCheckedChange={(checked) => 
                            updateCategoryPreference(category.category_id, 'push_enabled', checked)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('notifications.email')}</Label>
                        <Switch
                          checked={categoryPrefs.email_enabled !== false}
                          onCheckedChange={(checked) => 
                            updateCategoryPreference(category.category_id, 'email_enabled', checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
