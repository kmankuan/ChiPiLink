/**
 * AdminNotifications - Panel de administración de notificaciones
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
  const { i18n } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('providers');
  
  const token = localStorage.getItem('auth_token');
  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Administración de Notificaciones',
      subtitle: 'Configura proveedores, categorías y envía notificaciones',
      providers: 'Proveedores',
      categories: 'Categorías',
      send: 'Enviar',
      logs: 'Historial',
      back: 'Volver',
      accessDenied: 'Acceso denegado',
      adminOnly: 'Esta sección es solo para administradores'
    },
    en: {
      title: 'Notification Administration',
      subtitle: 'Configure providers, categories and send notifications',
      providers: 'Providers',
      categories: 'Categories',
      send: 'Send',
      logs: 'History',
      back: 'Back',
      accessDenied: 'Access denied',
      adminOnly: 'This section is for administrators only'
    },
    zh: {
      title: '通知管理',
      subtitle: '配置提供商、分类和发送通知',
      providers: '提供商',
      categories: '分类',
      send: '发送',
      logs: '历史',
      back: '返回',
      accessDenied: '访问被拒绝',
      adminOnly: '此部分仅供管理员使用'
    }
  };

  const txt = texts[lang] || texts.es;

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
            <h2 className="text-2xl font-bold">{txt.accessDenied}</h2>
            <p className="text-muted-foreground">{txt.adminOnly}</p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {txt.back}
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
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {txt.back}
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8" />
              {txt.title}
            </h1>
            <p className="text-muted-foreground">{txt.subtitle}</p>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="providers" data-testid="providers-tab">
                <Settings className="h-4 w-4 mr-2" />
                {txt.providers}
              </TabsTrigger>
              <TabsTrigger value="categories" data-testid="categories-tab">
                <Tags className="h-4 w-4 mr-2" />
                {txt.categories}
              </TabsTrigger>
              <TabsTrigger value="send" data-testid="send-tab">
                <Send className="h-4 w-4 mr-2" />
                {txt.send}
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
