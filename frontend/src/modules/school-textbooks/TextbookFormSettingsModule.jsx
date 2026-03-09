/**
 * TextbookFormSettingsModule — Form configuration for textbook workflows
 * Contains: Textbook Order Form config, Student Link Form config
 * Extracted from UnatiendaModule into the School Textbooks sidebar group.
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ClipboardList } from 'lucide-react';
import OrderFormConfigTab from '@/modules/unatienda/tabs/OrderFormConfigTab';
import FormFieldsConfigTab from '@/modules/admin/users/components/FormFieldsConfigTab';

export default function TextbookFormSettingsModule() {
  const token = localStorage.getItem('auth_token');
  const [activeTab, setActiveTab] = useState('order-form');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="order-form" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Textbook Order Form
          </TabsTrigger>
          <TabsTrigger value="student-link-form" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            Student Link Form
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order-form" className="mt-4">
          <OrderFormConfigTab />
        </TabsContent>
        <TabsContent value="student-link-form" className="mt-4">
          <FormFieldsConfigTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
