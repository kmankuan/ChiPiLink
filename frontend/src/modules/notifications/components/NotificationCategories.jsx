/**
 * NotificationCategories - Vista pública de categorías de notificación
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationCategories({ token }) {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Categorías de Notificación',
      subtitle: 'Tipos de notificaciones disponibles',
      noCategories: 'No hay categorías'
    },
    en: {
      title: 'Notification Categories',
      subtitle: 'Available notification types',
      noCategories: 'No categories'
    },
    zh: {
      title: '通知分类',
      subtitle: '可用的通知类型',
      noCategories: '没有分类'
    }
  };

  const txt = texts[lang] || texts.es;

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
          {txt.title}
        </CardTitle>
        <CardDescription>{txt.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">{txt.noCategories}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <div 
                key={cat.category_id}
                className="p-3 rounded-lg border text-center hover:shadow-md transition-shadow"
                style={{ borderColor: `${cat.color}40` }}
              >
                <span 
                  className="text-2xl block mb-2 p-2 rounded-lg mx-auto w-fit"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  {cat.icon}
                </span>
                <p className="font-medium text-sm">
                  {cat.name?.[lang] || cat.name?.es}
                </p>
                <Badge 
                  variant="outline" 
                  className="mt-2 text-xs"
                  style={{ borderColor: cat.color, color: cat.color }}
                >
                  {cat.module}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
