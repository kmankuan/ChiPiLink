/**
 * WalletOverviewTab — Users with wallets
 * Features: search, multi-select, bulk archive/delete, individual actions
 * Sensitive: Users are archivable; permanent delete requires confirmation
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowUpCircle, ArrowDownCircle, Search, Loader2,
  RefreshCw, DollarSign, Users, TrendingUp, Trash2, Archive
} from 'lucide-react';
import { useTableSelection } from '@/hooks/useTableSelection';
import { usePagination } from '@/hooks/usePagination';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AdminTableToolbar } from '@/components/shared/AdminTableToolbar';
import { TablePagination } from '@/components/shared/TablePagination';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WalletOverviewTab() {
  const { t } = useTranslation();
  const token = localStorage.getItem('auth_token');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, usersWithBalance: 0 });

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchArchived = showArchived || !u.archived;
    return matchSearch && matchArchived;
  });

  const selection = useTableSelection(filtered, 'user_id');
  const pagination = usePagination(filtered, 25);
  const pageItems = pagination.paginated;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wallet/admin/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = res.data.users || [];
      // Flatten wallet data into user object for easy access
      const data = raw.map(u => ({
        ...u,
        balance: u.wallet?.balance_usd || 0,
        total_deposited: u.wallet?.total_deposited || 0,
        total_spent: u.wallet?.total_spent || 0,
        is_locked: u.wallet?.is_locked || false,
      }));
      setUsers(data);
      const active = data.filter(u => !u.archived);
      setStats({
        totalUsers: active.length,
        totalBalance: active.reduce((s, u) => s + (u.balance || 0), 0),
        usersWithBalance: active.filter(u => (u.balance || 0) > 0).length,
      });
    } catch (err) {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdjust = async () => {
    if (!adjustDialog || !adjustAmount) return;
    setAdjusting(true);
    try {
      await axios.post(
        `${API_URL}/api/wallet/admin/adjust/${adjustDialog.user.user_id}`,
        { amount: parseFloat(adjustAmount), action: adjustDialog.action, description: adjustDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${adjustDialog.action === 'topup' ? 'Top up' : 'Deduction'} successful`);
      setAdjustDialog(null);
      setAdjustAmount('');
      setAdjustDescription('');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setAdjusting(false);
    }
  };

  const handleBulkAction = async (action) => {
    const ids = Array.from(selection.selected);
    setConfirmDialog({ action, ids, count: ids.length });
  };

  const executeBulkAction = async () => {
    if (!confirmDialog) return;
    setBulkLoading(true);
    const { action, ids } = confirmDialog;
    try {
      if (action === 'archive') {
        await axios.post(`${API_URL}/api/wallet/admin/users/bulk-archive`,
          { user_ids: ids }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`${ids.length} user(s) archived`);
      } else if (action === 'delete') {
        await axios.post(`${API_URL}/api/wallet/admin/users/bulk-delete`,
          { user_ids: ids }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`${ids.length} user(s) deleted permanently`);
      }
      selection.clear();
      setConfirmDialog(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk operation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSingleDelete = async (user) => {
    setConfirmDialog({ action: 'delete-single', user, ids: [user.user_id], count: 1 });
  };

  const executeSingleDelete = async () => {
    if (!confirmDialog?.user) return;
    setBulkLoading(true);
    try {
      await axios.delete(`${API_URL}/api/wallet/admin/user/${confirmDialog.user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`User ${confirmDialog.user.name || confirmDialog.user.email} deleted`);
      setConfirmDialog(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error deleting user');
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600 shrink-0" />
          <div><p className="text-xs text-muted-foreground">{t("common.users")}</p><p className="text-2xl font-bold">{stats.totalUsers}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-green-600 shrink-0" />
          <div><p className="text-xs text-muted-foreground">{t("common.totalBalance")}</p><p className="text-2xl font-bold">${stats.totalBalance.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-purple-600 shrink-0" />
          <div><p className="text-xs text-muted-foreground">{t("common.withBalance")}</p><p className="text-2xl font-bold">{stats.usersWithBalance}</p></div>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <AdminTableToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search users by name or email..."
        totalCount={users.length}
        filteredCount={filtered.length}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        onRefresh={fetchUsers}
        loading={loading}
      />

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selection.allSelected}
                  onCheckedChange={selection.toggleAll}
                  ref={(el) => { if (el) el.dataset.indeterminate = selection.someSelected; }}
                  data-testid="select-all-users" />
              </TableHead>
              <TableHead>{t("common.users")}</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="text-right">{t("common.balance")}</TableHead>
              <TableHead className="text-right hidden md:table-cell">{t("common.totalDeposited")}</TableHead>
              <TableHead className="text-right hidden md:table-cell">{t("common.totalSpent")}</TableHead>
              <TableHead className="text-center">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map(user => (
              <TableRow key={user.user_id} className={user.archived ? 'opacity-50' : ''} data-testid={`user-row-${user.user_id}`}>
                <TableCell>
                  <Checkbox checked={selection.isSelected(user.user_id)}
                    onCheckedChange={() => selection.toggle(user.user_id)}
                    data-testid={`select-user-${user.user_id}`} />
                </TableCell>
                <TableCell className="font-medium">
                  <div>{user.name || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                  {user.archived && <Badge variant="outline" className="mt-0.5 text-[10px]">{t("common.archived")}</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{user.email}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-semibold ${(user.balance || 0) > 0 ? 'text-green-600' : ''}`}>
                    ${(user.balance || 0).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm hidden md:table-cell">${(user.total_deposited || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm hidden md:table-cell">${(user.total_spent || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="outline" size="sm" className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => setAdjustDialog({ user, action: 'topup' })} data-testid={`topup-btn-${user.user_id}`}>
                      <ArrowUpCircle className="h-3 w-3" /> <span className="hidden sm:inline">{t("common.topUp")}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => setAdjustDialog({ user, action: 'deduct' })} data-testid={`deduct-btn-${user.user_id}`}>
                      <ArrowDownCircle className="h-3 w-3" /> <span className="hidden sm:inline">{t("common.deduct")}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleSingleDelete(user)} data-testid={`delete-btn-${user.user_id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageItems.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t("common.noUsersFound")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
        pageSize={pagination.pageSize} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize}
        canPrev={pagination.canPrev} canNext={pagination.canNext}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar count={selection.count} onClear={selection.clear}
        onArchive={() => handleBulkAction('archive')}
        onDelete={() => handleBulkAction('delete')}
        loading={bulkLoading} />

      {/* Adjust Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustDialog?.action === 'topup'
                ? <><ArrowUpCircle className="h-5 w-5 text-green-600" /> Top Up Wallet</>
                : <><ArrowDownCircle className="h-5 w-5 text-red-600" /> Deduct from Wallet</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{adjustDialog?.user?.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{adjustDialog?.user?.email}</p>
              <p className="text-sm">Current balance: <span className="font-bold">${(adjustDialog?.user?.balance || 0).toFixed(2)}</span></p>
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" data-testid="adjust-amount-input" />
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={adjustDescription} onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="Reason for adjustment..." rows={2} data-testid="adjust-description-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdjust} disabled={adjusting || !adjustAmount}
              variant={adjustDialog?.action === 'topup' ? 'default' : 'destructive'}
              data-testid="confirm-adjust-btn">
              {adjusting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {adjustDialog?.action === 'topup' ? 'Confirm Top Up' : 'Confirm Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog (bulk & single) */}
      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.action === 'delete-single' ? executeSingleDelete : executeBulkAction}
        title={confirmDialog?.action === 'archive' ? `Archive ${confirmDialog?.count} user(s)?`
             : confirmDialog?.action === 'delete-single' ? 'Delete User?'
             : `Permanently delete ${confirmDialog?.count} user(s)?`}
        description={confirmDialog?.action === 'archive'
          ? 'Archived users will be hidden but their data is preserved. Admins can restore them later.'
          : confirmDialog?.action === 'delete-single'
            ? `This will permanently remove ${confirmDialog?.user?.name || confirmDialog?.user?.email} and all their wallet data.`
            : 'This action cannot be undone. All selected users, wallets, and transaction history will be permanently deleted.'}
        variant={confirmDialog?.action === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmDialog?.action === 'archive' ? 'Archive' : 'Delete Permanently'}
        loading={bulkLoading}
      />
    </div>
  );
}
