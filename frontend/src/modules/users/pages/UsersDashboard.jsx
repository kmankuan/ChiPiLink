/**
 * Users Dashboard Page - Página principal del módulo de usuarios
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Wallet, CreditCard, Bell, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import ChipiWallet from '../components/ChipiWallet';
import UserProfile from '../components/UserProfile';
import MembershipCard from '../components/MembershipCard';
import NotificationPreferences from '@/modules/notifications/components/NotificationPreferences';
import NotificationHistory from '@/modules/notifications/components/NotificationHistory';
import PushNotificationSubscribe from '@/components/notifications/PushNotificationSubscribe';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState(null);

  const lang = i18n.language || 'es';

  // Get token from localStorage 
  const token = localStorage.getItem('auth_token');

  // Fetch wallet balance when component mounts
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/wallet/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data.wallet);
        }
      } catch (error) {
        console.error('Error fetching wallet:', error);
      }
    };
    fetchWalletBalance();
  }, [token]);

  const texts = {
    es: {
      title: 'Mi Cuenta',
      subtitle: 'Gestiona tu perfil, billetera y membresía',
      wallet: 'ChipiWallet',
      profile: 'Perfil',
      membership: 'Membresía',
      notifications: 'Notificaciones',
      loginRequired: 'Debes iniciar sesión para acceder a esta sección',
      login: 'Iniciar Sesión'
    },
    en: {
      title: 'My Account',
      subtitle: 'Manage your profile, wallet and membership',
      wallet: 'ChipiWallet',
      profile: 'Profile',
      membership: 'Membership',
      notifications: 'Notifications',
      loginRequired: 'You must log in to access this section',
      login: 'Log In'
    },
    zh: {
      title: '我的账户',
      subtitle: '管理您的个人资料、钱包和会员资格',
      wallet: 'ChipiWallet',
      profile: '个人资料',
      membership: '会员资格',
      notifications: '通知',
      loginRequired: '您必须登录才能访问此部分',
      login: '登录'
    }
  };

  const txt = texts[lang] || texts.es;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">{txt.loginRequired}</h2>
          <a 
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {txt.login}
            <ChevronRight className="h-4 w-4 ml-2" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="users-dashboard">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{txt.title}</h1>
          <p className="text-muted-foreground">{txt.subtitle}</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="wallet" data-testid="wallet-tab">
              <Wallet className="h-4 w-4 mr-2" />
              {txt.wallet}
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">
              <User className="h-4 w-4 mr-2" />
              {txt.profile}
            </TabsTrigger>
            <TabsTrigger value="membership" data-testid="membership-tab">
              <CreditCard className="h-4 w-4 mr-2" />
              {txt.membership}
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab">
              <Bell className="h-4 w-4 mr-2" />
              {txt.notifications}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <ChipiWallet token={token} />
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile token={token} user={user} />
          </TabsContent>

          <TabsContent value="membership">
            <MembershipCard token={token} walletBalance={walletBalance} />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-6">
              <PushNotificationSubscribe />
              <NotificationPreferences token={token} />
              <NotificationHistory token={token} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
