/**
 * WalletModule — Admin Wallet Management
 * Tabs: Overview, Transactions, Bank Info, Settings
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowLeftRight, Building2, Settings } from 'lucide-react';
import WalletOverviewTab from './tabs/WalletOverviewTab';
import WalletTransactionsTab from './tabs/WalletTransactionsTab';
import BankInfoTab from './tabs/BankInfoTab';
import WalletSettingsTab from './tabs/WalletSettingsTab';

export default function WalletModule() {
  const token = localStorage.getItem('auth_token');
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('wallet.walletManagement')}</h1>
        <p className="text-sm text-muted-foreground">{t('wallet.manageWallets')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            {t('wallet.overview')}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5 text-xs">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('wallet.transactions')}
          </TabsTrigger>
          <TabsTrigger value="bank-info" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            {t('wallet.bankInfo')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            {t('wallet.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <WalletOverviewTab token={token} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <WalletTransactionsTab token={token} />
        </TabsContent>

        <TabsContent value="bank-info" className="mt-4">
          <BankInfoTab token={token} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <WalletSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
