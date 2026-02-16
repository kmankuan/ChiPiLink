/**
 * ShowcaseAdminModule — Admin panel for managing:
 * 1. Banner Carousel (image + text banners with scheduling)
 * 2. Media Player (photos/videos from Google Photos or manual URLs)
 * 3. Monday.com Banner Sync (Canva → Monday.com → App)
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Image, Film, Plus, Trash2, Save, Loader2, Eye, EyeOff,
  ChevronUp, ChevronDown, Type, Link2, Palette, GripVertical,
  Play, Globe, Upload, RefreshCw, CalendarDays, Plug,
  History, CheckCircle, XCircle, Clock, Zap, ZapOff
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const getToken = () => localStorage.getItem('auth_token');

// Color presets for text banners (Facebook-style)
const COLOR_PRESETS = [
  { bg: '#C8102E', grad: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' },
  { bg: '#16a34a', grad: 'linear-gradient(135deg, #16a34a 0%, #0d6e3a 100%)' },
  { bg: '#d97706', grad: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
  { bg: '#7c3aed', grad: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' },
  { bg: '#0284c7', grad: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' },
  { bg: '#dc2626', grad: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' },
  { bg: '#1e293b', grad: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { bg: '#ec4899', grad: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' },
];

function BannerEditor({ banner, onSave, onDelete }) {
  const [data, setData] = useState(banner);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const method = banner.banner_id ? 'PUT' : 'POST';
      const url = banner.banner_id
        ? `${API_URL}/api/admin/showcase/banners/${banner.banner_id}`
        : `${API_URL}/api/admin/showcase/banners`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const saved = await res.json();
        onSave(saved);
        toast.success('Banner saved');
      }
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card" data-testid={`banner-editor-${banner.banner_id || 'new'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={data.type === 'image' ? 'default' : 'secondary'} className="text-[9px]">
            {data.type === 'image' ? 'Image' : 'Text'}
          </Badge>
          <Badge variant={data.active ? 'default' : 'outline'} className="text-[9px]">
            {data.active ? 'Active' : 'Hidden'}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setData({ ...data, active: !data.active })} className="h-7 w-7 p-0">
            {data.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={data.type === 'image' ? 'default' : 'outline'}
          onClick={() => setData({ ...data, type: 'image' })}
          className="h-7 text-xs gap-1 flex-1"
        >
          <Image className="h-3 w-3" /> Image Banner
        </Button>
        <Button
          size="sm"
          variant={data.type === 'text' ? 'default' : 'outline'}
          onClick={() => setData({ ...data, type: 'text' })}
          className="h-7 text-xs gap-1 flex-1"
        >
          <Type className="h-3 w-3" /> Text Banner
        </Button>
      </div>

      {data.type === 'image' ? (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Image URL</Label>
            <Input value={data.image_url || ''} onChange={e => setData({ ...data, image_url: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[10px]">Overlay Text (optional)</Label>
            <Input value={data.overlay_text || ''} onChange={e => setData({ ...data, overlay_text: e.target.value })} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Click Link (optional)</Label>
            <Input value={data.link_url || ''} onChange={e => setData({ ...data, link_url: e.target.value })} className="h-8 text-xs" placeholder="/pinpanclub or https://..." />
          </div>
          {data.image_url && (
            <img src={data.image_url} alt="Preview" className="w-full h-20 object-cover rounded-lg" />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Message Text</Label>
            <textarea
              value={data.text || ''}
              onChange={e => setData({ ...data, text: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs min-h-[60px] resize-none"
              placeholder="Type your announcement..."
            />
          </div>
          <div>
            <Label className="text-[10px]">Background Color / Gradient</Label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {COLOR_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setData({ ...data, bg_color: preset.bg, bg_gradient: preset.grad })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${data.bg_color === preset.bg ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: preset.grad }}
                />
              ))}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="color"
                  value={data.bg_color || '#16a34a'}
                  onChange={e => setData({ ...data, bg_color: e.target.value, bg_gradient: '' })}
                  className="w-8 h-8 rounded border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Background Image URL (optional)</Label>
            <Input value={data.bg_image_url || ''} onChange={e => setData({ ...data, bg_image_url: e.target.value })} className="h-8 text-xs" placeholder="https://..." />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[10px]">Font Size</Label>
              <select
                value={data.font_size || 'lg'}
                onChange={e => setData({ ...data, font_size: e.target.value })}
                className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px]">Text Color</Label>
              <input type="color" value={data.text_color || '#ffffff'} onChange={e => setData({ ...data, text_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Click Link (optional)</Label>
            <Input value={data.link_url || ''} onChange={e => setData({ ...data, link_url: e.target.value })} className="h-8 text-xs" placeholder="/eventos or https://..." />
          </div>
          {/* Live preview */}
          <div
            className="rounded-xl px-4 py-4 text-center min-h-[50px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: data.bg_gradient || data.bg_color || '#16a34a',
              ...(data.bg_image_url ? { backgroundImage: `url(${data.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
          >
            {data.bg_image_url && <div className="absolute inset-0 bg-black/30" />}
            <p className={`relative font-bold text-${data.font_size || 'lg'} leading-snug`} style={{ color: data.text_color || '#fff' }}>
              {data.text || 'Preview'}
            </p>
          </div>
        </div>
      )}

      {/* Schedule fields */}
      <div className="flex gap-2 items-end border-t pt-2 mt-1">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mb-1" />
        <div className="flex-1">
          <Label className="text-[10px]">Start Date</Label>
          <Input type="date" value={data.start_date || ''} onChange={e => setData({ ...data, start_date: e.target.value })} className="h-7 text-xs" />
        </div>
        <div className="flex-1">
          <Label className="text-[10px]">End Date</Label>
          <Input type="date" value={data.end_date || ''} onChange={e => setData({ ...data, end_date: e.target.value })} className="h-7 text-xs" />
        </div>
      </div>
      {data.source === 'monday' && (
        <Badge variant="outline" className="text-[9px] gap-1"><Plug className="h-2.5 w-2.5" /> Synced from Monday.com</Badge>
      )}

      <Button onClick={save} disabled={saving} size="sm" className="w-full h-8 text-xs gap-1" data-testid="save-banner-btn">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Save Banner
      </Button>
    </div>
  );
}


export default function ShowcaseAdminModule() {
  const [banners, setBanners] = useState([]);
  const [mediaConfig, setMediaConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [albumUrl, setAlbumUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemType, setNewItemType] = useState('image');
  const [newItemCaption, setNewItemCaption] = useState('');
  // Monday.com sync state
  const [mondayConfig, setMondayConfig] = useState(null);
  const [mondayBoards, setMondayBoards] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [savingMonday, setSavingMonday] = useState(false);
  // Auto-sync state
  const [autoSync, setAutoSync] = useState({ enabled: false, interval_minutes: 10, scheduler: { running: false, next_run: null }, last_sync: null });
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  // Sync history
  const [syncHistory, setSyncHistory] = useState([]);
  // Webhook state
  const [webhookStatus, setWebhookStatus] = useState({ registered: false, webhook_id: null });
  const [togglingWebhook, setTogglingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bannersRes, mediaRes, mondayRes, autoSyncRes, historyRes, webhookRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/showcase/banners`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/admin/showcase/media-player`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/admin/showcase/monday-banners/config`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/admin/showcase/monday-banners/auto-sync`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/admin/showcase/monday-banners/sync-history`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API_URL}/api/admin/showcase/monday-banners/webhook/status`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (bannersRes.ok) setBanners(await bannersRes.json());
      if (mediaRes.ok) {
        const mc = await mediaRes.json();
        setMediaConfig(mc);
        setAlbumUrl(mc.album_url || '');
      }
      if (mondayRes.ok) setMondayConfig(await mondayRes.json());
      if (autoSyncRes.ok) setAutoSync(await autoSyncRes.json());
      if (historyRes.ok) {
        const hd = await historyRes.json();
        setSyncHistory(hd.history || []);
      }
      if (webhookRes.ok) setWebhookStatus(await webhookRes.json());
    } catch (e) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addBanner = () => {
    setBanners(prev => [...prev, {
      type: 'text', text: '', bg_color: '#16a34a', bg_gradient: 'linear-gradient(135deg, #16a34a 0%, #0d6e3a 100%)',
      text_color: '#ffffff', font_size: 'lg', image_url: '', link_url: '', overlay_text: '', bg_image_url: '',
      active: true, order: prev.length,
    }]);
  };

  const deleteBanner = async (bannerId, index) => {
    if (bannerId) {
      await fetch(`${API_URL}/api/admin/showcase/banners/${bannerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    }
    setBanners(prev => prev.filter((_, i) => i !== index));
    toast.success('Banner deleted');
  };

  const saveBannerInList = (index, saved) => {
    setBanners(prev => prev.map((b, i) => i === index ? saved : b));
  };

  const fetchAlbum = async () => {
    if (!albumUrl) return;
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/media-player/fetch-album`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ album_url: albumUrl })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(`Found ${data.items_added} media items!`);
        fetchData();
      } else {
        toast.info(data.message || 'No items found. Try adding manually.');
      }
    } catch (e) {
      toast.error('Failed to fetch album');
    } finally {
      setFetching(false);
    }
  };

  const addManualItem = async () => {
    if (!newItemUrl) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/media-player/add-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ type: newItemType, url: newItemUrl, caption: newItemCaption })
      });
      if (res.ok) {
        toast.success('Item added');
        setNewItemUrl('');
        setNewItemCaption('');
        fetchData();
      }
    } catch (e) {
      toast.error('Failed to add item');
    }
  };

  const deleteMediaItem = async (itemId) => {
    try {
      await fetch(`${API_URL}/api/admin/showcase/media-player/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast.success('Item removed');
      fetchData();
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  // Monday.com sync functions
  const loadMondayBoards = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/monday-banners/boards`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMondayBoards(data.boards || []);
      }
    } catch (e) {
      toast.error('Failed to load boards');
    }
  };

  const saveMondayConfig = async () => {
    setSavingMonday(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/monday-banners/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(mondayConfig)
      });
      if (res.ok) toast.success('Monday.com config saved');
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSavingMonday(false);
    }
  };

  const syncFromMonday = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/monday-banners/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(`Synced ${data.synced} banners from Monday.com!`);
        fetchData();
      } else {
        toast.info(data.message || 'Sync skipped');
      }
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const saveAutoSync = async (overrides = {}) => {
    setSavingAutoSync(true);
    const payload = { ...autoSync, ...overrides };
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/monday-banners/auto-sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ enabled: payload.enabled, interval_minutes: payload.interval_minutes })
      });
      if (res.ok) {
        const data = await res.json();
        setAutoSync(prev => ({ ...prev, ...data.auto_sync, scheduler: data.scheduler }));
        toast.success(payload.enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
      }
    } catch (e) {
      toast.error('Failed to save auto-sync settings');
    } finally {
      setSavingAutoSync(false);
    }
  };

  const toggleWebhook = async () => {
    setTogglingWebhook(true);
    const action = webhookStatus.registered ? 'unregister' : 'register';
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/monday-banners/webhook/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(action === 'register' ? 'Real-time webhook connected!' : 'Webhook disconnected');
        // Refresh webhook status
        const statusRes = await fetch(`${API_URL}/api/admin/showcase/monday-banners/webhook/status`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (statusRes.ok) setWebhookStatus(await statusRes.json());
      } else {
        toast.error(data.message || `Failed to ${action} webhook`);
      }
    } catch (e) {
      toast.error(`Failed to ${action} webhook`);
    } finally {
      setTogglingWebhook(false);
    }
  };

  const savePlayerSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/showcase/media-player`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(mediaConfig)
      });
      if (res.ok) toast.success('Settings saved');
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const items = mediaConfig?.items || [];

  return (
    <div className="space-y-6" data-testid="showcase-admin">
      <Tabs defaultValue="banners">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="banners" className="gap-1.5 text-xs" data-testid="banners-tab">
            <Type className="h-3.5 w-3.5" /> Banners
          </TabsTrigger>
          <TabsTrigger value="monday" className="gap-1.5 text-xs" data-testid="monday-tab">
            <Plug className="h-3.5 w-3.5" /> Monday.com
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5 text-xs" data-testid="media-tab">
            <Film className="h-3.5 w-3.5" /> Media Player
          </TabsTrigger>
        </TabsList>

        {/* ═══ BANNERS TAB ═══ */}
        <TabsContent value="banners" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Banner Carousel</h3>
              <p className="text-[10px] text-muted-foreground">Image or text banners — auto-rotates on the landing page</p>
            </div>
            <Button size="sm" onClick={addBanner} className="h-7 text-xs gap-1" data-testid="add-banner-btn">
              <Plus className="h-3 w-3" /> Add Banner
            </Button>
          </div>

          {banners.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No banners yet. Click "Add Banner" to create one.</p>
          ) : (
            <div className="space-y-3">
              {banners.map((banner, i) => (
                <BannerEditor
                  key={banner.banner_id || i}
                  banner={banner}
                  onSave={(saved) => saveBannerInList(i, saved)}
                  onDelete={() => deleteBanner(banner.banner_id, i)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ MONDAY.COM SYNC TAB ═══ */}
        <TabsContent value="monday" className="space-y-4 mt-4">
          <div className="border rounded-xl p-4 space-y-4 bg-card" data-testid="monday-sync-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-bold">Monday.com → Banner Sync</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Design in Canva, paste URL in Monday.com, control schedule from the board
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mondayConfig?.enabled && (
                  <Button size="sm" variant="outline" onClick={syncFromMonday} disabled={syncing} className="h-7 text-xs gap-1" data-testid="sync-monday-btn">
                    {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Sync Now
                  </Button>
                )}
              </div>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-3 py-2 border-y">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mondayConfig?.enabled || false}
                  onChange={e => setMondayConfig({ ...mondayConfig, enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="font-bold">Enable Monday.com Banner Sync</span>
              </label>
              {mondayConfig?.last_sync && (
                <span className="text-[9px] text-muted-foreground ml-auto">
                  Last sync: {new Date(mondayConfig.last_sync).toLocaleString()}
                </span>
              )}
            </div>

            {mondayConfig?.enabled && (
              <>
                {/* Board selection */}
                <div>
                  <Label className="text-[10px]">Monday.com Board</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={mondayConfig?.board_id || ''}
                      onChange={e => setMondayConfig({ ...mondayConfig, board_id: e.target.value })}
                      placeholder="Board ID"
                      className="h-8 text-xs flex-1"
                      data-testid="monday-board-id"
                    />
                    <Button size="sm" variant="outline" onClick={loadMondayBoards} className="h-8 text-xs gap-1" data-testid="load-boards-btn">
                      <RefreshCw className="h-3 w-3" /> Load Boards
                    </Button>
                  </div>
                  {mondayBoards.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg divide-y">
                      {mondayBoards.map(board => (
                        <button
                          key={board.id}
                          onClick={() => {
                            setMondayConfig({ ...mondayConfig, board_id: board.id });
                            toast.success(`Selected: ${board.name}`);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex justify-between ${mondayConfig?.board_id === board.id ? 'bg-primary/5 font-bold' : ''}`}
                        >
                          <span>{board.name}</span>
                          <span className="text-muted-foreground">ID: {board.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column mappings */}
                <div>
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Column Mappings
                  </h4>
                  <p className="text-[9px] text-muted-foreground mb-2">
                    Map Monday.com column IDs to banner fields. Select a board and check its columns above.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'canva_url', label: 'Canva/Image URL', hint: 'Link column with Canva design URL' },
                      { key: 'text', label: 'Banner Text', hint: 'Text column for message' },
                      { key: 'bg_color', label: 'Background Color', hint: 'Color column' },
                      { key: 'link_url', label: 'Click Link', hint: 'Link column' },
                      { key: 'start_date', label: 'Start Date', hint: 'Date column' },
                      { key: 'end_date', label: 'End Date', hint: 'Date column' },
                      { key: 'status', label: 'Status', hint: 'Status column (Active/Paused)' },
                      { key: 'banner_type', label: 'Type', hint: 'Status: Image/Text' },
                    ].map(({ key, label, hint }) => (
                      <div key={key}>
                        <Label className="text-[9px]">{label}</Label>
                        <Input
                          value={mondayConfig?.columns?.[key] || ''}
                          onChange={e => setMondayConfig({
                            ...mondayConfig,
                            columns: { ...(mondayConfig?.columns || {}), [key]: e.target.value }
                          })}
                          placeholder={hint}
                          className="h-7 text-[10px]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Show columns of selected board */}
                  {mondayConfig?.board_id && mondayBoards.length > 0 && (() => {
                    const board = mondayBoards.find(b => b.id === mondayConfig.board_id);
                    if (!board?.columns) return null;
                    return (
                      <details className="mt-2">
                        <summary className="text-[9px] font-bold cursor-pointer text-primary">
                          View columns of "{board.name}"
                        </summary>
                        <div className="mt-1 text-[9px] bg-muted/30 rounded-lg p-2 max-h-32 overflow-y-auto space-y-0.5">
                          {board.columns.filter(c => c.id !== 'name').map(col => (
                            <div key={col.id} className="flex justify-between">
                              <span><code className="bg-muted px-1 rounded">{col.id}</code> — {col.title}</span>
                              <span className="text-muted-foreground">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })()}
                </div>

                <Button onClick={saveMondayConfig} disabled={savingMonday} size="sm" className="w-full h-8 text-xs gap-1" data-testid="save-monday-config">
                  {savingMonday ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save Monday.com Config
                </Button>

                {/* Real-Time Webhook */}
                <div className="border rounded-xl p-4 space-y-3 bg-muted/20" data-testid="webhook-panel">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${webhookStatus.registered ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <div>
                        <h4 className="text-xs font-bold">Real-Time Sync</h4>
                        <p className="text-[9px] text-muted-foreground">Instant sync via Monday.com webhook — changes reflect immediately</p>
                      </div>
                    </div>
                    <Badge
                      variant={webhookStatus.registered ? 'default' : 'outline'}
                      className={`text-[9px] ${webhookStatus.registered ? 'bg-amber-500/90' : ''}`}
                      data-testid="webhook-status-badge"
                    >
                      {webhookStatus.registered ? 'Connected' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={webhookStatus.registered ? 'outline' : 'default'}
                      onClick={toggleWebhook}
                      disabled={togglingWebhook || !mondayConfig?.board_id}
                      className="h-8 text-xs gap-1 flex-1"
                      data-testid="toggle-webhook-btn"
                    >
                      {togglingWebhook ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : webhookStatus.registered ? (
                        <ZapOff className="h-3 w-3" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      {webhookStatus.registered ? 'Disconnect Webhook' : 'Connect Real-Time Webhook'}
                    </Button>
                  </div>
                  {webhookStatus.registered && webhookStatus.registered_at && (
                    <p className="text-[9px] text-muted-foreground">
                      Connected since {new Date(webhookStatus.registered_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Auto-Sync Settings (Fallback) */}
                <div className="border rounded-xl p-4 space-y-3 bg-muted/20" data-testid="auto-sync-panel">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 ${autoSync.enabled && autoSync.scheduler?.running && !autoSync.scheduler?.paused ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <h4 className="text-xs font-bold">Scheduled Sync (Fallback)</h4>
                        <p className="text-[9px] text-muted-foreground">Periodic polling as a safety net — use if webhook not available</p>
                      </div>
                    </div>
                    <Badge
                      variant={autoSync.enabled && autoSync.scheduler?.running && !autoSync.scheduler?.paused ? 'default' : 'outline'}
                      className="text-[9px]"
                      data-testid="auto-sync-status-badge"
                    >
                      {autoSync.enabled && autoSync.scheduler?.running && !autoSync.scheduler?.paused ? 'Active' : 'Off'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 py-2 border-y">
                    <label className="flex items-center gap-2 text-xs cursor-pointer" data-testid="auto-sync-toggle">
                      <input
                        type="checkbox"
                        checked={autoSync.enabled || false}
                        onChange={e => {
                          const newVal = e.target.checked;
                          setAutoSync(prev => ({ ...prev, enabled: newVal }));
                          saveAutoSync({ enabled: newVal });
                        }}
                        className="rounded"
                      />
                      <span className="font-bold">Enable Auto-Sync</span>
                    </label>
                  </div>

                  {autoSync.enabled && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px]">Sync Every (minutes)</Label>
                        <div className="flex gap-2 mt-1 items-center">
                          <select
                            value={autoSync.interval_minutes || 10}
                            onChange={e => setAutoSync(prev => ({ ...prev, interval_minutes: parseInt(e.target.value) }))}
                            className="h-8 rounded-lg border bg-background px-2 text-xs flex-1"
                            data-testid="auto-sync-interval"
                          >
                            <option value={1}>1 min</option>
                            <option value={2}>2 min</option>
                            <option value={5}>5 min</option>
                            <option value={10}>10 min</option>
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={360}>6 hours</option>
                            <option value={720}>12 hours</option>
                            <option value={1440}>24 hours</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => saveAutoSync()}
                            disabled={savingAutoSync}
                            className="h-8 text-xs gap-1"
                            data-testid="save-auto-sync-btn"
                          >
                            {savingAutoSync ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Apply
                          </Button>
                        </div>
                      </div>

                      {/* Status info */}
                      <div className="bg-background rounded-lg p-2.5 space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className={`font-bold ${autoSync.scheduler?.running && !autoSync.scheduler?.paused ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {autoSync.scheduler?.running && !autoSync.scheduler?.paused ? 'Running' : 'Paused'}
                          </span>
                        </div>
                        {autoSync.scheduler?.next_run && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Next sync</span>
                            <span className="font-mono">{new Date(autoSync.scheduler.next_run).toLocaleString()}</span>
                          </div>
                        )}
                        {autoSync.last_sync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync</span>
                            <span className="font-mono">{new Date(autoSync.last_sync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Workflow guide */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                  <h4 className="text-[10px] font-bold">Workflow: Canva → Monday.com → App</h4>
                  <ol className="text-[9px] text-muted-foreground space-y-1 list-decimal ml-3">
                    <li>Design your banner in <strong>Canva</strong> and get the share/download link</li>
                    <li>Create a new item on your <strong>Monday.com board</strong></li>
                    <li>Paste the Canva URL in the image column, set dates for scheduling</li>
                    <li>Set status to <strong>Active</strong> when ready to publish</li>
                    <li>Connect <strong>Real-Time Webhook</strong> for instant sync, or use <strong>Sync Now</strong> / <strong>Scheduled Sync</strong></li>
                  </ol>
                </div>

                {/* Sync History Log */}
                {syncHistory.length > 0 && (
                  <div className="border rounded-xl p-4 space-y-3 bg-card" data-testid="sync-history-panel">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold">Sync History</h4>
                      <span className="text-[9px] text-muted-foreground ml-auto">{syncHistory.length} recent</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {syncHistory.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] py-1.5 px-2 rounded-lg bg-muted/30" data-testid={`sync-history-entry-${i}`}>
                          {entry.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive shrink-0" />
                          )}
                          <span className="font-mono text-muted-foreground shrink-0">
                            {new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Badge variant={entry.trigger === 'auto' ? 'secondary' : 'outline'} className="text-[8px] h-4 shrink-0">
                            {entry.trigger === 'auto' ? 'Auto' : 'Manual'}
                          </Badge>
                          {entry.status === 'success' ? (
                            <span className="text-muted-foreground">{entry.items_synced} banners synced</span>
                          ) : (
                            <span className="text-destructive truncate">{entry.error || 'Failed'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ═══ MEDIA PLAYER TAB ═══ */}
        <TabsContent value="media" className="space-y-4 mt-4">
          {/* Google Photos Album URL */}
          <div className="border rounded-xl p-4 space-y-3 bg-card">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">Google Photos Album</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Paste a shared Google Photos album URL to import photos/videos automatically
            </p>
            <div className="flex gap-2">
              <Input
                value={albumUrl}
                onChange={e => setAlbumUrl(e.target.value)}
                placeholder="https://photos.app.goo.gl/... or https://photos.google.com/share/..."
                className="h-8 text-xs flex-1"
                data-testid="album-url-input"
              />
              <Button
                size="sm"
                onClick={fetchAlbum}
                disabled={fetching || !albumUrl}
                className="h-8 text-xs gap-1"
                data-testid="fetch-album-btn"
              >
                {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                Fetch
              </Button>
            </div>
          </div>

          {/* Add Manual Item */}
          <div className="border rounded-xl p-4 space-y-3 bg-card">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">Add Media Manually</h3>
            </div>
            <div className="flex gap-2">
              <select
                value={newItemType}
                onChange={e => setNewItemType(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs w-24"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <Input
                value={newItemUrl}
                onChange={e => setNewItemUrl(e.target.value)}
                placeholder="Media URL (image or video)"
                className="h-8 text-xs flex-1"
                data-testid="manual-media-url"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemCaption}
                onChange={e => setNewItemCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                onClick={addManualItem}
                disabled={!newItemUrl}
                className="h-8 text-xs gap-1"
                data-testid="add-media-btn"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {/* Player Settings */}
          <div className="border rounded-xl p-4 space-y-3 bg-card">
            <h3 className="text-sm font-bold">Player Settings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px]">Slide Interval (ms)</Label>
                <Input
                  type="number"
                  value={mediaConfig?.interval_ms || 5000}
                  onChange={e => setMediaConfig({ ...mediaConfig, interval_ms: parseInt(e.target.value) || 5000 })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Dot Style</Label>
                <select
                  value={mediaConfig?.dot_style || 'auto'}
                  onChange={e => setMediaConfig({ ...mediaConfig, dot_style: e.target.value })}
                  className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
                  data-testid="dot-style-select"
                >
                  <option value="auto">Auto (dots if few, bar if many)</option>
                  <option value="dots">Always Dots</option>
                  <option value="progress_bar">Progress Bar</option>
                  <option value="counter">Counter (1/20)</option>
                  <option value="none">Hide All</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Video Max Duration (ms)</Label>
                <Input
                  type="number"
                  value={mediaConfig?.video_max_duration_ms || 30000}
                  onChange={e => setMediaConfig({ ...mediaConfig, video_max_duration_ms: parseInt(e.target.value) || 30000 })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediaConfig?.autoplay !== false}
                    onChange={e => setMediaConfig({ ...mediaConfig, autoplay: e.target.checked })}
                    className="rounded"
                  />
                  Autoplay
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediaConfig?.show_controls !== false}
                    onChange={e => setMediaConfig({ ...mediaConfig, show_controls: e.target.checked })}
                    className="rounded"
                  />
                  Show Controls
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px]">Image Fit Mode</Label>
                <select
                  value={mediaConfig?.fit_mode || 'smart'}
                  onChange={e => setMediaConfig({ ...mediaConfig, fit_mode: e.target.value })}
                  className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
                  data-testid="fit-mode-select"
                >
                  <option value="smart">Smart (pair portraits, blur bg)</option>
                  <option value="contain">Contain (full image, blur bg)</option>
                  <option value="cover">Cover (crop to fill)</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig?.show_dots !== false}
                  onChange={e => setMediaConfig({ ...mediaConfig, show_dots: e.target.checked })}
                  className="rounded"
                  data-testid="show-dots-checkbox"
                />
                Show Dots/Indicator
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig?.shuffle === true}
                  onChange={e => setMediaConfig({ ...mediaConfig, shuffle: e.target.checked })}
                  className="rounded"
                  data-testid="shuffle-checkbox"
                />
                Shuffle (Random Order)
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig?.video_autoplay !== false}
                  onChange={e => setMediaConfig({ ...mediaConfig, video_autoplay: e.target.checked })}
                  className="rounded"
                  data-testid="video-autoplay-checkbox"
                />
                Video Autoplay
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig?.video_default_muted === true}
                  onChange={e => setMediaConfig({ ...mediaConfig, video_default_muted: e.target.checked })}
                  className="rounded"
                  data-testid="video-default-muted-checkbox"
                />
                Video Default Muted
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaConfig?.disable_swipe === true}
                  onChange={e => setMediaConfig({ ...mediaConfig, disable_swipe: e.target.checked })}
                  className="rounded"
                  data-testid="disable-swipe-checkbox"
                />
                Lock Navigation (random only)
              </label>
            </div>
            <Button size="sm" onClick={savePlayerSettings} className="h-7 text-xs gap-1" data-testid="save-player-settings">
              <Save className="h-3 w-3" /> Save Settings
            </Button>
          </div>

          {/* Media Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{items.length} Media Items</h3>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No media items. Paste a Google Photos album URL or add items manually above.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {items.map(item => (
                  <div key={item.item_id} className="relative group rounded-xl overflow-hidden border" data-testid={`media-item-${item.item_id}`}>
                    {item.type === 'video' ? (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                        <p className="text-[9px] text-muted-foreground absolute bottom-1 left-1">Video</p>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.caption || 'Media'} className="aspect-video object-cover w-full" />
                    )}
                    {item.caption && (
                      <p className="text-[9px] p-1.5 truncate text-muted-foreground">{item.caption}</p>
                    )}
                    <button
                      onClick={() => deleteMediaItem(item.item_id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
