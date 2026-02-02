/**
 * NotificationCategories - Public view of notification categories
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationCategories({ token }) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n.language || 'es';

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const fetchCategories = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/notifications/categories`, { headers });

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
    <Card data-testid="notification-categories">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('notifications.categories')}
        </CardTitle>
        <CardDescription>{t('notifications.categoriesDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            {t('notifications.categoryManager.noCategories')}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <div
                key={category.category_id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
              >
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <p className="font-medium">{getLocalizedText(category.name)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getLocalizedText(category.description)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
