/**
 * PublicBoardWidgetTab — Admin config for Monday.com public board widget.
 * Supports column selection, subitem column selection, group filtering, and display options.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Eye, Save, Columns, List, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const hdrs = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json',
});

export default function PublicBoardWidgetTab() {
  const { t } = useTranslation();
  const [config, setConfig] = useState({});
  const [boards, setBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [subColumns, setSubColumns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/monday/public-board-widget/config`, { headers: hdrs() }).then(r => r.json()),
      fetch(`${API}/api/monday/boards`, { headers: hdrs() }).then(r => r.json()),
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
      // Fetch columns, groups, and subitem columns in parallel — handle partial failures
      const [colRes, grpRes, subColRes] = await Promise.allSettled([
        fetch(`${API}/api/monday/boards/${boardId}/columns`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API}/api/monday/boards/${boardId}/groups`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API}/api/monday/boards/${boardId}/subitem-columns`, { headers: hdrs() }).then(r => r.json()),
      ]);
      if (colRes.status === 'fulfilled') setColumns(colRes.value.columns || []);
      if (grpRes.status === 'fulfilled') setGroups(grpRes.value.groups || []);
      if (subColRes.status === 'fulfilled') setSubColumns(subColRes.value.columns || []);
    } catch (e) {
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
      subitem_columns_to_show: [],
      group_filter: null,
    }));
    loadBoardDetails(boardId);
  };

  const toggleColumn = (colId, colTitle) => {
    setConfig(prev => {
      const current = prev.columns_to_show || [];
      const exists = current.some(c => (c.id || c) === colId);
      return {
        ...prev,
        columns_to_show: exists
          ? current.filter(c => (c.id || c) !== colId)
          : [...current, { id: colId, title: colTitle }],
      };
    });
  };

  const toggleSubColumn = (colId, colTitle) => {
    setConfig(prev => {
      const current = prev.subitem_columns_to_show || [];
      const exists = current.some(c => (c.id || c) === colId);
      return {
        ...prev,
        subitem_columns_to_show: exists
          ? current.filter(c => (c.id || c) !== colId)
          : [...current, { id: colId, title: colTitle }],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build column_titles map from selected columns and subcolumns
      const colTitlesMap = {};
      for (const c of (config.columns_to_show || [])) {
        if (typeof c === 'object' && c.id && c.title) colTitlesMap[c.id] = c.title;
      }
      for (const c of (config.subitem_columns_to_show || [])) {
        if (typeof c === 'object' && c.id && c.title) colTitlesMap[c.id] = c.title;
      }
      // Also include titles from columns list (for any that might not be in selections)
      for (const c of columns) { if (c.id && c.title) colTitlesMap[c.id] = c.title; }
      for (const c of subColumns) { if (c.id && c.title) colTitlesMap[c.id] = c.title; }

      const payload = { ...config, column_titles: colTitlesMap };
      const res = await fetch(`${API}/api/monday/public-board-widget/config`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success(t('monday.widgetSaved', 'Widget configuration saved'));
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/monday/public-board-widget/refresh`, {
        method: 'POST',
        headers: hdrs(),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Refreshed: ${data.items_count || 0} items cached`);
      } else toast.error('Refresh failed');
    } catch { toast.error('Refresh failed'); }
    finally { setRefreshing(false); }
  };

  const selectedCols = (config.columns_to_show || []).map(c => c.id || c);
  const selectedSubCols = (config.subitem_columns_to_show || []).map(c => c.id || c);
  const selectedSearchCols = config.search_columns || [];

  return (
    <div className="space-y-4" data-testid="public-board-widget-tab">
      {/* Enable + Board Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">{t('monday.widgetConfig', 'Public Board Widget')}</CardTitle>
              <CardDescription className="text-xs">{t('monday.widgetDesc', 'Display Monday.com board items on your landing page')}</CardDescription>
            </div>
            <Switch checked={config.enabled || false} onCheckedChange={v => setConfig(p => ({ ...p, enabled: v }))} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">{t('monday.selectBoard', 'Board')}</Label>
              <Select value={config.board_id || ''} onValueChange={handleBoardChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select board..." /></SelectTrigger>
                <SelectContent>
                  {boards.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('monday.displayStyle', 'Display Style')}</Label>
              <Select value={config.display_style || 'cards'} onValueChange={v => setConfig(p => ({ ...p, display_style: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cards">Cards</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="list">Compact List</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">{t('monday.widgetTitle', 'Widget Title')}</Label>
              <Input value={config.title || ''} onChange={e => setConfig(p => ({ ...p, title: e.target.value }))} className="mt-1" placeholder="Projects" />
            </div>
            <div>
              <Label className="text-xs">{t('monday.widgetSubtitle', 'Subtitle')}</Label>
              <Input value={config.subtitle || ''} onChange={e => setConfig(p => ({ ...p, subtitle: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* i18n: Spanish translations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-orange-600">Title (ES)</Label>
              <Input value={config.title_es || ''} onChange={e => setConfig(p => ({ ...p, title_es: e.target.value }))} className="mt-1" placeholder="Titulo en español" />
            </div>
            <div>
              <Label className="text-xs text-orange-600">Subtitle (ES)</Label>
              <Input value={config.subtitle_es || ''} onChange={e => setConfig(p => ({ ...p, subtitle_es: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* i18n: Chinese translations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-red-600">Title (ZH)</Label>
              <Input value={config.title_zh || ''} onChange={e => setConfig(p => ({ ...p, title_zh: e.target.value }))} className="mt-1" placeholder="中文标题" />
            </div>
            <div>
              <Label className="text-xs text-red-600">Subtitle (ZH)</Label>
              <Input value={config.subtitle_zh || ''} onChange={e => setConfig(p => ({ ...p, subtitle_zh: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* Search Only toggle + Search placeholder */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex items-center gap-3">
              <Switch checked={config.search_only || false} onCheckedChange={v => setConfig(p => ({ ...p, search_only: v }))} data-testid="search-only-toggle" />
              <div>
                <Label className="text-xs">{t('monday.searchOnly', 'Search-Only Mode')}</Label>
                <p className="text-[10px] text-muted-foreground">Hide items until user types a search query</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Search Placeholder (EN)</Label>
              <Input value={config.search_placeholder || ''} onChange={e => setConfig(p => ({ ...p, search_placeholder: e.target.value }))} className="mt-1" placeholder="Search..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-orange-600">Search Placeholder (ES)</Label>
              <Input value={config.search_placeholder_es || ''} onChange={e => setConfig(p => ({ ...p, search_placeholder_es: e.target.value }))} className="mt-1" placeholder="Buscar..." />
            </div>
            <div>
              <Label className="text-xs text-red-600">Search Placeholder (ZH)</Label>
              <Input value={config.search_placeholder_zh || ''} onChange={e => setConfig(p => ({ ...p, search_placeholder_zh: e.target.value }))} className="mt-1" placeholder="搜索..." />
            </div>
          </div>
          {/* Search Columns — which columns to search */}
          <div>
            <Label className="text-xs font-semibold">Search Columns</Label>
            <p className="text-[10px] text-muted-foreground mb-1.5">Select which columns the search bar filters by. If none selected, searches all columns.</p>
            <div className="flex flex-wrap gap-1.5">
              {/* Name column (always available) */}
              <button
                onClick={() => {
                  const cur = config.search_columns || [];
                  setConfig(p => ({ ...p, search_columns: cur.includes('name') ? cur.filter(c => c !== 'name') : [...cur, 'name'] }));
                }}
                className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  selectedSearchCols.includes('name') ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-border hover:border-primary/50'
                }`}
              >Name</button>
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={() => {
                    const cur = config.search_columns || [];
                    setConfig(p => ({ ...p, search_columns: cur.includes(col.id) ? cur.filter(c => c !== col.id) : [...cur, col.id] }));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                    selectedSearchCols.includes(col.id) ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-border hover:border-primary/50'
                  }`}
                >{col.title || col.id}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">{t('monday.maxItems', 'Max Items')}</Label>
              <Input type="number" min={1} max={50} value={config.max_items || 10} onChange={e => setConfig(p => ({ ...p, max_items: parseInt(e.target.value) || 10 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">{t('monday.refreshMinutes', 'Auto-refresh (minutes)')}</Label>
              <Input type="number" min={1} max={60} value={config.refresh_minutes || 10} onChange={e => setConfig(p => ({ ...p, refresh_minutes: parseInt(e.target.value) || 10 }))} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Selection */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Columns className="h-4 w-4" /> {t('monday.columnConfig', 'Item Columns')}
            </CardTitle>
            <CardDescription className="text-xs">{t('monday.columnDesc', 'Select which columns to display. Leave empty to show all.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCols ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {columns.filter(c => c.type !== 'subtasks').map(col => (
                  <Badge
                    key={col.id}
                    variant={selectedCols.includes(col.id) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleColumn(col.id, col.title)}
                    data-testid={`col-${col.id}`}
                  >
                    {col.title}
                    <span className="ml-1 text-[9px] opacity-60">({col.type})</span>
                  </Badge>
                ))}
                {columns.length === 0 && <p className="text-xs text-muted-foreground">No columns found. Click Refresh to load.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subitems Configuration */}
      {config.board_id && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <List className="h-4 w-4" /> {t('monday.subitemConfig', 'Subitems')}
                </CardTitle>
                <CardDescription className="text-xs">{t('monday.subitemDesc', 'Show subitems under each item with selected columns')}</CardDescription>
              </div>
              <Switch checked={config.show_subitems || false} onCheckedChange={v => setConfig(p => ({ ...p, show_subitems: v }))} />
            </div>
          </CardHeader>
          {config.show_subitems && (
            <CardContent>
              {loadingCols ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subColumns.map(col => (
                    <Badge
                      key={col.id}
                      variant={selectedSubCols.includes(col.id) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleSubColumn(col.id, col.title)}
                      data-testid={`subcol-${col.id}`}
                    >
                      {col.title}
                      <span className="ml-1 text-[9px] opacity-60">({col.type})</span>
                    </Badge>
                  ))}
                  {subColumns.length === 0 && <p className="text-xs text-muted-foreground">No subitem columns found. Make sure the board has subitems.</p>}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Group Filter */}
      {config.board_id && groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('monday.groupFilter', 'Group Filter')}</CardTitle>
            <CardDescription className="text-xs">{t('monday.groupDesc', 'Optionally show only items from a specific group')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={config.group_filter || 'all'} onValueChange={v => setConfig(p => ({ ...p, group_filter: v === 'all' ? null : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open('/', '_blank')} data-testid="preview-widget-btn">
          <Eye className="h-3.5 w-3.5 mr-1.5" /> {t('common.preview', 'Preview')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || !config.board_id} data-testid="refresh-widget-btn">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          {t('monday.refreshCache', 'Refresh Cache')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} data-testid="save-widget-btn">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  );
}
