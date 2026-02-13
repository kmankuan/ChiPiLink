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
  ArrowRightLeft,
  LayoutGrid,
  Paintbrush,
  Layout,
  Radio
} from 'lucide-react';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import SiteConfigModule from './SiteConfigModule';
import FormConfigModule from './FormConfigModule';
import FormsManagerModule from './FormsManagerModule';
import DictionaryManagerModule from './DictionaryManagerModule';
import TranslationsModule from './TranslationsModule';
import TranslationCoverageCard from './TranslationCoverageCard';
import DemoDataModule from './DemoDataModule';
import AuthMethodsConfig from './AuthMethodsConfig';
import DatabaseMigrationModule from './DatabaseMigrationModule';
import ModuleStatusModule from './ModuleStatusModule';
import UIStyleModule from './UIStyleModule';
import WidgetManagerModule from './WidgetManagerModule';
import { useTranslation } from 'react-i18next';

export default function AdminModule() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Tabs defaultValue="site">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="site" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Site Config</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Authentication</span>
            <span className="sm:hidden">Auth</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Landing Page</span>
            <span className="sm:hidden">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Forms</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="translations" className="gap-2">
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">Translations</span>
            <span className="sm:hidden">i18n</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2" data-testid="demo-data-tab">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Demo Data</span>
            <span className="sm:hidden">Demo</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2" data-testid="migration-tab">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Migration</span>
            <span className="sm:hidden">Migrate</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2" data-testid="modules-tab">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Module Status</span>
            <span className="sm:hidden">Modules</span>
          </TabsTrigger>
          <TabsTrigger value="ui-style" className="gap-2" data-testid="ui-style-tab">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">UI Style</span>
            <span className="sm:hidden">Style</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2" data-testid="widget-tab">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Widget</span>
            <span className="sm:hidden">Widget</span>
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
          <FormsManagerModule />
        </TabsContent>

        <TabsContent value="translations">
          <div className="space-y-8">
            <TranslationCoverageCard />
            <DictionaryManagerModule />
            <div className="border-t pt-6">
              <TranslationsModule />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="demo">
          <DemoDataModule />
        </TabsContent>

        <TabsContent value="migration">
          <DatabaseMigrationModule />
        </TabsContent>

        <TabsContent value="modules">
          <ModuleStatusModule />
        </TabsContent>

        <TabsContent value="ui-style">
          <UIStyleModule />
        </TabsContent>

        <TabsContent value="widget">
          <WidgetManagerModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
