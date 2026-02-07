/**
 * Monday.com Status Mapping Configuration
 * Admin UI to map Monday.com status labels to app delivery statuses.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, RefreshCw, Plus, Trash2, ArrowRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  ordered: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  ready_for_pickup: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  issue: 'bg-red-100 text-red-700',
  out_of_stock: 'bg-gray-200 text-gray-500',
};

export default function StatusMappingTab() {
  const { t } = useTranslation();
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapping, setMapping] = useState({});
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newStatus, setNewStatus] = useState('ordered');

  const fetchMapping = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/status-mapping`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMapping(data.mapping || {});
        setAvailableStatuses(data.available_statuses || []);
      }
    } catch (e) {
      console.error('Failed to fetch status mapping:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMapping(); }, [fetchMapping]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/store/monday/status-mapping`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping }),
      });
      if (res.ok) toast.success(t('admin.mappingSaved', 'Status mapping saved'));
      else toast.error('Failed to save');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const addMapping = () => {
    if (!newLabel.trim()) return;
    setMapping(prev => ({ ...prev, [newLabel.trim()]: newStatus }));
    setNewLabel('');
  };

  const removeMapping = (label) => {
    setMapping(prev => {
      const copy = { ...prev };
      delete copy[label];
      return copy;
    });
  };

  const updateMappingStatus = (label, status) => {
    setMapping(prev => ({ ...prev, [label]: status }));
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('admin.statusMapping', 'Status Label Mapping')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('admin.statusMappingDesc', 'Map Monday.com status labels to app delivery statuses. When a subitem status changes, the webhook uses this mapping.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing mappings */}
          {Object.entries(mapping).map(([label, status]) => (
            <div key={label} className="flex items-center gap-2">
              <Input
                value={label}
                readOnly
                className="flex-1 text-sm bg-muted"
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                value={status}
                onChange={(e) => updateMappingStatus(label, e.target.value)}
                className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-background"
              >
                {availableStatuses.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => removeMapping(label)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}

          {/* Add new mapping */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Monday.com label (e.g., En Proceso)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addMapping()}
            />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-background"
            >
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" onClick={addMapping}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Available App Statuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {availableStatuses.map(s => (
              <Badge key={s} className={`${STATUS_COLORS[s] || 'bg-gray-100'} text-[10px]`}>
                {s.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t('admin.saveMapping', 'Save Status Mapping')}
      </Button>
    </div>
  );
}
