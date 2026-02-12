/**
 * Monday.com Wallet Integration Tab
 * Configure the Customers Admin board for wallet top-up/deduct via subitems.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Wallet, Copy, RefreshCw, Loader2, Save, CheckCircle2, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletMondayTab() {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    board_id: '',
    column_mapping: { email: 'email' },
    subitem_column_mapping: {
      amount: 'chipi_wallet',
      note: 'chipi_note',
      status: 'status',
    },
    enabled: true,
  });

  const walletWebhookUrl = `${window.location.origin}/api/monday/webhooks/incoming`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch wallet config:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    if (!config.board_id) {
      toast.error('Board ID is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/monday/adapters/wallet/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        toast.success('Wallet integration config saved');
        fetchConfig();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to save config');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied');
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-medium">How Wallet Top-Up works:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>Client makes a bank transfer</li>
                <li>A <strong>subitem</strong> is added under the customer's item on the Customers Admin board</li>
                <li>Set the subitem's <strong>Chipi Wallet</strong> column to the amount</li>
                <li>Change the subitem's <strong>Status</strong> to "Add Wallet" or "Deduct Wallet"</li>
                <li>Monday.com automation triggers the webhook and the user's wallet is updated</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Wallet Webhook
          </CardTitle>
          <CardDescription className="text-xs">
            Use this URL in your Monday.com automation to trigger wallet events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Webhook URL (Wallet)</Label>
            <div className="flex gap-2">
              <Input
                value={walletWebhookUrl}
                readOnly
                className="text-xs font-mono bg-muted"
                data-testid="wallet-webhook-url"
              />
              <Button variant="ghost" size="icon" onClick={() => copyUrl(walletWebhookUrl)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Routes to wallet handler when event comes from board {config.board_id || '(not configured)'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Board & Column Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Board Configuration</CardTitle>
              <CardDescription className="text-xs mt-1">
                Map your Customers Admin board columns to the wallet system
              </CardDescription>
            </div>
            <Badge
              variant={config.board_id ? 'default' : 'secondary'}
              className="text-[10px] gap-1"
            >
              {config.board_id ? (
                <><CheckCircle2 className="h-3 w-3" /> Configured</>
              ) : (
                'Not configured'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Board ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customers Admin Board ID</Label>
            <Input
              value={config.board_id}
              onChange={(e) => setConfig(prev => ({ ...prev, board_id: e.target.value }))}
              placeholder="e.g., 5931665026"
              className="font-mono"
              data-testid="wallet-board-id-input"
            />
          </div>

          {/* Parent Item Columns (Customer) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Customer Item Columns</Label>
            <p className="text-xs text-muted-foreground">Column IDs from the parent item (customer)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email Column ID</Label>
                <Input
                  value={config.column_mapping?.email || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    column_mapping: { ...prev.column_mapping, email: e.target.value }
                  }))}
                  placeholder="email"
                  className="font-mono text-xs"
                  data-testid="wallet-email-col-input"
                />
              </div>
            </div>
          </div>

          {/* Subitem Columns (Wallet Event) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Subitem Columns (Wallet Event)</Label>
            <p className="text-xs text-muted-foreground">Column IDs from the subitem (transaction event)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chipi Wallet (Amount)</Label>
                <Input
                  value={config.subitem_column_mapping?.amount || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    subitem_column_mapping: { ...prev.subitem_column_mapping, amount: e.target.value }
                  }))}
                  placeholder="chipi_wallet"
                  className="font-mono text-xs"
                  data-testid="wallet-amount-col-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chipi Note (Description)</Label>
                <Input
                  value={config.subitem_column_mapping?.note || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    subitem_column_mapping: { ...prev.subitem_column_mapping, note: e.target.value }
                  }))}
                  placeholder="chipi_note"
                  className="font-mono text-xs"
                  data-testid="wallet-note-col-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status Column</Label>
                <Input
                  value={config.subitem_column_mapping?.status || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    subitem_column_mapping: { ...prev.subitem_column_mapping, status: e.target.value }
                  }))}
                  placeholder="status"
                  className="font-mono text-xs"
                  data-testid="wallet-status-col-input"
                />
              </div>
            </div>
          </div>

          {/* Status Labels Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium">Status Labels (in Monday.com subitem)</p>
            <div className="flex gap-3">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                "Add Wallet" = Top Up
              </Badge>
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                "Deduct Wallet" = Deduction
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Create these status labels in your Monday.com subitem status column
            </p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2" data-testid="save-wallet-config-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Wallet Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
