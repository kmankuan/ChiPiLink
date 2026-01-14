/**
 * Users Dashboard Page - Página principal del módulo de usuarios
 * Incluye: Wallet, Perfil, Membresía, Conexiones, Acudidos, Capacidades, Notificaciones
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Wallet, CreditCard, Bell, Users, UserPlus, Zap, ChevronRight, Send, ShoppingBag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Componentes de usuario
import ChipiWallet from '../components/ChipiWallet';
import UserProfile from '../components/UserProfile';
import MembershipCard from '../components/MembershipCard';
import MisConexiones from '../components/MisConexiones';
import MisAcudidos from '../components/MisAcudidos';
import MisCapacidades from '../components/MisCapacidades';
import ServiciosSugeridos from '../components/ServiciosSugeridos';
import TransferenciasDialog from '../components/TransferenciasDialog';
import AlertasSaldo from '../components/AlertasSaldo';
import CompraExclusiva from '../components/CompraExclusiva';

// Componentes de notificaciones
import NotificationPreferences from '@/modules/notifications/components/NotificationPreferences';
import NotificationHistory from '@/modules/notifications/components/NotificationHistory';
import PushNotificationSubscribe from '@/components/notifications/PushNotificationSubscribe';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState(null);
  
  // Estado para dialog de transferencias
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferPreselectedUser, setTransferPreselectedUser] = useState(null);

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

  // Handler para abrir transferencia desde MisAcudidos
  const handleTransferFromAcudido = (acudido) => {
    setTransferPreselectedUser(acudido);
    setShowTransferDialog(true);
  };

  const texts = {
    es: {
      title: 'Mi Cuenta',
      subtitle: 'Gestiona tu perfil, billetera, conexiones y más',
      wallet: 'Wallet',
      profile: 'Perfil',
      membership: 'Membresía',
      connections: 'Conexiones',
      dependents: 'Acudidos',
      capacities: 'Capacidades',
      notifications: 'Notificaciones',
      exclusive: 'Compra Exclusiva',
      loginRequired: 'Debes iniciar sesión para acceder a esta sección',
      login: 'Iniciar Sesión',
      transfer: 'Transferir'
    },
    en: {
      title: 'My Account',
      subtitle: 'Manage your profile, wallet, connections and more',
      wallet: 'Wallet',
      profile: 'Profile',
      membership: 'Membership',
      connections: 'Connections',
      dependents: 'Dependents',
      capacities: 'Capacities',
      notifications: 'Notifications',
      exclusive: 'Exclusive Shopping',
      loginRequired: 'You must log in to access this section',
      login: 'Log In',
      transfer: 'Transfer'
    },
    zh: {
      title: '我的账户',
      subtitle: '管理您的个人资料、钱包、连接等',
      wallet: '钱包',
      profile: '个人资料',
      membership: '会员资格',
      connections: '连接',
      dependents: '受抚养人',
      capacities: '能力',
      notifications: '通知',
      exclusive: '专属购物',
      loginRequired: '您必须登录才能访问此部分',
      login: '登录',
      transfer: '转账'
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{txt.title}</h1>
            <p className="text-muted-foreground">{txt.subtitle}</p>
          </div>
          
          {/* Botón de transferencia rápida */}
          <Button 
            onClick={() => {
              setTransferPreselectedUser(null);
              setShowTransferDialog(true);
            }}
            className="gap-2"
            data-testid="quick-transfer-btn"
          >
            <Send className="h-4 w-4" />
            {txt.transfer}
          </Button>
        </div>

        {/* Alertas de saldo (bilateral) */}
        <div className="mb-6">
          <AlertasSaldo 
            token={token} 
            onTransfer={handleTransferFromAcudido}
          />
        </div>

        {/* Servicios sugeridos (marketing) */}
        <div className="mb-6">
          <ServiciosSugeridos token={token} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8 h-auto gap-1 p-1">
            <TabsTrigger value="wallet" data-testid="wallet-tab" className="gap-1 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.wallet}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab" className="gap-1 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="exclusive" data-testid="exclusive-tab" className="gap-1 text-xs sm:text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.exclusive}</span>
            </TabsTrigger>
            <TabsTrigger value="membership" data-testid="membership-tab" className="gap-1 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.membership}</span>
            </TabsTrigger>
            <TabsTrigger value="conexiones" data-testid="conexiones-tab" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.connections}</span>
            </TabsTrigger>
            <TabsTrigger value="acudidos" data-testid="acudidos-tab" className="gap-1 text-xs sm:text-sm">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.dependents}</span>
            </TabsTrigger>
            <TabsTrigger value="capacidades" data-testid="capacidades-tab" className="gap-1 text-xs sm:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.capacities}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab" className="gap-1 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{txt.notifications}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <ChipiWallet token={token} />
          </TabsContent>

          <TabsContent value="profile">
            <UserProfile token={token} user={user} />
          </TabsContent>

          <TabsContent value="exclusive">
            <CompraExclusiva />
          </TabsContent>

          <TabsContent value="membership">
            <MembershipCard token={token} walletBalance={walletBalance} />
          </TabsContent>

          <TabsContent value="conexiones">
            <MisConexiones token={token} />
          </TabsContent>

          <TabsContent value="acudidos">
            <MisAcudidos 
              token={token} 
              onTransfer={handleTransferFromAcudido}
            />
          </TabsContent>

          <TabsContent value="capacidades">
            <MisCapacidades token={token} />
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

      {/* Dialog de transferencias */}
      <TransferenciasDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        token={token}
        walletBalance={walletBalance}
        preselectedUser={transferPreselectedUser}
      />
    </div>
  );
}
