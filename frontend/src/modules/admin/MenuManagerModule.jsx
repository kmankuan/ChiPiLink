/**
 * MenuManagerModule — Admin UI to manage the backend-driven sidebar menu.
 * Features: reorder groups/items, enable/disable items, per-role visibility,
 * collapse defaults, i18n labels editing.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Settings, ChevronDown, ChevronUp, GripVertical, Eye, EyeOff,
  Save, RotateCcw, Shield, Loader2, Pencil
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function MenuManagerModule() {
  const [menu, setMenu] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/api/admin/menu`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setMenu(data);
          setRoles(data.available_roles || []);
        }
      })
      .catch(() => toast.error('Failed to load menu config'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/menu`, {
        method: 'PUT', headers,
        body: JSON.stringify({ groups: menu.groups, version: (menu.version || 1) + 1 }),
      });
      if (res.ok) { toast.success('Menu saved!'); setDirty(false); }
      else toast.error('Failed to save');
    } catch { toast.error('Save error'); }
    setSaving(false);
  };

  const reset = async () => {
    if (!window.confirm('Reset menu to defaults? This will lose all customizations.')) return;
    try {
      await fetch(`${API}/api/admin/menu/reset`, { method: 'POST', headers });
      toast.success('Menu reset');
      window.location.reload();
    } catch { toast.error('Reset failed'); }
  };

  const updateGroup = (groupIdx, field, value) => {
    setMenu(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.groups[groupIdx][field] = value;
      return copy;
    });
    setDirty(true);
  };

  const updateItem = (groupIdx, itemIdx, field, value) => {
    setMenu(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.groups[groupIdx].items[itemIdx][field] = value;
      return copy;
    });
    setDirty(true);
  };

  const moveGroup = (idx, direction) => {
    setMenu(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= copy.groups.length) return prev;
      [copy.groups[idx], copy.groups[newIdx]] = [copy.groups[newIdx], copy.groups[idx]];
      copy.groups.forEach((g, i) => g.order = i + 1);
      return copy;
    });
    setDirty(true);
  };

  const moveItem = (groupIdx, itemIdx, direction) => {
    setMenu(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const items = copy.groups[groupIdx].items;
      const newIdx = itemIdx + direction;
      if (newIdx < 0 || newIdx >= items.length) return prev;
      [items[itemIdx], items[newIdx]] = [items[newIdx], items[itemIdx]];
      items.forEach((item, i) => item.order = i + 1);
      return copy;
    });
    setDirty(true);
  };

  const toggleItemRole = (groupIdx, itemIdx, roleId) => {
    setMenu(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const item = copy.groups[groupIdx].items[itemIdx];
      if (!item.visible_roles) item.visible_roles = [];
      if (item.visible_roles.includes(roleId)) {
        item.visible_roles = item.visible_roles.filter(r => r !== roleId);
      } else {
        item.visible_roles.push(roleId);
      }
      // Empty array = visible to all
      return copy;
    });
    setDirty(true);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!menu) return <p className="text-center text-muted-foreground py-8">Failed to load menu</p>;

  return (
    <div className="space-y-4" data-testid="menu-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> Menu Manager</h2>
          <p className="text-xs text-muted-foreground">Reorder, enable/disable items, and set per-role visibility</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-600 border-amber-300">Unsaved changes</Badge>}
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Groups */}
      {menu.groups.map((group, gi) => (
        <Card key={group.id} className="overflow-hidden">
          <CardHeader className="py-2 px-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => moveGroup(gi, -1)} disabled={gi === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => moveGroup(gi, 1)} disabled={gi === menu.groups.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <CardTitle className="text-sm">{group.label?.en || group.id}</CardTitle>
                <Badge variant="outline" className="text-[10px]">{group.items.filter(i => i.enabled !== false).length}/{group.items.length}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <span>Collapsed</span>
                  <Switch checked={group.collapsed_default || false}
                    onCheckedChange={v => updateGroup(gi, 'collapsed_default', v)} />
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {group.items.map((item, ii) => {
                const visibleRoles = item.visible_roles || [];
                const isRestricted = visibleRoles.length > 0;
                return (
                  <div key={item.id}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm ${item.enabled === false ? 'opacity-40 bg-muted/20' : ''}`}>
                    {/* Reorder */}
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveItem(gi, ii, -1)} disabled={ii === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronUp className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => moveItem(gi, ii, 1)} disabled={ii === group.items.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Name */}
                    <span className="flex-1 text-xs font-medium truncate">
                      {item.label?.en || item.id}
                    </span>

                    {/* Role badges */}
                    {isRestricted && (
                      <div className="flex gap-0.5">
                        {visibleRoles.map(r => (
                          <Badge key={r} variant="outline" className="text-[8px] h-4 px-1">{r}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Edit roles button */}
                    <button onClick={() => setEditingItem({ gi, ii, item })}
                      className="text-muted-foreground hover:text-foreground" title="Edit roles & labels">
                      <Shield className="h-3.5 w-3.5" />
                    </button>

                    {/* Enable/Disable toggle */}
                    <Switch checked={item.enabled !== false}
                      onCheckedChange={v => updateItem(gi, ii, 'enabled', v)} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Edit: {editingItem.item.label?.en || editingItem.item.id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Labels */}
              <div>
                <Label className="text-xs font-bold">Labels (i18n)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['en', 'es', 'zh'].map(lang => (
                    <div key={lang}>
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang}</Label>
                      <Input className="h-7 text-xs"
                        value={editingItem.item.label?.[lang] || ''}
                        onChange={e => {
                          updateItem(editingItem.gi, editingItem.ii, 'label', {
                            ...editingItem.item.label,
                            [lang]: e.target.value
                          });
                          setEditingItem(prev => ({
                            ...prev,
                            item: { ...prev.item, label: { ...prev.item.label, [lang]: e.target.value } }
                          }));
                        }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-Role Visibility */}
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Visible to Roles
                </Label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Leave all unchecked = visible to everyone. Check specific roles to restrict.
                </p>
                <div className="space-y-1.5">
                  {roles.map(role => {
                    const checked = (editingItem.item.visible_roles || []).includes(role.role_id);
                    return (
                      <label key={role.role_id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={checked}
                          onCheckedChange={() => {
                            toggleItemRole(editingItem.gi, editingItem.ii, role.role_id);
                            setEditingItem(prev => {
                              const vr = [...(prev.item.visible_roles || [])];
                              const idx = vr.indexOf(role.role_id);
                              if (idx >= 0) vr.splice(idx, 1); else vr.push(role.role_id);
                              return { ...prev, item: { ...prev.item, visible_roles: vr } };
                            });
                          }} />
                        <span className="text-xs">{role.name || role.role_id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permission */}
              <div>
                <Label className="text-xs font-bold">Permission Key</Label>
                <Input className="h-7 text-xs mt-1" value={editingItem.item.permission || ''} readOnly
                  title="Permission keys are managed in the Roles module" />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setEditingItem(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
