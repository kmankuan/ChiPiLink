/**
 * DepositMethodsConfig — Admin toggle + edit for deposit payment methods.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Smartphone, Banknote, CreditCard, Building2, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const ICONS = { yappy: Smartphone, cash: Banknote, card: CreditCard, transfer: Building2 };

export default function DepositMethodsConfig() {
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/api/wallet/admin/deposit-methods`, { headers })
      .then(r => r.json())
      .then(d => { setMethods(d.methods || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const saveAll = async (updated) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/wallet/admin/deposit-methods`, {
        method: 'PUT', headers, body: JSON.stringify({ methods: updated || methods })
      });
      if (res.ok) toast.success('Saved!');
      else toast.error('Failed to save');
    } catch { toast.error('Error saving'); }
    finally { setSaving(false); }
  };

  const toggle = (id, enabled) => {
    const updated = { ...methods, [id]: { ...methods[id], enabled } };
    setMethods(updated);
    saveAll(updated);
  };

  const updateField = (id, field, value) => {
    setMethods(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const updateConfig = (id, field, value) => {
    setMethods(prev => ({
      ...prev,
      [id]: { ...prev[id], config: { ...(prev[id].config || {}), [field]: value } }
    }));
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!methods) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Deposit Payment Methods</CardTitle>
        <CardDescription className="text-xs">Toggle methods on/off and edit their details. Click a method to configure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {['yappy', 'cash', 'card', 'transfer'].map(id => {
          const m = methods[id];
          if (!m) return null;
          const Icon = ICONS[id] || Banknote;
          const isExpanded = expanded === id;
          return (
            <div key={id} className="rounded-lg border overflow-hidden" data-testid={`method-${id}`}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : id)}>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <div className="p-1.5 rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.label || id}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.description || ''}</p>
                  </div>
                </div>
                <Switch checked={m.enabled || false} onCheckedChange={v => toggle(id, v)} data-testid={`toggle-${id}`} />
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t bg-muted/20 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Label</Label><Input value={m.label || ''} onChange={e => updateField(id, 'label', e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-[10px]">Description</Label><Input value={m.description || ''} onChange={e => updateField(id, 'description', e.target.value)} className="h-8 text-xs" /></div>
                  </div>

                  <div>
                    <Label className="text-[10px]">Instructions (HTML supported)</Label>
                    <Textarea value={m.instructions || ''} onChange={e => updateField(id, 'instructions', e.target.value)} rows={3} className="text-xs" placeholder="<p>Use your <strong>online banking</strong>...</p>" />
                  </div>

                  {/* Transfer-specific config fields */}
                  {id === 'transfer' && (
                    <div className="space-y-2 p-2 rounded-lg border bg-card">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[10px]">Bank Name</Label><Input value={m.config?.bank_name || ''} onChange={e => updateConfig(id, 'bank_name', e.target.value)} className="h-8 text-xs" placeholder="Banesco" /></div>
                        <div><Label className="text-[10px]">Account Holder</Label><Input value={m.config?.account_holder || ''} onChange={e => updateConfig(id, 'account_holder', e.target.value)} className="h-8 text-xs" placeholder="ChiPi Link S.A." /></div>
                        <div><Label className="text-[10px]">Account Number</Label><Input value={m.config?.account_number || ''} onChange={e => updateConfig(id, 'account_number', e.target.value)} className="h-8 text-xs" placeholder="0301-XXXXX-XX" /></div>
                        <div><Label className="text-[10px]">Account Type</Label><Input value={m.config?.account_type || ''} onChange={e => updateConfig(id, 'account_type', e.target.value)} className="h-8 text-xs" placeholder="Savings / Checking" /></div>
                      </div>
                      <div><Label className="text-[10px]">Alert Email</Label><Input value={m.config?.alert_email || ''} onChange={e => updateConfig(id, 'alert_email', e.target.value)} className="h-8 text-xs" placeholder="chipiwallet@gmail.com" /></div>
                      <div><Label className="text-[10px]">Additional Notes</Label><Input value={m.config?.additional_notes || ''} onChange={e => updateConfig(id, 'additional_notes', e.target.value)} className="h-8 text-xs" placeholder="Include your full name..." /></div>
                    </div>
                  )}

                  <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => saveAll()} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
