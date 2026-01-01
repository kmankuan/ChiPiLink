import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Sheet,
  Calendar,
  CreditCard,
  Store
} from 'lucide-react';
import GoogleSheetsSync from '@/components/admin/GoogleSheetsSync';
import MondayModule from '@/modules/monday/MondayModule';
import PlatformStoreModule from '@/modules/platform-store/PlatformStoreModule';

export default function IntegrationsModule() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="yappy">
        <TabsList>
          <TabsTrigger value="yappy" className="gap-2">
            <Store className="h-4 w-4" />
            Unatienda / Yappy
          </TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2">
            <Sheet className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="monday" className="gap-2">
            <Calendar className="h-4 w-4" />
            Monday.com
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yappy">
          <PlatformStoreModule />
        </TabsContent>

        <TabsContent value="sheets">
          <GoogleSheetsSync />
        </TabsContent>

        <TabsContent value="monday">
          <MondayModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
