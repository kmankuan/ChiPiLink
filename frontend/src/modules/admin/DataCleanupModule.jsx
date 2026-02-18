/**
 * DataCleanupModule — Admin panel for previewing & executing data cleanup.
 * Supports: by student selection, demo-only, or all test data.
 * Shows preview of affected records before executing deletion.
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Trash2, Eye, Loader2, AlertTriangle, CheckCircle2,
  ShoppingCart, MessageSquare, Users, Link2, Package, Wallet, CreditCard
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function StudentRow({ student, selected, onToggle }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
        selected ? 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800' : 'border-border hover:bg-muted/40'
      }`}
      onClick={() => onToggle(student.student_id)}
      data-testid={`cleanup-student-${student.student_id}`}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{student.student_name}</span>
          {student.is_demo && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-300 text-amber-600">demo</Badge>
          )}
          {student.crm_linked && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-300 text-purple-600">CRM</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{student.student_id}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{student.order_count} orders</p>
        <p className="text-[11px] text-muted-foreground">${student.total_amount?.toFixed(2)}</p>
      </div>
      {student.monday_item_count > 0 && (
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {student.monday_item_count} Mon
        </Badge>
      )}
      {student.wallet_txn_count > 0 && (
        <Badge variant="secondary" className="text-[10px] shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
          {student.wallet_txn_count} txns
        </Badge>
      )}
    </div>
  );
}

function PreviewPanel({ preview, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Analyzing data...</span>
      </div>
    );
  }
  if (!preview) return null;

  const sections = [
    { key: 'orders', label: 'Orders', icon: ShoppingCart, color: 'text-blue-600' },
    { key: 'crm_links', label: 'CRM Links', icon: Link2, color: 'text-purple-600' },
    { key: 'crm_messages', label: 'CRM Messages', icon: MessageSquare, color: 'text-green-600' },
    { key: 'crm_notifications', label: 'Notifications', icon: AlertTriangle, color: 'text-amber-600' },
    { key: 'students', label: 'Students', icon: Users, color: 'text-rose-600' },
    { key: 'order_messages', label: 'Order Messages', icon: Package, color: 'text-cyan-600' },
    { key: 'wallets', label: 'Wallets', icon: Wallet, color: 'text-emerald-600' },
    { key: 'wallet_transactions', label: 'Wallet Txns', icon: CreditCard, color: 'text-emerald-600' },
    { key: 'wallet_alerts', label: 'Wallet Alerts', icon: AlertTriangle, color: 'text-orange-600' },
    { key: 'users', label: 'Users', icon: Users, color: 'text-indigo-600' },
  ];

  const totalRecords = sections.reduce((sum, s) => sum + (preview[s.key]?.count || 0), 0);
  const mondayItems = (preview.orders?.monday_items_count || 0) + (preview.crm_links?.crm_monday_items_count || 0);

  return (
    <div className="space-y-3" data-testid="cleanup-preview-panel">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Eye className="h-4 w-4" /> Preview
        </h4>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-xs">{totalRecords} records</Badge>
          {mondayItems > 0 && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">{mondayItems} Monday items</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sections.map(({ key, label, icon: Icon, color }) => {
          const count = preview[key]?.count || 0;
          const note = preview[key]?.note;
          return (
            <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${count > 0 ? 'bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-900' : 'bg-muted/30 border-border'}`}>
              <Icon className={`h-4 w-4 ${count > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{label}</p>
                <p className={`text-sm font-bold ${count > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {count}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {preview.orders?.samples?.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-muted-foreground mb-1">Sample orders to delete:</p>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {preview.orders.samples.slice(0, 5).map((o) => (
              <div key={o.order_id} className="flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded text-xs">
                <span className="font-mono text-[11px]">{o.order_id}</span>
                <span>{o.student_name}</span>
                <Badge variant={o.status === 'submitted' ? 'default' : 'secondary'} className="text-[9px] h-4">
                  {o.status}
                </Badge>
                <span className="font-medium">${(o.total_amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.protected_user_ids?.length > 0 && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Admin user accounts are protected and will not be deleted ({preview.protected_user_ids.length} skipped)</span>
        </div>
      )}
    </div>
  );
}

export default function DataCleanupModule() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [demoOnly, setDemoOnly] = useState(false);
  const [deleteMondayItems, setDeleteMondayItems] = useState(true);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/cleanup/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (e) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const toggleStudent = (sid) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
    setPreview(null);
    setResult(null);
  };

  const selectAllDemo = () => {
    const demoIds = students.filter(s => s.is_demo).map(s => s.student_id);
    setSelectedIds(new Set(demoIds));
    setPreview(null);
    setResult(null);
  };

  const selectAll = () => {
    setSelectedIds(new Set(students.map(s => s.student_id)));
    setPreview(null);
    setResult(null);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (selectedIds.size === 0 && !demoOnly) {
      toast.error('Select at least one student or enable "Demo only"');
      return;
    }
    setPreviewing(true);
    setResult(null);
    try {
      const body = {};
      if (selectedIds.size > 0) body.student_ids = [...selectedIds];
      if (demoOnly) body.demo_only = true;

      const res = await fetch(`${API}/api/cleanup/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.data);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Preview failed');
      }
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!preview) {
      toast.error('Run preview first');
      return;
    }
    setExecuting(true);
    try {
      const body = { delete_monday_items: deleteMondayItems };
      if (selectedIds.size > 0) body.student_ids = [...selectedIds];
      if (demoOnly) body.demo_only = true;

      const res = await fetch(`${API}/api/cleanup/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.results);
        setPreview(null);
        toast.success('Cleanup completed');
        fetchStudents();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Cleanup failed');
      }
    } catch {
      toast.error('Cleanup failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="data-cleanup-module">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" /> Data Cleanup
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select students to clean up their orders, CRM links, messages, and Monday.com items.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={selectAllDemo} className="text-xs" data-testid="select-demo-btn">
          Select Demo
        </Button>
        <Button size="sm" variant="outline" onClick={selectAll} className="text-xs" data-testid="select-all-btn">
          Select All
        </Button>
        <Button size="sm" variant="ghost" onClick={clearSelection} className="text-xs" data-testid="clear-selection-btn">
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={deleteMondayItems} onCheckedChange={setDeleteMondayItems} />
            Delete Monday.com items
          </label>
          <Badge variant="outline" className="text-xs">{selectedIds.size} selected</Badge>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1" data-testid="cleanup-student-list">
          {students.map((s) => (
            <StudentRow
              key={s.student_id}
              student={s}
              selected={selectedIds.has(s.student_id)}
              onToggle={toggleStudent}
            />
          ))}
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No students with orders found.</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button
          onClick={handlePreview}
          disabled={previewing || (selectedIds.size === 0 && !demoOnly)}
          className="gap-1.5"
          variant="outline"
          data-testid="preview-cleanup-btn"
        >
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Preview
        </Button>
        <Button
          onClick={handleExecute}
          disabled={executing || !preview}
          variant="destructive"
          className="gap-1.5"
          data-testid="execute-cleanup-btn"
        >
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Selected Data
        </Button>
      </div>

      {/* Preview */}
      {(preview || previewing) && (
        <div className="border rounded-xl p-4 bg-card">
          <PreviewPanel preview={preview} loading={previewing} />
        </div>
      )}

      {/* Execution result */}
      {result && (
        <div className="border rounded-xl p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" data-testid="cleanup-result">
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400 mb-3">
            <CheckCircle2 className="h-4 w-4" /> Cleanup Complete
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(result).map(([key, val]) => (
              <div key={key} className="px-2 py-1.5 bg-white dark:bg-background rounded border">
                <p className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="font-bold">
                  {typeof val === 'object' ? (val.deleted ?? val.attempted ?? JSON.stringify(val)) : val}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
