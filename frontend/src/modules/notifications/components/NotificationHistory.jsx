/**
 * NotificationHistory - User notification history
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
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = i18n.language || 'es';

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

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
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
    <Card data-testid="notification-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('notifications.history')}
        </CardTitle>
        <CardDescription>{t('notifications.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('notifications.noNotifications')}
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div 
                  key={notif.notification_id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <span className="text-2xl">{notif.icon || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {getLocalizedText(notif.title)}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getLocalizedText(notif.body)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notif.sent_at || notif.created_at)}
                      </span>
                      {notif.status && (
                        <Badge 
                          variant={notif.status === 'sent' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {notif.status === 'sent' ? t('notifications.sent') : t('notifications.failed')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {notif.action_url && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(notif.action_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={fetchHistory}
          >
            {t('notifications.loadMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
