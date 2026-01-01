import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Settings,
  Palette,
  FileText,
  Users,
  Languages
} from 'lucide-react';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import SiteConfigModule from './SiteConfigModule';
import FormConfigModule from './FormConfigModule';
import TranslationsModule from './TranslationsModule';

export default function AdminModule() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuración del Sitio
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Palette className="h-4 w-4" />
            Landing Page
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            Formularios
          </TabsTrigger>
          <TabsTrigger value="translations" className="gap-2">
            <Languages className="h-4 w-4" />
            Traducciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <SiteConfigModule />
        </TabsContent>

        <TabsContent value="landing">
          <LandingPageEditor />
        </TabsContent>

        <TabsContent value="forms">
          <FormConfigModule />
        </TabsContent>

        <TabsContent value="translations">
          <TranslationsModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
