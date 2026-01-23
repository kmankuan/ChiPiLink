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
  Languages,
  Database,
  Shield,
  RefreshCw
} from 'lucide-react';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import SiteConfigModule from './SiteConfigModule';
import FormConfigModule from './FormConfigModule';
import TranslationsModule from './TranslationsModule';
import DemoDataModule from './DemoDataModule';
import AuthMethodsConfig from './AuthMethodsConfig';
import DatabaseMigrationModule from './DatabaseMigrationModule';

export default function AdminModule() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="site">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="site" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuración del Sitio</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Autenticación</span>
            <span className="sm:hidden">Auth</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Landing Page</span>
            <span className="sm:hidden">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Formularios</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="translations" className="gap-2">
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">Traducciones</span>
            <span className="sm:hidden">i18n</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2" data-testid="demo-data-tab">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Datos Demo</span>
            <span className="sm:hidden">Demo</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2" data-testid="migration-tab">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Migración BD</span>
            <span className="sm:hidden">Migrar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <SiteConfigModule />
        </TabsContent>

        <TabsContent value="auth">
          <AuthMethodsConfig />
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

        <TabsContent value="demo">
          <DemoDataModule />
        </TabsContent>

        <TabsContent value="migration">
          <DatabaseMigrationModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
