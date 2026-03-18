/**
 * MondayTextbookSyncModule — Monday.com sync tabs specific to textbook operations
 * Extracted from MondayModule. Contains: Textbook Sync, Inventory Sync, Status Mapping, Sync Dashboard
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Warehouse, ArrowLeftRight, Activity } from 'lucide-react';
import BookOrdersMondayTab from '@/modules/monday/components/BookOrdersMondayTab';
import TxbInventoryTab from '@/modules/monday/components/TxbInventoryTab';
import StatusMappingTab from '@/modules/monday/components/StatusMappingTab';
import WalletSyncDashboard from '@/modules/monday/components/WalletSyncDashboard';

export default function MondayTextbookSyncModule() {
  const [activeTab, setActiveTab] = useState('textbook-sync');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-1 h-auto p-1 w-full justify-start flex-wrap">
          <TabsTrigger value="textbook-sync" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Textbook Sync
          </TabsTrigger>
          <TabsTrigger value="inventory-sync" className="gap-1.5 text-xs">
            <Warehouse className="h-3.5 w-3.5" />
            Inventory Sync
          </TabsTrigger>
          <TabsTrigger value="status-mapping" className="gap-1.5 text-xs">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Status Mapping
          </TabsTrigger>
          <TabsTrigger value="sync-dashboard" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Sync Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="textbook-sync" className="mt-4">
          <BookOrdersMondayTab />
        </TabsContent>
        <TabsContent value="inventory-sync" className="mt-4">
          <TxbInventoryTab />
        </TabsContent>
        <TabsContent value="status-mapping" className="mt-4">
          <StatusMappingTab />
        </TabsContent>
        <TabsContent value="sync-dashboard" className="mt-4">
          <WalletSyncDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
