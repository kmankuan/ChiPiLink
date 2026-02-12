/**
 * WalletTransactionsTab — Transaction history
 * Sensitive data: archive only (no permanent delete). Preserves financial records.
 */
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowUpCircle, ArrowDownCircle, Search, RefreshCw, Loader2, Archive
} from 'lucide-react';
import { useTableSelection } from '@/hooks/useTableSelection';
import { usePagination } from '@/hooks/usePagination';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AdminTableToolbar } from '@/components/shared/AdminTableToolbar';
import { TablePagination } from '@/components/shared/TablePagination';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WalletTransactionsTab() {
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/wallet/admin/transactions?limit=500`, { headers });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      toast.error('Error loading transactions');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase())
      || tx.user_email?.toLowerCase().includes(search.toLowerCase())
      || tx.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || tx.transaction_type === typeFilter || tx.type === typeFilter;
    const matchArchived = showArchived || !tx.archived;
    return matchSearch && matchType && matchArchived;
  });

  const pagination = usePagination(filtered, 25);
  const paginated = pagination.paginated;
  const selection = useTableSelection(paginated, 'transaction_id');

  const handleBulkArchive = () => {
    if (selection.count === 0) return;
    setConfirmArchive(true);
  };

  const executeBulkArchive = async () => {
    setBulkLoading(true);
    try {
      await axios.post(`${API_URL}/api/wallet/admin/transactions/bulk-archive`,
        { transaction_ids: Array.from(selection.selected) }, { headers });
      toast.success(`${selection.count} transaction(s) archived`);
      selection.clear();
      setConfirmArchive(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Archive failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '';

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <AdminTableToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search by user, email, or description..."
        totalCount={transactions.length}
        filteredCount={filtered.length}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        onRefresh={fetchTransactions}
        loading={loading}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="txn-type-filter">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="charge">Charges</SelectItem>
          </SelectContent>
        </Select>
      </AdminTableToolbar>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selection.allSelected}
                  onCheckedChange={selection.toggleAll}
                  data-testid="select-all-txns" />
              </TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map(tx => (
              <TableRow key={tx.transaction_id} className={tx.archived ? 'opacity-50' : ''} data-testid={`txn-row-${tx.transaction_id}`}>
                <TableCell>
                  <Checkbox checked={selection.isSelected(tx.transaction_id)}
                    onCheckedChange={() => selection.toggle(tx.transaction_id)} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                  {formatDate(tx.created_at || tx.completed_at)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{tx.user_name || 'N/A'}</p>
                    <p className="text-[11px] text-muted-foreground">{tx.user_email}</p>
                    <p className="text-[10px] text-muted-foreground sm:hidden">{formatDate(tx.created_at || tx.completed_at)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`gap-1 text-[10px] ${
                    tx.transaction_type === 'deposit' ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'
                  }`}>
                    {tx.transaction_type === 'deposit'
                      ? <><ArrowUpCircle className="h-3 w-3" /> Deposit</>
                      : <><ArrowDownCircle className="h-3 w-3" /> Charge</>}
                  </Badge>
                  {tx.archived && <Badge variant="outline" className="ml-1 text-[10px]">Archived</Badge>}
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.transaction_type === 'deposit' ? '+' : '-'}${(tx.amount || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate hidden md:table-cell">{tx.description || '\u2014'}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-[10px]">{tx.status || 'completed'}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
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

      {/* Bulk Action Bar — Archive only (no delete for financial records) */}
      <BulkActionBar count={selection.count} onClear={selection.clear}
        onArchive={handleBulkArchive}
        loading={bulkLoading} />

      {/* Confirm Archive */}
      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={executeBulkArchive}
        title={`Archive ${selection.count} transaction(s)?`}
        description="Archived transactions are hidden from view but preserved for financial records. This action can be reversed."
        variant="warning"
        confirmLabel="Archive"
        loading={bulkLoading}
      />
    </div>
  );
}
