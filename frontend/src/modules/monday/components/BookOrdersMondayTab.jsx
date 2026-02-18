/**
 * BookOrdersMondayTab — Full configuration for the textbook order → Monday.com sync.
 * Dynamic column mapping: admin can add, remove, and customize any field mapping.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card, CardContent,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen, ShoppingCart, Layers, Save, Loader2, RefreshCw,
  ExternalLink, ArrowRight, User, Plus, X, Columns3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Suggested fields (quick-add helpers, NOT a hard limit) ─── */
const SUGGESTED = {
  orders: [
    { key: 'student', label: 'Student Name' },
    { key: 'guardian', label: 'Parent / Guardian' },
    { key: 'grade', label: 'Grade' },
    { key: 'order_id', label: 'Order ID' },
    { key: 'status', label: 'Order Status' },
    { key: 'payment_status', label: 'Payment Status' },
    { key: 'total', label: 'Total Amount' },
    { key: 'books', label: 'Books List' },
    { key: 'email', label: 'Guardian Email' },
    { key: 'phone', label: 'Guardian Phone' },
    { key: 'student_email', label: 'Student Email' },
    { key: 'student_phone', label: 'Student Phone' },
    { key: 'notes', label: 'Notes / Comments' },
    { key: 'discount', label: 'Discount' },
    { key: 'payment_code', label: 'Payment Code' },
    { key: 'date', label: 'Date' },
  ],
  orderSubitems: [
    { key: 'price', label: 'Price' },
    { key: 'status', label: 'Item Status' },
    { key: 'date', label: 'Date' },
    { key: 'code', label: 'Book Code' },
    { key: 'quantity', label: 'Quantity' },
  ],
  textbooks: [
    { key: 'code', label: 'Book Code' },
    { key: 'status', label: 'Status' },
    { key: 'stock', label: 'Stock Quantity' },
    { key: 'date', label: 'Date' },
  ],
  textbookSubitems: [
    { key: 'status', label: 'Delivery Status' },
    { key: 'date', label: 'Date Ordered' },
    { key: 'price', label: 'Price' },
  ],
};

/* ─── Dynamic Column Mapper ─── */
function DynamicColumnMapper({ mapping, onChange, columns, label, suggestedFields = [] }) {
  const [addMode, setAddMode] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newCol, setNewCol] = useState('');

  const activeKeys = Object.keys(mapping).filter(k => mapping[k]);
  const unmappedSuggestions = suggestedFields.filter(f => !mapping[f.key]);
  const labelForKey = (key) => suggestedFields.find(f => f.key === key)?.label || key;

  const addMapping = (key, colId) => {
    if (!key || !colId) return;
    onChange({ ...mapping, [key]: colId });
    setNewKey('');
    setNewCol('');
    setAddMode(false);
  };

  const removeMapping = (key) => {
    const next = { ...mapping };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>

      {/* Active mappings */}
      {activeKeys.length > 0 ? (
        <div className="space-y-1.5">
          {activeKeys.map(key => (
            <div key={key} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold">{labelForKey(key)}</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">({key})</span>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <Select value={mapping[key]} onValueChange={(v) => onChange({ ...mapping, [key]: v })}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[160px] max-w-[220px]" data-testid={`col-map-${key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{col.type}</span>
                        {col.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => removeMapping(key)} className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 shrink-0" data-testid={`remove-map-${key}`}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">No columns mapped yet. Use suggestions or add custom below.</p>
      )}

      {/* Quick-add suggestions */}
      {unmappedSuggestions.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] text-muted-foreground mb-1">Quick add:</p>
          <div className="flex flex-wrap gap-1">
            {unmappedSuggestions.map(f => (
              <button key={f.key} onClick={() => setAddMode(false) || addQuickSuggestion(f.key)}
                className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                data-testid={`suggest-${f.key}`}>
                + {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add custom mapping */}
      {addMode ? (
        <div className="flex items-end gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
          <div className="flex-1 min-w-0 space-y-1">
            <Label className="text-[10px]">Field Key</Label>
            <Input value={newKey} onChange={e => setNewKey(e.target.value.replace(/\s/g, '_').toLowerCase())}
              placeholder="e.g. order_id" className="h-7 text-xs" data-testid="new-field-key" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Label className="text-[10px]">Monday.com Column</Label>
            <Select value={newCol} onValueChange={setNewCol}>
              <SelectTrigger className="h-7 text-xs" data-testid="new-field-col">
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    <span className="font-mono text-[10px] mr-1">{col.type}</span> {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => addMapping(newKey, newCol)} disabled={!newKey || !newCol} className="h-7 text-xs gap-1 shrink-0" data-testid="confirm-add-mapping">
            <Plus className="h-3 w-3" /> Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setAddMode(false); setNewKey(''); setNewCol(''); }} className="h-7 w-7 p-0 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAddMode(true)} className="gap-1 text-xs h-7" data-testid="add-custom-mapping">
          <Plus className="h-3 w-3" /> Add Custom Field
        </Button>
      )}
    </div>
  );

  // Helper: quick add a suggested field — opens column picker inline
  function addQuickSuggestion(key) {
    // If there's only 1 unmapped column with a similar name, auto-select it
    const matchCol = columns.find(c => c.title.toLowerCase().includes(key.replace(/_/g, ' ')));
    if (matchCol) {
      addMapping(key, matchCol.id);
    } else {
      // Open the add mode pre-filled with the key
      setNewKey(key);
      setNewCol('');
      setAddMode(true);
    }
  }
}

/* ─── Board Selector ─── */
function BoardSelector({ boards, groups, boardId, groupId, onBoardChange, onGroupChange, label, description }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label || 'Board'}</Label>
        <Select value={boardId || ''} onValueChange={onBoardChange}>
          <SelectTrigger data-testid={`board-select-${label?.toLowerCase().replace(/\s/g, '-') || 'default'}`}>
            <SelectValue placeholder="Select a board..." />
          </SelectTrigger>
          <SelectContent>
            {boards.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.items_count || 0} items)</SelectItem>)}
          </SelectContent>
        </Select>
        {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
      </div>
      {groups.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Group (optional)</Label>
          <Select value={groupId || 'none'} onValueChange={v => onGroupChange(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="No specific group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All groups</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function BookOrdersMondayTab({ connected, boards: allBoards }) {
  const token = localStorage.getItem('auth_token');
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [boards, setBoards] = useState(allBoards || []);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Orders board
  const [ordersBoard, setOrdersBoard] = useState('');
  const [ordersGroup, setOrdersGroup] = useState('');
  const [ordersColumns, setOrdersColumns] = useState([]);
  const [ordersGroups, setOrdersGroups] = useState([]);
  const [ordersMapping, setOrdersMapping] = useState({});
  const [ordersSubitemsEnabled, setOrdersSubitemsEnabled] = useState(true);
  const [ordersSubitemColumns, setOrdersSubitemColumns] = useState([]);
  const [ordersSubitemMapping, setOrdersSubitemMapping] = useState({});
  const [autoSync, setAutoSync] = useState(true);
  const [postUpdate, setPostUpdate] = useState(true);

  // Textbooks board
  const [textbooksBoard, setTextbooksBoard] = useState('');
  const [textbooksColumns, setTextbooksColumns] = useState([]);
  const [textbooksMapping, setTextbooksMapping] = useState({});
  const [textbooksSubitemsEnabled, setTextbooksSubitemsEnabled] = useState(true);
  const [textbooksSubitemColumns, setTextbooksSubitemColumns] = useState([]);
  const [textbooksSubitemMapping, setTextbooksSubitemMapping] = useState({});

  useEffect(() => { loadConfig(); loadBoards(); }, []);
  useEffect(() => { if (ordersBoard) loadBoardDetails(ordersBoard, 'orders'); }, [ordersBoard]);
  useEffect(() => { if (textbooksBoard) loadBoardDetails(textbooksBoard, 'textbooks'); }, [textbooksBoard]);

  const loadBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await fetch(`${API}/api/store/monday/boards`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBoards((await res.json()).boards || []);
    } catch (e) { console.error('Error loading boards:', e); }
    finally { setLoadingBoards(false); }
  };

  const loadBoardDetails = async (boardId, target) => {
    try {
      const res = await fetch(`${API}/api/store/monday/boards/${boardId}/columns`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (target === 'orders') {
        setOrdersColumns(data.columns || []);
        setOrdersGroups(data.groups || []);
        setOrdersSubitemColumns(data.subitem_columns || []);
      } else {
        setTextbooksColumns(data.columns || []);
        setTextbooksSubitemColumns(data.subitem_columns || []);
      }
    } catch (e) { console.error('Error loading board details:', e); }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/config`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      setOrdersBoard(data.board_id || '');
      setOrdersGroup(data.group_id || '');
      setOrdersMapping(data.column_mapping || {});
      setOrdersSubitemsEnabled(data.subitems_enabled !== false);
      setOrdersSubitemMapping(data.subitem_column_mapping || {});
      setAutoSync(data.auto_sync !== false);
      setPostUpdate(data.post_update !== false);
      setTextbooksBoard(data.textbooks_board_id || '');
      setTextbooksMapping(data.textbooks_column_mapping || {});
      setTextbooksSubitemsEnabled(data.textbooks_subitems_enabled !== false);
      setTextbooksSubitemMapping(data.textbooks_subitem_column_mapping || {});
    } catch (e) { console.error('Error loading config:', e); }
  };

  const handleSave = async () => {
    if (!ordersBoard) { toast.error('Please select an Orders Board'); return; }
    setSaving(true);
    try {
      const config = {
        board_id: ordersBoard, group_id: ordersGroup,
        column_mapping: ordersMapping, subitems_enabled: ordersSubitemsEnabled,
        subitem_column_mapping: ordersSubitemMapping, auto_sync: autoSync, post_update: postUpdate,
        textbooks_board_id: textbooksBoard, textbooks_column_mapping: textbooksMapping,
        textbooks_subitems_enabled: textbooksSubitemsEnabled, textbooks_subitem_column_mapping: textbooksSubitemMapping,
      };
      const res = await fetch(`${API}/api/store/monday/config`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Error saving');
      toast.success(t('monday.mondayConfigSaved'));
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/store/monday/sync-all`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      data.error ? toast.error(data.error) : toast.success(`Synced: ${data.synced || 0}, Failed: ${data.failed || 0}`);
    } catch (e) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

  const countMapped = (mapping) => Object.values(mapping).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Workflow diagram */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="gap-1"><User className="h-3 w-3" /> Student Order</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="gap-1"><ShoppingCart className="h-3 w-3" /> Orders Board</Badge>
            <span className="text-muted-foreground">+ subitems (books)</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3" /> Textbooks Board</Badge>
            <span className="text-muted-foreground">+ subitems (students)</span>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={['orders-board', 'textbooks-board']} className="space-y-3">
        {/* ═══ ORDERS BOARD ═══ */}
        <AccordionItem value="orders-board" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="orders-board-trigger">
            <div className="flex items-center gap-2 text-left">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Orders Board</span>
              <span className="text-xs text-muted-foreground">
                {ordersBoard ? `${countMapped(ordersMapping)} columns mapped` : 'Not configured'}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <BoardSelector boards={allBoards} groups={ordersGroups} boardId={ordersBoard} groupId={ordersGroup}
              onBoardChange={setOrdersBoard} onGroupChange={setOrdersGroup} label="Orders Board"
              description="Each order creates 1 item here. The order resume is posted as an Update." />

            {ordersBoard && ordersColumns.length > 0 && (
              <DynamicColumnMapper mapping={ordersMapping} onChange={setOrdersMapping}
                columns={ordersColumns} suggestedFields={SUGGESTED.orders}
                label="Map order fields to Monday.com columns:" />
            )}

            <div className="flex flex-wrap gap-6 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch id="auto-sync" checked={autoSync} onCheckedChange={setAutoSync} />
                <Label htmlFor="auto-sync" className="text-xs">Auto-sync on status change</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="post-update" checked={postUpdate} onCheckedChange={setPostUpdate} />
                <Label htmlFor="post-update" className="text-xs">Post order resume as Update</Label>
              </div>
            </div>

            {/* Order Subitems */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Order Subitems (Books)</span>
                  <Badge variant="secondary" className="text-[10px]">1 subitem per book</Badge>
                </div>
                <Switch checked={ordersSubitemsEnabled} onCheckedChange={setOrdersSubitemsEnabled} />
              </div>
              {ordersSubitemsEnabled && ordersSubitemColumns.length > 0 && (
                <DynamicColumnMapper mapping={ordersSubitemMapping} onChange={setOrdersSubitemMapping}
                  columns={ordersSubitemColumns} suggestedFields={SUGGESTED.orderSubitems}
                  label="Map book fields to subitem columns:" />
              )}
              {ordersSubitemsEnabled && ordersSubitemColumns.length === 0 && ordersBoard && (
                <p className="text-xs text-muted-foreground">No subitem columns found. Enable subitems on this board in Monday.com.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ═══ TEXTBOOKS BOARD ═══ */}
        <AccordionItem value="textbooks-board" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="textbooks-board-trigger">
            <div className="flex items-center gap-2 text-left">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Textbooks Board</span>
              <span className="text-xs text-muted-foreground">
                {textbooksBoard ? `${countMapped(textbooksMapping)} columns mapped` : 'Not configured'}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <BoardSelector boards={allBoards} groups={[]} boardId={textbooksBoard} groupId=""
              onBoardChange={setTextbooksBoard} onGroupChange={() => {}} label="Textbooks Board"
              description="Each textbook is an item. When a student orders a book, a subitem is created under the matching textbook." />

            {textbooksBoard && textbooksColumns.length > 0 && (
              <DynamicColumnMapper mapping={textbooksMapping} onChange={setTextbooksMapping}
                columns={textbooksColumns} suggestedFields={SUGGESTED.textbooks}
                label="Map textbook fields to Monday.com columns:" />
            )}

            {/* Textbook Subitems */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Textbook Subitems (Students)</span>
                  <Badge variant="secondary" className="text-[10px]">student name = subitem</Badge>
                </div>
                <Switch checked={textbooksSubitemsEnabled} onCheckedChange={setTextbooksSubitemsEnabled} />
              </div>
              {textbooksSubitemsEnabled && textbooksSubitemColumns.length > 0 && (
                <DynamicColumnMapper mapping={textbooksSubitemMapping} onChange={setTextbooksSubitemMapping}
                  columns={textbooksSubitemColumns} suggestedFields={SUGGESTED.textbookSubitems}
                  label="Map student fields to textbook subitem columns:" />
              )}
              {textbooksSubitemsEnabled && textbooksSubitemColumns.length === 0 && textbooksBoard && (
                <p className="text-xs text-muted-foreground">No subitem columns found. Enable subitems on this board in Monday.com.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleSave} disabled={saving || !ordersBoard} data-testid="save-monday-config">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleSyncAll} disabled={syncing || !ordersBoard} data-testid="sync-all-orders">
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync All Orders Now
            </Button>
            {ordersBoard && (
              <a href={`https://view.monday.com/board/${ordersBoard}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Orders Board</Button>
              </a>
            )}
            {textbooksBoard && (
              <a href={`https://view.monday.com/board/${textbooksBoard}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Textbooks Board</Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
