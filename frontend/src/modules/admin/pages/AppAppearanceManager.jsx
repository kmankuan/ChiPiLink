import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Settings, Search } from 'lucide-react';

const SiteConfigModule = lazy(() => import('@/modules/admin/SiteConfigModule'));
const UIStyleModule = lazy(() => import('@/modules/admin/UIStyleModule'));

export default function AppAppearanceManager() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">App Appearance</h2>
        <p className="text-muted-foreground">Manage your brand identity, colors, and layout styles.</p>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="identity" className="gap-2"><Settings className="h-4 w-4" /> Brand Identity & SEO</TabsTrigger>
          <TabsTrigger value="theming" className="gap-2"><Palette className="h-4 w-4" /> UI Theming & Layouts</TabsTrigger>
        </TabsList>
        
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <Suspense fallback={<div className="h-[400px] flex items-center justify-center animate-pulse bg-muted/20 rounded-lg" />}>
            <TabsContent value="identity" className="mt-0">
              <SiteConfigModule />
            </TabsContent>
            
            <TabsContent value="theming" className="mt-0">
              <UIStyleModule />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
