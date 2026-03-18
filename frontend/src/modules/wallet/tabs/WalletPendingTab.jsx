/**
 * WalletPendingTab — Admin approval/rejection of user deposit requests
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, RefreshCw, Clock, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function WalletPendingTab() {
  const token = localStorage.getItem('auth_token');
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/wallet-topups/pending?status=${filter}`, { headers });
      setItems(res.data.items || []);
      setCounts(res.data.counts || {});
    } catch (e) {
      toast.error('Error loading pending deposits');
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await axios.put(`${API}/api/wallet-topups/pending/${id}/approve`, {}, { headers });
      toast.success('Deposit approved and credited');
      fetchPending();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error approving');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setProcessing(rejectDialog);
    try {
      await axios.put(`${API}/api/wallet-topups/pending/${rejectDialog}/reject`, 
        { reason: rejectReason }, { headers });
      toast.success('Deposit rejected');
      setRejectDialog(null);
      setRejectReason('');
      fetchPending();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error rejecting');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const statusColor = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-yellow-600', f: 'pending' },
          { label: 'Approved', value: counts.approved, color: 'text-green-600', f: 'approved' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-600', f: 'rejected' },
          { label: 'Total', value: counts.total, color: 'text-slate-600', f: 'all' },
        ].map(s => (
          <Card key={s.f} className={`cursor-pointer ${filter === s.f ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter(s.f)}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Deposit Requests
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchPending} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No {filter !== 'all' ? filter : ''} deposits found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {filter === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id} data-testid={`pending-row-${item.id}`}>
                    <TableCell className="font-medium">
                      {item.user_name || item.user_email || item.user_id || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-700 flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {(item.amount || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{item.payment_method || item.method || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.source || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColor[item.status] || ''}`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    {filter === 'pending' && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(item.id)}
                          disabled={processing === item.id}
                          data-testid={`approve-${item.id}`}
                        >
                          {processing === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => setRejectDialog(item.id)}
                          disabled={processing === item.id}
                          data-testid={`reject-${item.id}`}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing === rejectDialog}>
              {processing === rejectDialog ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
