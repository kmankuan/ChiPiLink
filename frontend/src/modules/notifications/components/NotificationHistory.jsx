/**
 * NotificationHistory - Historial de notificaciones del usuario
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NotificationHistory({ token }) {
  const { i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Historial de Notificaciones',
      subtitle: 'Tus notificaciones recientes',
      noNotifications: 'No hay notificaciones',
      viewMore: 'Ver más',
      sent: 'Enviada',
      failed: 'Fallida'
    },
    en: {
      title: 'Notification History',
      subtitle: 'Your recent notifications',
      noNotifications: 'No notifications',
      viewMore: 'View more',
      sent: 'Sent',
      failed: 'Failed'
    },
    zh: {
      title: '通知历史',
      subtitle: '您最近的通知',
      noNotifications: '没有通知',
      viewMore: '查看更多',
      sent: '已发送',
      failed: '失败'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/history?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'es-PA';
    return date.toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
    <Card data-testid="notification-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {txt.title}
        </CardTitle>
        <CardDescription>{txt.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{txt.noNotifications}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {notifications.map((notif) => (
                <div 
                  key={notif.log_id}
                  className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notif.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notif.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notif.created_at)}
                        </span>
                        <Badge 
                          variant={notif.results?.success ? 'outline' : 'destructive'}
                          className="text-xs"
                        >
                          {notif.results?.success ? txt.sent : txt.failed}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
