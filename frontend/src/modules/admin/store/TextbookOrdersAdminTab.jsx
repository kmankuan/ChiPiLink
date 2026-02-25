/**
 * Textbook Orders Admin Tab
 * Admin view for managing textbook orders, statistics, and reorder requests
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import {
  Package,
  DollarSign,
  TrendingUp,
  BookOpen,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Eye,
  Users,
  BarChart3,
  Archive,
  MessageCircle,
  Printer
} from 'lucide-react';
import { useTableSelection } from '@/hooks/useTableSelection';
import { usePagination } from '@/hooks/usePagination';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TablePagination } from '@/components/shared/TablePagination';
import { BoardHeader } from '@/components/shared/BoardHeader';
import { useTranslation } from 'react-i18next';
import CrmChat from '@/components/chat/CrmChat';
import PrintDialog from '@/modules/print/PrintDialog';
import ArchiveTab from '@/components/shared/ArchiveTab';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awaiting_link', label: 'Awaiting Link' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  awaiting_link: 'bg-orange-100 text-orange-700',
  processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function TextbookOrdersAdminTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingReorders, setPendingReorders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [selectedReorder, setSelectedReorder] = useState(null);
  const [maxQuantity, setMaxQuantity] = useState(2);
  const [adminNotes, setAdminNotes] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [chatStudent, setChatStudent] = useState(null);
  const [singlePrintOpen, setSinglePrintOpen] = useState(false);
  const [archiveCount, setArchiveCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterGrade]);

  // Auto-refresh on real-time order events
  useRealtimeEvent('order_submitted', useCallback(() => fetchData(), []));
  useRealtimeEvent('order_status_changed', useCallback(() => fetchData(), []));

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterGrade !== 'all') params.append('grade', filterGrade);

      const [ordersRes, statsRes, reordersRes] = await Promise.all([
        fetch(`${API}/api/sysbook/orders/admin/all?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/sysbook/orders/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/sysbook/orders/admin/pending-reorders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      
      if (reordersRes.ok) {
        const data = await reordersRes.json();
        setPendingReorders(data.reorders || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('auth_token');
    
    try {
      const res = await fetch(`${API}/api/sysbook/orders/admin/${orderId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Order status updated');
        fetchData();
        if (selectedOrder?.order_id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        toast.error('Error updating status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const handleApproveReorder = async () => {
    if (!selectedReorder) return;
    
    const token = localStorage.getItem('auth_token');
    
    try {
      const res = await fetch(
        `${API}/api/sysbook/orders/admin/${selectedReorder.order_id}/items/${selectedReorder.item.book_id}/approve-reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            max_quantity: maxQuantity,
            admin_notes: adminNotes
          })
        }
      );

      if (res.ok) {
        toast.success('Reorder approved');
        setShowReorderDialog(false);
        setSelectedReorder(null);
        setMaxQuantity(2);
        setAdminNotes('');
        fetchData();
      } else {
        toast.error('Error approving reorder');
      }
    } catch (error) {
      toast.error('Error approving reorder');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!showArchived && order.archived) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.student_name?.toLowerCase().includes(search) ||
        order.user_name?.toLowerCase().includes(search) ||
        order.user_email?.toLowerCase().includes(search) ||
        order.order_id?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const orderSelection = useTableSelection(filteredOrders, 'order_id');
  const orderPagination = usePagination(filteredOrders, 25);
  const pageOrders = orderPagination.paginated;

  const handleBulkArchiveOrders = async () => {
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API}/api/sysbook/orders/admin/bulk-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_ids: Array.from(orderSelection.selected) }),
      });
      toast.success(`${orderSelection.count} order(s) archived`);
      orderSelection.clear();
      setConfirmArchive(false);
      fetchData();
    } catch { toast.error('Archive failed'); }
    finally { setBulkLoading(false); }
  };

  const handleBulkDeleteOrders = async () => {
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/sysbook/orders/admin/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_ids: Array.from(orderSelection.selected) }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} order(s) permanently deleted`);
      } else {
        toast.error('Delete failed');
      }
      orderSelection.clear();
      setConfirmDelete(false);
      fetchData();
    } catch { toast.error('Delete failed'); }
    finally { setBulkLoading(false); }
  };

  // Get unique grades from orders
  const grades = [...new Set(orders.map(o => o.grade).filter(Boolean))].sort();

  const [subTab, setSubTab] = useState('orders');

  return (
    <div className="space-y-3" data-testid="textbook-orders-admin">
      <BoardHeader
        title="Textbook Orders"
        icon={Package}
        subtitle="Manage orders, statistics, and reorder requests"
        tabs={[
          { value: 'orders', label: 'Orders', icon: Package },
          { value: 'stats', label: 'Statistics', icon: BarChart3 },
          { value: 'reorders', label: 'Reorders', icon: RefreshCw },
          { value: 'archived', label: 'Archived', icon: Archive, count: archiveCount || undefined },
        ]}
        activeTab={subTab}
        onTabChange={setSubTab}
        search={subTab === 'orders' ? searchTerm : undefined}
        onSearchChange={subTab === 'orders' ? setSearchTerm : undefined}
        searchPlaceholder="Search by student, user, or order ID..."
        filters={subTab === 'orders' ? [
          {
            value: filterStatus, onChange: setFilterStatus, placeholder: 'All Status', testId: 'txo-filter-status',
            options: ORDER_STATUSES.map(s => ({ value: s.value, label: s.label })),
          },
          {
            value: filterGrade, onChange: setFilterGrade, placeholder: 'All Grades', testId: 'txo-filter-grade',
            options: grades.map(g => ({ value: g, label: `Grade ${g}` })),
          },
        ] : []}
        hasActiveFilters={!!(searchTerm || filterStatus !== 'all' || filterGrade !== 'all' || showArchived)}
        onClearFilters={() => { setSearchTerm(''); setFilterStatus('all'); setFilterGrade('all'); setShowArchived(false); }}
        stats={stats ? [
          { label: 'total', value: stats.total || orders.length, color: 'blue' },
          ...(stats.by_status?.submitted > 0 ? [{ label: 'submitted', value: stats.by_status.submitted, color: 'amber', highlight: true }] : []),
          ...(stats.by_status?.processing > 0 ? [{ label: 'processing', value: stats.by_status.processing, color: 'purple' }] : []),
          ...(stats.by_status?.delivered > 0 ? [{ label: 'delivered', value: stats.by_status.delivered, color: 'green' }] : []),
          ...(pendingReorders.length > 0 ? [{ label: 'reorders', value: pendingReorders.length, color: 'red', highlight: true }] : []),
        ] : [{ label: 'orders', value: orders.length, color: 'blue' }]}
        loading={loading}
        onRefresh={fetchData}
        actions={subTab === 'orders' ? null : null}
      />

      {/* Orders Tab */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No orders found
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={orderSelection.allSelected} onCheckedChange={orderSelection.toggleAll} />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden sm:table-cell">User</TableHead>
                      <TableHead className="hidden md:table-cell">Grade</TableHead>
                      <TableHead className="hidden md:table-cell">Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageOrders.map((order) => (
                      <TableRow key={order.order_id} className={order.archived ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox checked={orderSelection.isSelected(order.order_id)}
                            onCheckedChange={() => orderSelection.toggle(order.order_id)} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.student_name}
                          <div className="text-xs text-muted-foreground sm:hidden">{order.user_email}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>
                            <p className="font-medium">{order.user_name}</p>
                            <p className="text-xs text-muted-foreground">{order.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.grade}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {order.items?.filter(i => i.quantity_ordered > 0).length || 0}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {order.submitted_at ? new Date(order.submitted_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : order.created_at ? new Date(order.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateStatus(order.order_id, value)}
                          >
                            <SelectTrigger className={`w-[110px] text-xs ${STATUS_COLORS[order.status]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChatStudent({ id: order.student_id, name: order.student_name, orderId: order.order_id })}
                              title="Messages"
                              data-testid={`admin-chat-order-${order.order_id}`}
                            >
                              <MessageCircle className="h-4 w-4 text-purple-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
              <TablePagination
                page={orderPagination.page} totalPages={orderPagination.totalPages} totalItems={orderPagination.totalItems}
                pageSize={orderPagination.pageSize} onPageChange={orderPagination.setPage} onPageSizeChange={orderPagination.setPageSize}
                canPrev={orderPagination.canPrev} canNext={orderPagination.canNext}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics Tab */}
      {subTab === 'stats' && (
        <div className="space-y-3">
          {stats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{stats.total_orders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold">
                          {(stats.orders_by_status?.submitted || 0) + (stats.orders_by_status?.processing || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reorder Requests</p>
                        <p className="text-2xl font-bold">{stats.pending_reorder_requests}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders by Grade */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Orders by Grade</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(stats.orders_by_grade || {}).map(([grade, data]) => (
                        <TableRow key={grade}>
                          <TableCell className="font-medium">Grade {grade}</TableCell>
                          <TableCell>{data.count}</TableCell>
                          <TableCell className="font-semibold">${data.revenue?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top Books */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Selling Books</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stats.top_books || []).map((book, idx) => (
                        <TableRow key={book._id || idx}>
                          <TableCell className="font-medium">{book.book_name}</TableCell>
                          <TableCell>{book.total_ordered}</TableCell>
                          <TableCell className="font-semibold">${book.revenue?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Reorder Requests Tab */}
      {subTab === 'reorders' && (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reorder Requests</CardTitle>
              <CardDescription>
                Review and approve requests from users who need to order additional copies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReorders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No pending reorder requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReorders.map((reorder, idx) => (
                      <TableRow key={`${reorder.order_id}-${reorder.item?.book_id}-${idx}`}>
                        <TableCell className="font-medium">{reorder.student_name}</TableCell>
                        <TableCell>{reorder.item?.book_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {reorder.item?.reorder_reason}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reorder.user_name}</p>
                            <p className="text-xs text-muted-foreground">{reorder.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReorder(reorder);
                              setShowReorderDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archived Orders Tab */}
      {subTab === 'archived' && (
        <ArchiveTab
          entityType="orders"
          token={localStorage.getItem('auth_token')}
          columns={[
            { key: 'student_name', label: 'Student' },
            { key: 'grade', label: 'Grade' },
            { key: 'total_amount', label: 'Total', render: (item) => `$${(item.total_amount || 0).toFixed(2)}` },
            { key: 'status', label: 'Status' },
          ]}
          idField="order_id"
          onCountChange={setArchiveCount}
          searchFields={['student_name', 'order_id']}
        />
      )}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order ID: {selectedOrder?.order_id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedOrder.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-medium">{selectedOrder.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedOrder.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">${selectedOrder.total_amount?.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Selected Items</p>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Book</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.filter(i => i.quantity_ordered > 0).map((item) => (
                        <TableRow key={item.book_id}>
                          <TableCell className="text-xs font-mono text-muted-foreground" data-testid={`item-code-${item.book_id}`}>
                            {item.book_code || '-'}
                          </TableCell>
                          <TableCell className="text-sm">{item.book_name}</TableCell>
                          <TableCell className="text-sm text-right font-medium">${item.price?.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-right">x{item.quantity_ordered}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {selectedOrder.monday_item_id && (
                <p className="text-xs text-muted-foreground">
                  Monday.com Item ID: {selectedOrder.monday_item_id}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setSinglePrintOpen(true);
              }}
              data-testid="order-detail-print-btn"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Order Print Dialog */}
      <PrintDialog
        open={singlePrintOpen}
        onOpenChange={setSinglePrintOpen}
        orderIds={selectedOrder ? [selectedOrder.order_id] : []}
        token={localStorage.getItem('auth_token')}
      />

      {/* Approve Reorder Dialog */}
      <Dialog open={showReorderDialog} onOpenChange={setShowReorderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Reorder Request</DialogTitle>
            <DialogDescription>
              Set the maximum quantity this user can order for this book
            </DialogDescription>
          </DialogHeader>
          
          {selectedReorder && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedReorder.item?.book_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Student: {selectedReorder.student_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Reason: {selectedReorder.item?.reorder_reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">New Max Quantity</label>
                <Select value={String(maxQuantity)} onValueChange={(v) => setMaxQuantity(Number(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add any notes about this approval..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReorderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveReorder}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Reorder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Bar — Archive + Delete + Print */}
      <BulkActionBar count={orderSelection.count} onClear={orderSelection.clear}
        onArchive={() => setConfirmArchive(true)}
        onDelete={() => setConfirmDelete(true)}
        loading={bulkLoading}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPrintDialogOpen(true)}
          className="gap-1.5 bg-background"
          data-testid="bulk-print-btn"
        >
          <Printer className="h-3.5 w-3.5" />
          {t('print.packageList', 'Package List')}
        </Button>
      </BulkActionBar>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={handleBulkArchiveOrders}
        title={`Archive ${orderSelection.count} order(s)?`}
        description="Archived orders are hidden from view but preserved for records. This can be reversed."
        variant="warning"
        confirmLabel="Archive"
        loading={bulkLoading}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleBulkDeleteOrders}
        title={`Permanently delete ${orderSelection.count} order(s)?`}
        description="This will permanently remove the selected orders from the database. This action CANNOT be undone."
        variant="destructive"
        confirmLabel="Delete Forever"
        loading={bulkLoading}
      />


      {/* Print Dialog */}
      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        orderIds={orderSelection.ids}
        token={localStorage.getItem('auth_token')}
      />

      {/* CRM Chat */}
      {chatStudent && (
        <CrmChat
          studentId={chatStudent.id}
          studentName={chatStudent.name}
          orderId={chatStudent.orderId}
          isOpen={!!chatStudent}
          onClose={() => setChatStudent(null)}
          isAdmin={true}
        />
      )}
    </div>
  );
}
