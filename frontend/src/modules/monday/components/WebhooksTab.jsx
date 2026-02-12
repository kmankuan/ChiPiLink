/**
 * Monday.com Webhook Management Tab
 * Admin UI to register/manage webhooks for auto-sync.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Webhook, Trash2, Copy, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WebhooksTab() {
  const { t } = useTranslation();
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({});
  const [boardId, setBoardId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Auto-generate webhook URL based on current domain (works in preview and production)
  const baseUrl = window.location.origin;
  const webhookUrl = `${baseUrl}/api/store/monday/webhooks/subitem-status`;
  const universalWebhookUrl = `${baseUrl}/api/monday/webhooks/incoming`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/webhooks/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setConfig(await res.json());
    } catch (e) {
      console.error('Failed to fetch webhook config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleRegister = async () => {
    if (!boardId) { toast.error(t('monday.boardIdRequired')); return; }
    setRegistering(true);
    try {
      const res = await fetch(`${API}/api/store/monday/webhooks/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl, board_id: boardId }),
      });
      if (res.ok) {
        toast.success(t('admin.webhookRegistered', 'Webhook registered'));
        fetchConfig();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to register webhook');
      }
    } catch {
      toast.error(t('monday.networkError'));
    } finally {
      setRegistering(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`${API}/api/store/monday/webhooks`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(t('admin.webhookRemoved', 'Webhook removed'));
        setConfig({});
      }
    } catch {
      toast.error(t('monday.networkError'));
    } finally {
      setRemoving(false);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success(t('monday.urlCopied'));
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  const isRegistered = !!config.webhook_id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4" />
                {t('admin.webhookManagement', 'Webhook Management')}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {t('admin.webhookDesc', 'Auto-sync subitem status changes from Monday.com in real-time')}
              </CardDescription>
            </div>
            <Badge variant={isRegistered ? 'default' : 'secondary'} className="text-[10px] gap-1">
              {isRegistered
                ? <><CheckCircle2 className="h-3 w-3" /> Active</>
                : <><XCircle className="h-3 w-3" /> Not registered</>
              }
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URLs */}
          <div className="space-y-2">
            <Label className="text-sm">Webhook URL (Textbook Orders)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
              <Button variant="ghost" size="icon" onClick={() => copyUrl(webhookUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Universal Webhook URL (All Modules)</Label>
            <div className="flex gap-2">
              <Input value={universalWebhookUrl} readOnly className="text-xs font-mono bg-muted" />
              <Button variant="ghost" size="icon" onClick={() => copyUrl(universalWebhookUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Routes events to the correct module by board_id</p>
          </div>

          {isRegistered ? (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Webhook</span>
                <Badge variant="outline" className="text-[10px] font-mono">ID: {config.webhook_id}</Badge>
              </div>
              {config.registered_at && (
                <p className="text-xs text-muted-foreground">
                  Registered: {new Date(config.registered_at).toLocaleString()}
                </p>
              )}
              <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing} className="gap-1.5 text-xs">
                {removing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Remove Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm">Register New Webhook</Label>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Textbook Orders Board ID</Label>
                <Input
                  placeholder="e.g., 1234567890"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                />
              </div>
              <Button onClick={handleRegister} disabled={registering} className="w-full gap-2 text-sm">
                {registering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
                Register Webhook
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
