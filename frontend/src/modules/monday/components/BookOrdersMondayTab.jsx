/**
 * BookOrdersMondayTab — Full configuration for the textbook order → Monday.com sync.
 * 
 * Two-board flow:
 *   1) TB2026-Orders: each order = 1 item. Subitems = ordered books.
 *   2) TB2026-Textbooks: each textbook = 1 item. Subitems = students who ordered it.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen, ShoppingCart, Layers, Save, Loader2, RefreshCw,
  ExternalLink, AlertCircle, CheckCircle2, ArrowRight,
  User, GraduationCap, Mail, Phone, DollarSign, FileText,
  Hash, CalendarDays, Tag, Columns3, Package,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Fields for the Orders board
const ORDER_FIELDS = [
  { key: 'student', label: 'Student Name', icon: User, required: true },
  { key: 'grade', label: 'Grade', icon: GraduationCap, required: true },
  { key: 'status', label: 'Order Status', icon: Tag, required: true },
  { key: 'payment_status', label: 'Payment Status', icon: DollarSign },
  { key: 'email', label: 'Guardian Email', icon: Mail },
  { key: 'phone', label: 'Guardian Phone', icon: Phone },
  { key: 'student_email', label: 'Student Email', icon: Mail },
  { key: 'student_phone', label: 'Student Phone', icon: Phone },
  { key: 'notes', label: 'Notes / Comments', icon: FileText },
  { key: 'discount', label: 'Discount', icon: DollarSign },
  { key: 'payment_code', label: 'Payment Code', icon: Hash },
  { key: 'date', label: 'Date', icon: CalendarDays },
];

// Fields for order subitems (books under each order)
const ORDER_SUBITEM_FIELDS = [
  { key: 'price', label: 'Price', icon: DollarSign, required: true },
  { key: 'status', label: 'Item Status', icon: Tag },
  { key: 'date', label: 'Date', icon: CalendarDays },
  { key: 'code', label: 'Book Code', icon: Hash },
  { key: 'quantity', label: 'Quantity', icon: Package },
];

// Fields for textbooks board columns
const TEXTBOOK_FIELDS = [
  { key: 'code', label: 'Book Code', icon: Hash, required: true },
  { key: 'status', label: 'Status', icon: Tag },
  { key: 'stock', label: 'Stock Quantity', icon: Package },
  { key: 'date', label: 'Date', icon: CalendarDays },
];

// Fields for textbook subitems (students under each textbook)
const TEXTBOOK_SUBITEM_FIELDS = [
  { key: 'status', label: 'Delivery Status', icon: Tag },
  { key: 'date', label: 'Date Ordered', icon: CalendarDays },
  { key: 'price', label: 'Price', icon: DollarSign },
];

function ColumnMapper({ fields, mapping, onChange, columns, label }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(({ key, label: fieldLabel, icon: Icon, required }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Label className="text-xs flex items-center gap-1">
                {fieldLabel}
                {required && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={mapping[key] || 'none'}
                onValueChange={(v) => onChange({ ...mapping, [key]: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="h-8 text-xs" data-testid={`col-map-${key}`}>
                  <SelectValue placeholder="— Not mapped —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not mapped —</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{col.type}</span>
                        {col.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mapping[key] && mapping[key] !== 'none' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardSelector({ boards, groups, boardId, groupId, onBoardChange, onGroupChange, loading: boardsLoading, label, description }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">{label || 'Board'}</Label>
          <Select value={boardId || ''} onValueChange={onBoardChange}>
            <SelectTrigger data-testid={`board-select-${label?.toLowerCase().replace(/\s/g, '-') || 'default'}`}>
              <SelectValue placeholder="Select a board..." />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name} ({board.items_count || 0} items)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Group (optional)</Label>
            <Select value={groupId || 'none'} onValueChange={(v) => onGroupChange(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No specific group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookOrdersMondayTab({ connected, boards: allBoards }) {
  const token = localStorage.getItem('auth_token');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [boards, setBoards] = useState(allBoards || []);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Orders board state
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

  // Textbooks board state
  const [textbooksBoard, setTextbooksBoard] = useState('');
  const [textbooksColumns, setTextbooksColumns] = useState([]);
  const [textbooksMapping, setTextbooksMapping] = useState({});
  const [textbooksSubitemsEnabled, setTextbooksSubitemsEnabled] = useState(true);
  const [textbooksSubitemColumns, setTextbooksSubitemColumns] = useState([]);
  const [textbooksSubitemMapping, setTextbooksSubitemMapping] = useState({});

  useEffect(() => { loadConfig(); loadBoards(); }, []);

  const loadBoards = async () => {
    setLoadingBoards(true);
    try {
      const res = await fetch(`${API}/api/store/monday/boards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || data || []);
      }
    } catch (e) {
      console.error('Error loading boards:', e);
    } finally {
      setLoadingBoards(false);
    }
  };

  useEffect(() => {
    if (ordersBoard) loadBoardDetails(ordersBoard, 'orders');
  }, [ordersBoard]);

  useEffect(() => {
    if (textbooksBoard) loadBoardDetails(textbooksBoard, 'textbooks');
  }, [textbooksBoard]);

  const loadBoardDetails = async (boardId, target) => {
    try {
      const res = await fetch(`${API}/api/store/monday/boards/${boardId}/columns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const cols = data.columns || [];
      const grps = data.groups || [];
      const subCols = data.subitem_columns || [];

      if (target === 'orders') {
        setOrdersColumns(cols);
        setOrdersGroups(grps);
        setOrdersSubitemColumns(subCols);
      } else {
        setTextbooksColumns(cols);
        setTextbooksSubitemColumns(subCols);
      }
    } catch (e) {
      console.error('Error loading board details:', e);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API}/api/store/monday/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

      // Textbooks board config
      setTextbooksBoard(data.textbooks_board_id || '');
      setTextbooksMapping(data.textbooks_column_mapping || {});
      setTextbooksSubitemsEnabled(data.textbooks_subitems_enabled !== false);
      setTextbooksSubitemMapping(data.textbooks_subitem_column_mapping || {});
    } catch (e) {
      console.error('Error loading config:', e);
    }
  };

  const handleSave = async () => {
    if (!ordersBoard) {
      toast.error('Select an Orders board first');
      return;
    }
    setSaving(true);
    try {
      const config = {
        board_id: ordersBoard,
        group_id: ordersGroup,
        column_mapping: ordersMapping,
        subitems_enabled: ordersSubitemsEnabled,
        subitem_column_mapping: ordersSubitemMapping,
        auto_sync: autoSync,
        post_update: postUpdate,
        textbooks_board_id: textbooksBoard,
        textbooks_column_mapping: textbooksMapping,
        textbooks_subitems_enabled: textbooksSubitemsEnabled,
        textbooks_subitem_column_mapping: textbooksSubitemMapping,
      };

      const res = await fetch(`${API}/api/store/monday/config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Error saving');
      toast.success('Monday.com configuration saved');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/store/monday/sync-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Synced: ${data.synced || 0}, Failed: ${data.failed || 0}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const mappedCount = (fields, mapping) => fields.filter(f => mapping[f.key]).length;

  if (!connected && boards.length === 0 && !loadingBoards) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Connection required</p>
              <p className="text-sm text-yellow-700">Configure a workspace first in the "Workspaces" tab, or the system will use the API key from server config.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadBoards}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {/* ========== ORDERS BOARD ========== */}
        <AccordionItem value="orders-board" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="orders-board-trigger">
            <div className="flex items-center gap-2 text-left">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <div>
                <span className="font-semibold text-sm">Orders Board</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {ordersBoard ? `${mappedCount(ORDER_FIELDS, ordersMapping)}/${ORDER_FIELDS.length} columns mapped` : 'Not configured'}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <BoardSelector
              boards={allBoards}
              groups={ordersGroups}
              boardId={ordersBoard}
              groupId={ordersGroup}
              onBoardChange={setOrdersBoard}
              onGroupChange={setOrdersGroup}
              label="Orders Board"
              description="Each order creates 1 item here. The order resume is posted as an Update."
            />

            {ordersBoard && ordersColumns.length > 0 && (
              <ColumnMapper
                fields={ORDER_FIELDS}
                mapping={ordersMapping}
                onChange={setOrdersMapping}
                columns={ordersColumns}
                label="Map order fields to Monday.com columns:"
              />
            )}

            {/* Options */}
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

            {/* Order Subitems (Books) */}
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
                <ColumnMapper
                  fields={ORDER_SUBITEM_FIELDS}
                  mapping={ordersSubitemMapping}
                  onChange={setOrdersSubitemMapping}
                  columns={ordersSubitemColumns}
                  label="Map book fields to subitem columns:"
                />
              )}
              {ordersSubitemsEnabled && ordersSubitemColumns.length === 0 && ordersBoard && (
                <p className="text-xs text-muted-foreground">No subitem columns found. Make sure subitems are enabled on this board in Monday.com.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ========== TEXTBOOKS BOARD ========== */}
        <AccordionItem value="textbooks-board" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="textbooks-board-trigger">
            <div className="flex items-center gap-2 text-left">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <span className="font-semibold text-sm">Textbooks Board</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {textbooksBoard ? `${mappedCount(TEXTBOOK_FIELDS, textbooksMapping)}/${TEXTBOOK_FIELDS.length} columns mapped` : 'Not configured'}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <BoardSelector
              boards={allBoards}
              groups={[]}
              boardId={textbooksBoard}
              groupId=""
              onBoardChange={setTextbooksBoard}
              onGroupChange={() => {}}
              label="Textbooks Board"
              description="Each textbook is an item here. When a student orders a book, a subitem is created under the matching textbook with the student's name."
            />

            {textbooksBoard && textbooksColumns.length > 0 && (
              <ColumnMapper
                fields={TEXTBOOK_FIELDS}
                mapping={textbooksMapping}
                onChange={setTextbooksMapping}
                columns={textbooksColumns}
                label="Map textbook fields to Monday.com columns (used to find matching items by code):"
              />
            )}

            {/* Textbook Subitems (Students) */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Textbook Subitems (Students)</span>
                  <Badge variant="secondary" className="text-[10px]">student name → subitem under textbook</Badge>
                </div>
                <Switch checked={textbooksSubitemsEnabled} onCheckedChange={setTextbooksSubitemsEnabled} />
              </div>
              {textbooksSubitemsEnabled && textbooksSubitemColumns.length > 0 && (
                <ColumnMapper
                  fields={TEXTBOOK_SUBITEM_FIELDS}
                  mapping={textbooksSubitemMapping}
                  onChange={setTextbooksSubitemMapping}
                  columns={textbooksSubitemColumns}
                  label="Map student fields to textbook subitem columns:"
                />
              )}
              {textbooksSubitemsEnabled && textbooksSubitemColumns.length === 0 && textbooksBoard && (
                <p className="text-xs text-muted-foreground">No subitem columns found. Make sure subitems are enabled on this board in Monday.com.</p>
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
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Orders Board
                </Button>
              </a>
            )}
            {textbooksBoard && (
              <a href={`https://view.monday.com/board/${textbooksBoard}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Textbooks Board
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
