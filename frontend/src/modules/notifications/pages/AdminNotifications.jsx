/**
 * AdminNotifications - Notification administration panel
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Settings, Tags, Send, History, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import ProviderConfig from '../components/ProviderConfig';
import CategoryManager from '../components/CategoryManager';
import SendNotification from '../components/SendNotification';

export default function AdminNotifications() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('providers');
  
  const token = localStorage.getItem('auth_token');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">{t('admin.accessDenied')}</h2>
            <p className="text-muted-foreground">{t('admin.adminOnly')}</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background" data-testid="admin-notifications">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8" />
              {t('notifications.title')}
            </h1>
            <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="providers" className="gap-2">
                <Settings className="h-4 w-4" />
                {t('notifications.providers')}
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Tags className="h-4 w-4" />
                {t('notifications.categories')}
              </TabsTrigger>
              <TabsTrigger value="send" className="gap-2">
                <Send className="h-4 w-4" />
                {t('notifications.sendNotification.title')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="providers">
              <ProviderConfig token={token} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManager token={token} />
            </TabsContent>

            <TabsContent value="send">
              <SendNotification token={token} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
