/**
 * Textbook Orders Admin Tab
 * Admin view for managing textbook orders, statistics, and reorder requests
 */
import { useState, useEffect } from 'react';
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
  Archive
} from 'lucide-react';
import { useTableSelection } from '@/hooks/useTableSelection';
import { BulkActionBar } from '@/components/shared/BulkActionBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const API = process.env.REACT_APP_BACKEND_URL;

const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function TextbookOrdersAdminTab() {
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
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterGrade]);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterGrade !== 'all') params.append('grade', filterGrade);

      const [ordersRes, statsRes, reordersRes] = await Promise.all([
        fetch(`${API}/api/store/textbook-orders/admin/all?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/store/textbook-orders/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/store/textbook-orders/admin/pending-reorders`, {
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
      const res = await fetch(`${API}/api/store/textbook-orders/admin/${orderId}/status?status=${newStatus}`, {
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
        `${API}/api/store/textbook-orders/admin/${selectedReorder.order_id}/items/${selectedReorder.item.book_id}/approve-reorder`,
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

  const handleBulkArchiveOrders = async () => {
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API}/api/store/textbook-orders/admin/bulk-archive`, {
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

  // Get unique grades from orders
  const grades = [...new Set(orders.map(o => o.grade).filter(Boolean))].sort();

  return (
    <div className="space-y-6" data-testid="textbook-orders-admin">
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="reorders" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reorder Requests
            {pendingReorders.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingReorders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student, user, or order ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map(g => (
                      <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-medium">{order.student_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.user_name}</p>
                            <p className="text-xs text-muted-foreground">{order.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.grade}</TableCell>
                        <TableCell>
                          {order.items?.filter(i => i.quantity_ordered > 0).length || 0}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateStatus(order.order_id, value)}
                          >
                            <SelectTrigger className={`w-[130px] ${STATUS_COLORS[order.status]}`}>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
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
        </TabsContent>

        {/* Reorder Requests Tab */}
        <TabsContent value="reorders" className="space-y-4">
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
        </TabsContent>
      </Tabs>

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
                  <div className="space-y-2">
                    {selectedOrder.items?.filter(i => i.quantity_ordered > 0).map((item) => (
                      <div key={item.book_id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span>{item.book_name}</span>
                        <div className="text-right">
                          <span className="font-medium">${item.price?.toFixed(2)}</span>
                          <span className="text-muted-foreground ml-2">x{item.quantity_ordered}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {selectedOrder.monday_item_id && (
                <p className="text-xs text-muted-foreground">
                  Monday.com Item ID: {selectedOrder.monday_item_id}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
