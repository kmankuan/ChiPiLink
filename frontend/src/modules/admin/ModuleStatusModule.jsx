/**
 * ModuleStatusModule — Admin UI for managing module lifecycle statuses
 * Allows customizing status labels, colors for each application module
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Construction, Clock, Wrench, Rocket, Info } from 'lucide-react';
import axios from 'axios';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { value: 'production', label: 'Production', icon: Rocket, color: 'bg-green-100 text-green-800' },
  { value: 'live_beta', label: 'Live Beta', icon: Construction, color: 'bg-amber-100 text-amber-800' },
  { value: 'coming_soon', label: 'Coming Soon', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-red-100 text-red-700' },
];

function ModuleRow({ moduleKey, moduleName, statusData, onChange }) {
  const currentStatus = statusData?.status || 'production';
  const customLabel = statusData?.customLabel || '';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{moduleName}</p>
        <p className="text-xs text-muted-foreground">{moduleKey}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status selector */}
        <select
          value={currentStatus}
          onChange={(e) => onChange(moduleKey, { ...statusData, status: e.target.value })}
          className="h-8 px-2 text-xs border rounded-md bg-background"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Custom label */}
        <Input
          value={customLabel}
          onChange={(e) => onChange(moduleKey, { ...statusData, customLabel: e.target.value })}
          placeholder="Custom label (optional)"
          className="h-8 w-40 text-xs"
        />

        {/* Preview */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Preview:</span>
          <ModuleStatusBadge status={currentStatus} customLabel={customLabel} size="xs" />
          {currentStatus === 'production' && (
            <span className="text-[10px] text-muted-foreground italic">no badge</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModuleStatusModule() {
  const [statuses, setStatuses] = useState({});
  const [moduleNames, setModuleNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalStatuses, setOriginalStatuses] = useState({});

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const { data } = await axios.get(`${API_URL}/api/admin/module-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(data.statuses);
      setOriginalStatuses(JSON.parse(JSON.stringify(data.statuses)));
      setModuleNames(data.module_names);
    } catch (err) {
      toast.error('Failed to load module statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (moduleKey, newData) => {
    setStatuses(prev => ({ ...prev, [moduleKey]: newData }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`${API_URL}/api/admin/module-status`, { statuses }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOriginalStatuses(JSON.parse(JSON.stringify(statuses)));
      setHasChanges(false);
      toast.success('Module statuses saved!');
    } catch (err) {
      toast.error('Failed to save module statuses');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStatuses(JSON.parse(JSON.stringify(originalStatuses)));
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const moduleKeys = Object.keys(moduleNames);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Module Status Management</CardTitle>
              <CardDescription>Control how each module appears to users on the home page</CardDescription>
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info box */}
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Status Guide</p>
              <p className="mt-0.5"><strong>Production</strong> — Stable, no badge shown. <strong>Live Beta</strong> — Active but still improving. <strong>Coming Soon</strong> — Not yet available. <strong>Maintenance</strong> — Temporarily disabled.</p>
              <p className="mt-1">Use <em>Custom label</em> to override the default status text (e.g. &quot;In Development&quot; instead of &quot;Coming Soon&quot;).</p>
            </div>
          </div>

          {/* Module list */}
          <div className="space-y-2">
            {moduleKeys.map((key) => (
              <ModuleRow
                key={key}
                moduleKey={key}
                moduleName={moduleNames[key]}
                statusData={statuses[key]}
                onChange={handleChange}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
