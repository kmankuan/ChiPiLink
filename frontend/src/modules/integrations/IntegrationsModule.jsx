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
  Plug
} from 'lucide-react';
import GoogleSheetsSync from '@/components/admin/GoogleSheetsSync';
import MondayModule from '@/modules/monday/MondayModule';
import { useTranslation } from 'react-i18next';

export default function IntegrationsModule() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Tabs defaultValue="monday">
        <TabsList>
          <TabsTrigger value="monday" className="gap-2">
            <Calendar className="h-4 w-4" />
            Monday.com
          </TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2">
            <Sheet className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monday">
          <MondayModule />
        </TabsContent>

        <TabsContent value="sheets">
          <GoogleSheetsSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
