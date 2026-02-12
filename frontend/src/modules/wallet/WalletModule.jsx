/**
 * WalletModule — Admin Wallet Management
 * Tabs: Overview, Transactions, Bank Info, Settings
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowLeftRight, Building2, Settings, FileText } from 'lucide-react';
import WalletOverviewTab from './tabs/WalletOverviewTab';
import WalletTransactionsTab from './tabs/WalletTransactionsTab';
import BankInfoTab from './tabs/BankInfoTab';
import WalletSettingsTab from './tabs/WalletSettingsTab';
import BankAlertTab from './tabs/BankAlertTab';

export default function WalletModule() {
  const token = localStorage.getItem('auth_token');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet Management</h1>
        <p className="text-sm text-muted-foreground">Manage user wallets, transactions, and bank info</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5 text-xs">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="bank-info" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Bank Info
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="bank-alerts" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Bank Alerts
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

        <TabsContent value="bank-alerts" className="mt-4">
          <BankAlertTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
