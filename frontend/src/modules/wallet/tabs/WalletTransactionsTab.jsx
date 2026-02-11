/**
 * WalletTransactionsTab — All wallet transactions with filtering
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowUpCircle, ArrowDownCircle, Search, Loader2,
  RefreshCw, ChevronLeft, ChevronRight, ArrowLeftRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const PAGE_SIZE = 20;

const TYPE_COLORS = {
  deposit: 'bg-green-100 text-green-800',
  charge: 'bg-red-100 text-red-800',
  transfer: 'bg-blue-100 text-blue-800',
  refund: 'bg-amber-100 text-amber-800',
};

const TYPE_ICONS = {
  deposit: ArrowUpCircle,
  charge: ArrowDownCircle,
  transfer: ArrowLeftRight,
  refund: ArrowUpCircle,
};

export default function WalletTransactionsTab({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchUser, setSearchUser] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (searchUser) params.set('user_id', searchUser);

      const res = await axios.get(`${API_URL}/api/wallet/admin/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Error loading transactions');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchUser]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.transaction_type === filterType);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchUser} onChange={(e) => { setSearchUser(e.target.value); setPage(0); }}
            placeholder="Filter by user ID..." className="pl-10" data-testid="txn-search-input" />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
          <SelectTrigger className="w-[150px]" data-testid="txn-type-filter">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="charge">Charges</SelectItem>
            <SelectItem value="transfer">Transfers</SelectItem>
            <SelectItem value="refund">Refunds</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : filtered.map((txn) => {
                const Icon = TYPE_ICONS[txn.transaction_type] || ArrowLeftRight;
                return (
                  <TableRow key={txn.transaction_id} data-testid={`txn-row-${txn.transaction_id}`}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(txn.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{txn.user_name || txn.user_id}</p>
                        {txn.user_email && <p className="text-xs text-muted-foreground">{txn.user_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${TYPE_COLORS[txn.transaction_type] || ''}`}>
                        <Icon className="h-3 w-3" />
                        {txn.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{txn.description || '-'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span className={txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' ? 'text-green-700' : 'text-red-700'}>
                        {txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' ? '+' : '-'}${(txn.amount || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                        {txn.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total transactions</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
