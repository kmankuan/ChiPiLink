/**
 * DepositMethodsConfig — Admin toggle for enabling/disabling deposit payment methods.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, Banknote, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const ICONS = { yappy: Smartphone, cash: Banknote, card: CreditCard, transfer: Building2 };

export default function DepositMethodsConfig() {
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/api/wallet/admin/deposit-methods`, { headers })
      .then(r => r.json())
      .then(d => { setMethods(d.methods || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async (id, enabled) => {
    const updated = { ...methods, [id]: { ...methods[id], enabled } };
    setMethods(updated);
    try {
      const res = await fetch(`${API}/api/wallet/admin/deposit-methods`, {
        method: 'PUT', headers, body: JSON.stringify({ methods: updated })
      });
      if (res.ok) toast.success(`${id} ${enabled ? 'enabled' : 'disabled'}`);
      else toast.error('Failed to save');
    } catch { toast.error('Error saving'); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!methods) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Deposit Payment Methods</CardTitle>
        <CardDescription className="text-xs">Toggle which payment methods users see when topping up their wallet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {['yappy', 'cash', 'card', 'transfer'].map(id => {
          const m = methods[id];
          if (!m) return null;
          const Icon = ICONS[id] || Banknote;
          return (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`method-${id}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-medium">{m.label || id}</p>
                  <p className="text-[10px] text-muted-foreground">{m.description || ''}</p>
                </div>
                {m.status === 'under_construction' && <Badge variant="secondary" className="text-[9px]">Coming Soon</Badge>}
              </div>
              <Switch checked={m.enabled || false} onCheckedChange={v => toggle(id, v)} data-testid={`toggle-${id}`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
