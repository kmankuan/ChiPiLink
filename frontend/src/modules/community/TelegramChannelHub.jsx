/**
 * TelegramChannelHub — Merged Telegram admin: config + feed + content.
 * Replaces separate "Community" and "Telegram" admin sections.
 */
import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Settings, Rss, Loader2 } from 'lucide-react';

const TelegramAdminModule = lazy(() => import('@/modules/admin/TelegramAdminModule'));
const CommunityFeedModule = lazy(() => import('@/modules/community/CommunityFeedModule'));

const Fallback = () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

export default function TelegramChannelHub() {
  const [tab, setTab] = useState('settings');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Send className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Telegram Channel</h2>
          <p className="text-xs text-muted-foreground">Channel config, feed settings, and content management</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="settings" className="gap-1 text-xs"><Settings className="h-3 w-3" />Settings</TabsTrigger>
          <TabsTrigger value="feed" className="gap-1 text-xs"><Rss className="h-3 w-3" />Feed & Content</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Suspense fallback={<Fallback />}>
            <TelegramAdminModule />
          </Suspense>
        </TabsContent>

        <TabsContent value="feed">
          <Suspense fallback={<Fallback />}>
            <CommunityFeedModule />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
