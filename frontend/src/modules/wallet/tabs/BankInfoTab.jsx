/**
 * BankInfoTab — Manage bank info per context (wallet_general, pca_private, etc.)
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Building2, Plus, Edit, Trash2, Loader2, Save, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API_URL = process.env.REACT_APP_BACKEND_URL;

const EMPTY_FORM = {
  context: '', label: '', bank_name: '', account_holder: '',
  account_number: '', account_type: '', routing_number: '',
  reference_instructions: '', notes: '', is_active: true,
};

const CONTEXT_PRESETS = [
  { value: 'wallet_general', label: 'Wallet Recharge (General)' },
  { value: 'pca_private', label: 'PCA Private (Textbooks)' },
];

export default function BankInfoTab({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(null); // null | form object
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchBankInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wallet/admin/bank-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.bank_info || []);
    } catch {
      toast.error('Error loading bank info');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBankInfo(); }, [fetchBankInfo]);

  const handleSave = async () => {
    if (!editDialog?.context || !editDialog?.bank_name || !editDialog?.account_number) {
      toast.error('Context, bank name and account number are required');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/wallet/admin/bank-info`, editDialog, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Bank info saved');
      setEditDialog(null);
      fetchBankInfo();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (context) => {
    setDeleting(context);
    try {
      await axios.delete(`${API_URL}/api/wallet/admin/bank-info/${context}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Bank info deleted');
      fetchBankInfo();
    } catch {
      toast.error('Error deleting');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Each context represents a different bank account for a specific purpose.
            For example, <strong>"Wallet Recharge"</strong> is the bank info shown when users need to top up their wallet,
            while <strong>"PCA Private"</strong> is for textbook payments on laopan.online.
          </p>
        </CardContent>
      </Card>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => setEditDialog({ ...EMPTY_FORM })} className="gap-2" data-testid="add-bank-info-btn">
          <Plus className="h-4 w-4" /> Add Bank Info
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No bank info configured yet. Click "Add Bank Info" to create one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.context} data-testid={`bank-info-card-${item.context}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{item.label || item.context}</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">{item.context}</Badge>
                    {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditDialog({ ...item })} data-testid={`edit-bank-${item.context}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(item.context)} disabled={deleting === item.context}
                      data-testid={`delete-bank-${item.context}`}>
                      {deleting === item.context ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{item.bank_name}</span></div>
                  <div><span className="text-muted-foreground">Account:</span> <span className="font-medium font-mono">{item.account_number}</span></div>
                  <div><span className="text-muted-foreground">Holder:</span> <span className="font-medium">{item.account_holder}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{item.account_type || '-'}</span></div>
                </div>
                {item.reference_instructions && (
                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{item.reference_instructions}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editDialog?.context && items.some(i => i.context === editDialog.context) ? 'Edit Bank Info' : 'Add Bank Info'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {/* Context */}
            <div className="space-y-2">
              <Label>Context ID *</Label>
              <div className="flex gap-2">
                <Input value={editDialog?.context || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="e.g. wallet_general" className="font-mono" data-testid="bank-context-input" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {CONTEXT_PRESETS.map(p => (
                  <Button key={p.value} variant="ghost" size="sm" className="text-xs h-6 px-2"
                    onClick={() => setEditDialog(prev => ({ ...prev, context: p.value, label: prev.label || p.label }))}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label>Display Label *</Label>
              <Input value={editDialog?.label || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Wallet Recharge" data-testid="bank-label-input" />
            </div>

            {/* Bank details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input value={editDialog?.bank_name || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="Banco General" data-testid="bank-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Input value={editDialog?.account_type || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, account_type: e.target.value }))}
                  placeholder="Savings / Checking" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Account Holder *</Label>
              <Input value={editDialog?.account_holder || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, account_holder: e.target.value }))}
                placeholder="ChiPi Link S.A." data-testid="bank-holder-input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={editDialog?.account_number || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="04-00-00-123456" className="font-mono" data-testid="bank-account-input" />
              </div>
              <div className="space-y-2">
                <Label>Routing Number</Label>
                <Input value={editDialog?.routing_number || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, routing_number: e.target.value }))}
                  placeholder="Optional" className="font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference Instructions</Label>
              <Textarea value={editDialog?.reference_instructions || ''}
                onChange={(e) => setEditDialog(prev => ({ ...prev, reference_instructions: e.target.value }))}
                placeholder="e.g. Use your registered email as reference" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editDialog?.notes || ''} onChange={(e) => setEditDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes..." rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editDialog?.is_active ?? true}
                onCheckedChange={(v) => setEditDialog(prev => ({ ...prev, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-bank-info-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
