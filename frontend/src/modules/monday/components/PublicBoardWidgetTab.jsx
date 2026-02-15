/**
 * PublicBoardWidgetTab — Admin config for the Monday.com public board widget.
 * Allows selecting a board, columns to display, style, and preview.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Loader2, Eye, Columns3 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PublicBoardWidgetTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [config, setConfig] = useState(null);
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCols, setLoadingCols] = useState(false);

  // Load config + boards
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/monday/public-board-widget/config`, { headers }).then(r => r.json()),
      fetch(`${API}/api/monday/boards`, { headers }).then(r => r.json()),
    ]).then(([cfg, bData]) => {
      setConfig(cfg);
      setBoards(bData.boards || []);
      if (cfg.board_id) loadBoardDetails(cfg.board_id);
    });
  }, []);

  const loadBoardDetails = async (boardId) => {
    if (!boardId) return;
    setLoadingCols(true);
    try {
      const [colRes, grpRes] = await Promise.all([
        fetch(`${API}/api/monday/boards/${boardId}/columns`, { headers }).then(r => r.json()),
        fetch(`${API}/api/monday/boards/${boardId}/groups`, { headers }).then(r => r.json()),
      ]);
      setColumns(colRes.columns || []);
      setGroups(grpRes.groups || []);
    } catch {
      toast.error('Failed to load board details');
    }
    setLoadingCols(false);
  };

  const handleBoardChange = (boardId) => {
    const board = boards.find(b => String(b.id) === String(boardId));
    setConfig(prev => ({
      ...prev,
      board_id: boardId,
      board_name: board?.name || '',
      columns_to_show: [],
      group_filter: null,
    }));
    loadBoardDetails(boardId);
  };

  const toggleColumn = (colId, colTitle) => {
    setConfig(prev => {
      const current = prev.columns_to_show || [];
      const exists = current.find(c => c.id === colId);
      if (exists) {
        return { ...prev, columns_to_show: current.filter(c => c.id !== colId) };
      }
      return { ...prev, columns_to_show: [...current, { id: colId, title: colTitle }] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/monday/public-board-widget/config`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) toast.success('Widget config saved');
      else toast.error('Failed to save');
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/monday/public-board-widget/refresh`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (res.ok) toast.success(`Cache refreshed: ${data.items_cached} items`);
      else toast.error(data.detail || 'Refresh failed');
    } catch {
      toast.error('Network error');
    }
    setRefreshing(false);
  };

  if (!config) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const selectedColIds = (config.columns_to_show || []).map(c => c.id);

  return (
    <div className="space-y-4" data-testid="public-board-widget-config">
      {/* Enable / Title */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Public Board Widget</CardTitle>
              <CardDescription className="text-xs">Display Monday.com board content on the landing page</CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig(p => ({ ...p, enabled: v }))}
              data-testid="widget-enabled-switch"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Widget Title</Label>
              <Input
                value={config.title || ''}
                onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
                placeholder="Projects"
                data-testid="widget-title-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={e => setConfig(p => ({ ...p, subtitle: e.target.value }))}
                placeholder="Our latest community projects"
                data-testid="widget-subtitle-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Board Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Board & Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Monday.com Board</Label>
            <Select value={config.board_id || ''} onValueChange={handleBoardChange}>
              <SelectTrigger data-testid="widget-board-select">
                <SelectValue placeholder="Select a board..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group filter */}
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Group Filter (optional)</Label>
              <Select
                value={config.group_filter || 'all'}
                onValueChange={v => setConfig(p => ({ ...p, group_filter: v === 'all' ? null : v }))}
              >
                <SelectTrigger data-testid="widget-group-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Column selection */}
          {columns.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Columns3 className="h-3 w-3" /> Columns to Display
              </Label>
              <div className="flex flex-wrap gap-1.5" data-testid="widget-column-chips">
                {columns
                  .filter(c => c.id !== 'name' && c.type !== 'auto_number')
                  .map(c => {
                    const selected = selectedColIds.includes(c.id);
                    return (
                      <Badge
                        key={c.id}
                        variant={selected ? 'default' : 'outline'}
                        className={`cursor-pointer text-[10px] transition-colors ${selected ? 'bg-emerald-600 hover:bg-emerald-700' : 'hover:bg-slate-100'}`}
                        onClick={() => toggleColumn(c.id, c.title)}
                      >
                        {c.title}
                      </Badge>
                    );
                  })}
              </div>
              {selectedColIds.length === 0 && (
                <p className="text-[10px] text-muted-foreground">Click columns to select which ones to show. If none selected, all will be shown.</p>
              )}
            </div>
          )}
          {loadingCols && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Display Style</Label>
              <Select
                value={config.display_style || 'cards'}
                onValueChange={v => setConfig(p => ({ ...p, display_style: v }))}
              >
                <SelectTrigger data-testid="widget-style-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cards">Cards</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="list">Compact List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Items</Label>
              <Input
                type="number" min={1} max={50}
                value={config.max_items || 10}
                onChange={e => setConfig(p => ({ ...p, max_items: parseInt(e.target.value) || 10 }))}
                data-testid="widget-max-items"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Refresh Interval (min)</Label>
              <Input
                type="number" min={1} max={60}
                value={config.refresh_minutes || 10}
                onChange={e => setConfig(p => ({ ...p, refresh_minutes: parseInt(e.target.value) || 10 }))}
                data-testid="widget-refresh-minutes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5" data-testid="widget-save-btn">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Configuration
        </Button>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing || !config.board_id} className="gap-1.5" data-testid="widget-refresh-btn">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh Cache
        </Button>
      </div>
    </div>
  );
}
