/**
 * Account Dashboard Page - Main page for user's personal portal
 * Includes: Wallet, Profile, Membership, Connections, Dependents, Capacities, Notifications, Exclusive
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Wallet, CreditCard, Bell, Users, UserPlus, Zap, ChevronRight, Send, GraduationCap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Account components - new structure
import ChipiWallet from '../wallet/WalletPage';
import UserProfile from '../profile/ProfilePage';
import MembershipCard from '../profile/MembershipCard';
import MisConexiones from '../connections/ConnectionsPage';
import MisAcudidos from '../connections/MisAcudidos';
import MisCapacidades from '../profile/MisCapacidades';
import ServiciosSugeridos from '../ServiciosSugeridos';
import TransferenciasDialog from '../wallet/TransferenciasDialog';
import AlertasSaldo from '../wallet/AlertasSaldo';
import LinkingPage from '../linking/LinkingPage';

// Notification components
import NotificationPreferences from '@/modules/notifications/components/NotificationPreferences';
import NotificationHistory from '@/modules/notifications/components/NotificationHistory';
import PushNotificationSubscribe from '@/components/notifications/PushNotificationSubscribe';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AccountDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, loading } = useAuth();
  
  // Get initial tab from URL query parameter
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const validTabs = ['wallet', 'profile', 'membership', 'connections', 'dependents', 'capacities', 'notifications', 'exclusive'];
    return validTabs.includes(tabParam) ? tabParam : 'wallet';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [walletBalance, setWalletBalance] = useState(null);
  
  // State for transfers dialog
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

  // Handler to open transfer from MyDependents
  const handleTransferFromDependent = (dependent) => {
    setTransferPreselectedUser(dependent);
    setShowTransferDialog(true);
  };

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
          <h2 className="text-2xl font-bold">{t('account.loginRequired')}</h2>
          <a 
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {t('account.login')}
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
            <h1 className="text-3xl font-bold">{t('account.title')}</h1>
            <p className="text-muted-foreground">{t('account.subtitle')}</p>
          </div>
          
          {/* Quick transfer button */}
          <Button 
            onClick={() => {
              setTransferPreselectedUser(null);
              setShowTransferDialog(true);
            }}
            className="gap-2"
            data-testid="quick-transfer-btn"
          >
            <Send className="h-4 w-4" />
            {t('account.transfer')}
          </Button>
        </div>

        {/* Balance alerts (bilateral) */}
        <div className="mb-6">
          <AlertasSaldo 
            token={token} 
            onTransfer={handleTransferFromDependent}
          />
        </div>

        {/* Suggested services (marketing) */}
        <div className="mb-6">
          <ServiciosSugeridos token={token} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8 h-auto gap-1 p-1">
            <TabsTrigger value="wallet" data-testid="wallet-tab" className="gap-1 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.wallet')}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab" className="gap-1 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="membership" data-testid="membership-tab" className="gap-1 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.membership')}</span>
            </TabsTrigger>
            <TabsTrigger value="conexiones" data-testid="conexiones-tab" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.connections')}</span>
            </TabsTrigger>
            <TabsTrigger value="acudidos" data-testid="acudidos-tab" className="gap-1 text-xs sm:text-sm">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.dependents')}</span>
            </TabsTrigger>
            <TabsTrigger value="capacidades" data-testid="capacidades-tab" className="gap-1 text-xs sm:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.capacities')}</span>
            </TabsTrigger>
            <TabsTrigger value="exclusive" data-testid="exclusive-tab" className="gap-1 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.exclusive', 'Students')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab" className="gap-1 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('account.notifications')}</span>
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

          <TabsContent value="conexiones">
            <MisConexiones token={token} />
          </TabsContent>

          <TabsContent value="acudidos">
            <MisAcudidos 
              token={token} 
              onTransfer={handleTransferFromDependent}
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

      {/* Transfers dialog */}
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
