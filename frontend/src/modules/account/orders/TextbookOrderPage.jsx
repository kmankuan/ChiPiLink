/**
 * Textbook Order Page
 * Allows users to view and order textbooks for their approved students
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  BookOpen,
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  Package,
  RefreshCw,
  GraduationCap,
  DollarSign,
  Ban,
  History
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package },
  out_of_stock: { label: 'Out of Stock', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: Ban },
  reorder_requested: { label: 'Reorder Requested', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  reorder_approved: { label: 'Reorder Approved', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: RefreshCw },
};

const ORDER_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', color: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function TextbookOrderPage({ embedded = false }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [order, setOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [reorderBook, setReorderBook] = useState(null);
  const [reorderReason, setReorderReason] = useState('');
  const [orderHistory, setOrderHistory] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Fetch approved students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/store/textbook-access/my-students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Filter only approved students
          const approved = (data.students || []).filter(s => s.status === 'approved');
          setStudents(approved);
          
          // Auto-select first student if only one
          if (approved.length === 1) {
            setSelectedStudent(approved[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Error loading students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [token]);

  // Fetch order when student is selected
  useEffect(() => {
    if (selectedStudent) {
      fetchOrder(selectedStudent.student_id);
    }
  }, [selectedStudent]);

  const fetchOrder = async (studentId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/store/textbook-orders/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Error loading order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Error loading textbooks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (bookId, currentQuantity) => {
    if (!order) return;
    
    const newQuantity = currentQuantity > 0 ? 0 : 1;
    
    try {
      const res = await fetch(
        `${API_URL}/api/store/textbook-orders/${order.order_id}/items/${bookId}?quantity=${newQuantity}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrder(updatedOrder);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Error updating selection');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error updating selection');
    }
  };

  const handleSubmitOrder = async () => {
    if (!order) return;
    
    // Count only NEW selections (not already ordered)
    const newSelectedItems = order.items.filter(
      i => i.quantity_ordered > 0 && i.status !== 'ordered'
    );
    
    if (newSelectedItems.length === 0) {
      toast.error('Please select at least one new textbook to order');
      return;
    }
    
    // Calculate total for new items only
    const newTotal = newSelectedItems.reduce((sum, i) => sum + (i.price * i.quantity_ordered), 0);
    
    if (!confirm(`Submit order for ${newSelectedItems.length} textbook(s)?\nTotal: $${newTotal.toFixed(2)}\n\nOnce submitted, these items will be locked. You can still order remaining items later.`)) {
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/store/textbook-orders/${order.order_id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrder(updatedOrder);
        
        const availableCount = updatedOrder.items_available || 0;
        if (availableCount > 0) {
          toast.success(`Order submitted! ${availableCount} more items available to order later.`);
        } else {
          toast.success('Order submitted successfully! We will contact you soon.');
        }
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Error submitting order');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Error submitting order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReorder = async () => {
    if (!reorderBook || !reorderReason.trim()) {
      toast.error('Please provide a reason for reordering');
      return;
    }
    
    try {
      const res = await fetch(
        `${API_URL}/api/store/textbook-orders/${order.order_id}/reorder/${reorderBook.book_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            book_id: reorderBook.book_id,
            reason: reorderReason
          })
        }
      );
      
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrder(updatedOrder);
        toast.success('Reorder request submitted. Admin will review your request.');
        setShowReorderDialog(false);
        setReorderBook(null);
        setReorderReason('');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Error requesting reorder');
      }
    } catch (error) {
      console.error('Error requesting reorder:', error);
      toast.error('Error requesting reorder');
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/store/textbook-orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrderHistory(data.orders || []);
        setShowHistoryDialog(true);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      toast.error('Error loading order history');
    }
  };

  const getItemStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.available;
  const getOrderStatusConfig = (status) => ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.draft;

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Approved Students</h3>
          <p className="text-muted-foreground">
            You need at least one approved student to order textbooks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Textbook Orders
          </h2>
          <p className="text-muted-foreground mt-1">
            Select textbooks for your student
          </p>
        </div>
        <Button variant="outline" onClick={fetchOrderHistory} className="gap-2">
          <History className="h-4 w-4" />
          Order History
        </Button>
      </div>

      {/* Student Selector */}
      {students.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <label className="font-medium whitespace-nowrap">Select Student:</label>
              <Select
                value={selectedStudent?.student_id || ''}
                onValueChange={(value) => {
                  const student = students.find(s => s.student_id === value);
                  setSelectedStudent(student);
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.student_id} value={student.student_id}>
                      {student.full_name} - Grade {student.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Content */}
      {selectedStudent && order && (
        <>
          {/* Order Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    {order.student_name}
                  </CardTitle>
                  <CardDescription>
                    Grade {order.grade} • School Year {order.year}
                  </CardDescription>
                </div>
                <Badge className={getOrderStatusConfig(order.status).color}>
                  {getOrderStatusConfig(order.status).label}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Textbook List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Textbook List</CardTitle>
              <CardDescription>
                {order.status === 'draft' 
                  ? 'Select the textbooks you want to order'
                  : 'Review your textbook selections'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : order.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No textbooks available for this grade
                </p>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const statusConfig = getItemStatusConfig(item.status);
                      const StatusIcon = statusConfig.icon;
                      // Item can be selected if: available, or reorder_approved with quantity left
                      const isSelectable = item.status === 'available' || 
                                          (item.status === 'reorder_approved' && item.quantity_ordered < item.max_quantity);
                      const isOrdered = item.status === 'ordered';
                      const canRequestReorder = isOrdered && item.quantity_ordered >= item.max_quantity;

                      return (
                        <div
                          key={item.book_id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                            isOrdered ? 'bg-blue-50/50 border-blue-200' :
                            item.quantity_ordered > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                          } ${item.status === 'out_of_stock' ? 'opacity-60' : ''}`}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            {isSelectable ? (
                              <Checkbox
                                checked={item.quantity_ordered > 0}
                                onCheckedChange={() => handleToggleItem(item.book_id, item.quantity_ordered)}
                                disabled={item.status === 'out_of_stock'}
                              />
                            ) : (
                              <div className={`h-5 w-5 rounded flex items-center justify-center ${
                                isOrdered ? 'bg-blue-500 text-white' : 
                                item.quantity_ordered > 0 ? 'bg-primary text-white' : 'bg-muted'
                              }`}>
                                {(item.quantity_ordered > 0 || isOrdered) && <CheckCircle className="h-4 w-4" />}
                              </div>
                            )}
                          </div>

                          {/* Book Info */}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{item.book_name}</h4>
                              <Badge variant="outline" className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Code: {item.book_code || 'N/A'}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold">${item.price.toFixed(2)}</p>
                            {item.quantity_ordered > 0 && (
                              <p className="text-xs text-muted-foreground">
                                x{item.quantity_ordered}
                              </p>
                            )}
                          </div>

                          {/* Reorder Button */}
                          {canRequestReorder && order.status !== 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReorderBook(item);
                                setShowReorderDialog(true);
                              }}
                              className="flex-shrink-0"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reorder
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Order Summary & Submit */}
          <Card className="sticky bottom-4 shadow-lg border-2">
            <CardContent className="py-4">
              {(() => {
                const orderedItems = order.items.filter(i => i.status === 'ordered');
                const newSelectedItems = order.items.filter(i => i.quantity_ordered > 0 && i.status !== 'ordered');
                const availableItems = order.items.filter(i => i.status === 'available' || i.status === 'reorder_approved');
                const newTotal = newSelectedItems.reduce((sum, i) => sum + (i.price * i.quantity_ordered), 0);
                const orderedTotal = orderedItems.reduce((sum, i) => sum + (i.price * i.quantity_ordered), 0);
                
                return (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      {orderedItems.length > 0 && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Already Ordered</p>
                            <p className="text-lg font-bold text-blue-600">
                              {orderedItems.length} items (${orderedTotal.toFixed(2)})
                            </p>
                          </div>
                          <Separator orientation="vertical" className="h-10 hidden sm:block" />
                        </>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">New Selection</p>
                        <p className="text-xl font-bold">
                          {newSelectedItems.length} / {availableItems.length} available
                        </p>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div>
                        <p className="text-sm text-muted-foreground">New Total</p>
                        <p className="text-2xl font-bold text-primary flex items-center">
                          <DollarSign className="h-5 w-5" />
                          {newTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {availableItems.length > 0 && (
                      <Button
                        size="lg"
                        onClick={handleSubmitOrder}
                        disabled={submitting || newSelectedItems.length === 0}
                        className="gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Submit {newSelectedItems.length > 0 ? `(${newSelectedItems.length})` : 'Order'}
                          </>
                        )}
                      </Button>
                    )}

                    {availableItems.length === 0 && orderedItems.length > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-base py-2 px-4">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        All Items Ordered
                      </Badge>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Reorder Dialog */}
      <Dialog open={showReorderDialog} onOpenChange={setShowReorderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Reorder</DialogTitle>
            <DialogDescription>
              Request to order another copy of "{reorderBook?.book_name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason for reorder *</label>
              <Textarea
                placeholder="e.g., Book was damaged, lost, need additional copy..."
                value={reorderReason}
                onChange={(e) => setReorderReason(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                An admin will review your request before you can order again.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReorderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestReorder} disabled={!reorderReason.trim()}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order History</DialogTitle>
            <DialogDescription>
              View all your previous textbook orders
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {orderHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No orders yet
              </p>
            ) : (
              <div className="space-y-4">
                {orderHistory.map((historyOrder) => (
                  <Card key={historyOrder.order_id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{historyOrder.student_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Grade {historyOrder.grade} • {historyOrder.year}
                          </p>
                        </div>
                        <Badge className={getOrderStatusConfig(historyOrder.status).color}>
                          {getOrderStatusConfig(historyOrder.status).label}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>
                          {historyOrder.items?.filter(i => i.quantity_ordered > 0).length || 0} items
                        </span>
                        <span className="font-semibold">
                          ${historyOrder.total_amount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      {historyOrder.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted: {new Date(historyOrder.submitted_at).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
