/**
 * TextbookOrderView — Textbook order flow for a student
 * Extracted from Unatienda.jsx for maintainability.
 * Handles: student selection, available books listing, order submission, reorder requests.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Book, BookOpen, Check, CheckCircle, ChevronLeft, ClipboardList,
  Clock, FileText, GraduationCap, Info, Loader2, Lock, Upload,
  User, UserPlus, Users, Wallet, AlertTriangle, CreditCard
} from 'lucide-react';
import { schoolTxbTranslations } from '../constants/translations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TextbookOrderView({ privateCatalogAccess, selectedStudentId, onBack, onRefreshAccess }) {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const [view, setView] = useState(selectedStudentId ? 'textbooks' : 'students'); // 'students', 'textbooks', 'linking'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentOrders, setStudentOrders] = useState({});
  const [textbooks, setTextbooks] = useState([]);
  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState({});
  const [reorderingBook, setReorderingBook] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  // Dynamic form fields
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingFile, setUploadingFile] = useState(null);
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Get current language - use i18n translations with fallback to inline
  const lang = i18n.language || 'es';
  const te = schoolTxbTranslations[lang] || schoolTxbTranslations.es;
  
  // Auto-select student if selectedStudentId is provided
  useEffect(() => {
    if (selectedStudentId && privateCatalogAccess?.students) {
      const student = privateCatalogAccess.students.find(
        s => s.student_id === selectedStudentId || s.sync_id === selectedStudentId
      );
      if (student) {
        handleViewTextbooks(student);
      }
    }
  }, [selectedStudentId, privateCatalogAccess]);

  // Fetch form fields configuration
  useEffect(() => {
    fetchFormFields();
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    setLoadingWallet(true);
    try {
      const response = await axios.get(`${API_URL}/api/wallet/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.wallet?.balance_usd ?? 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchFormFields = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/store/order-form-config/fields`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormFields(response.data.fields || []);
      
      // Initialize form data with default values
      const initialData = {};
      (response.data.fields || []).forEach(field => {
        if (field.default_value) {
          initialData[field.field_id] = field.default_value;
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error fetching form fields:', error);
    }
  };

  // Get localized text
  const getLocalizedText = (field, key) => {
    if (lang === 'zh' && field[`${key}_zh`]) return field[`${key}_zh`];
    if (lang === 'es' && field[`${key}_es`]) return field[`${key}_es`];
    return field[key] || field[`${key}_en`] || '';
  };

  // Handle file upload
  const handleFileUpload = async (fieldId, file) => {
    if (!file) return;
    
    setUploadingFile(fieldId);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(
        `${API_URL}/api/store/order-form-config/upload-file`,
        formDataUpload,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: response.data
      }));
      setFormData(prev => ({
        ...prev,
        [fieldId]: response.data.filename
      }));
      toast.success('Archivo subido correctamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.detail || 'Error al subir archivo');
    } finally {
      setUploadingFile(null);
    }
  };

  // Fetch orders for all students
  useEffect(() => {
    if (privateCatalogAccess?.students?.length > 0) {
      fetchStudentOrders();
    }
  }, [privateCatalogAccess]);

  const fetchStudentOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/store/textbook-orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Group orders by student_id
      const ordersByStudent = {};
      (response.data.orders || []).forEach(order => {
        const studentId = order.student_id;
        if (!ordersByStudent[studentId]) {
          ordersByStudent[studentId] = [];
        }
        ordersByStudent[studentId].push(order);
      });
      setStudentOrders(ordersByStudent);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchTextbooksForStudent = async (student) => {
    setLoadingTextbooks(true);
    setTextbooks([]); // Reset textbooks
    try {
      // Get or create order for this student - returns available books
      const response = await axios.get(
        `${API_URL}/api/store/textbook-orders/student/${student.student_id || student.sync_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const order = response.data;
      const books = order.items || [];
      
      // Store the order_id for reorder requests
      setCurrentOrderId(order.order_id);
      
      // Transform items to book format
      // Check item.status === 'ordered' to determine if already ordered
      const transformedBooks = books.map(item => ({
        book_id: item.book_id,
        name: item.book_name,
        book_name: item.book_name,
        subject: item.subject,
        price: item.price,
        status: item.status,
        quantity_ordered: item.quantity_ordered || 0,
        max_quantity: item.max_quantity || 1,
        // Item is already ordered if status is 'ordered'
        already_ordered: item.status === 'ordered',
        // Item can be reordered if status is 'reorder_approved'
        can_reorder: item.status === 'reorder_approved',
        // Item has pending reorder request
        reorder_pending: item.status === 'reorder_requested'
      }));
      
      setTextbooks(transformedBooks);
      
      // Initialize selected books - include available AND reorder_approved items
      const initialSelected = {};
      transformedBooks.forEach(book => {
        if (!book.already_ordered && !book.reorder_pending) {
          initialSelected[book.book_id] = false;
        }
      });
      setSelectedBooks(initialSelected);
    } catch (error) {
      console.error('Error fetching textbooks:', error);
      const errorMsg = error.response?.data?.detail || te.loadError;
      
      // Check if it's an enrollment/approval issue
      if (errorMsg.includes('approved') || errorMsg.includes('enrollment')) {
        toast.error(te.approvalRequired);
      } else {
        toast.error(errorMsg);
      }
      setTextbooks([]);
    } finally {
      setLoadingTextbooks(false);
    }
  };

  const handleViewTextbooks = (student) => {
    setSelectedStudent(student);
    fetchTextbooksForStudent(student);
    setView('textbooks');
  };

  const handleToggleBook = (bookId) => {
    setSelectedBooks(prev => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
  };

  const handleSubmitOrder = async () => {
    const selectedBookIds = Object.entries(selectedBooks)
      .filter(([_, selected]) => selected)
      .map(([bookId]) => bookId);

    if (selectedBookIds.length === 0) {
      toast.error(te.selectAtLeastOne);
      return;
    }

    // Validate required form fields
    for (const field of formFields) {
      if (field.required && !formData[field.field_id]) {
        toast.error(`El campo "${getLocalizedText(field, 'label')}" es requerido`);
        return;
      }
    }

    // Calculate total
    const total = textbooks
      .filter(b => selectedBooks[b.book_id])
      .reduce((sum, b) => sum + (b.price || 0), 0);
    
    // Check wallet balance
    if (walletBalance !== null && walletBalance < total) {
      toast.error(te.insufficientBalance);
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = selectedBookIds.map(bookId => {
        const book = textbooks.find(b => b.book_id === bookId);
        return {
          book_id: bookId,
          book_name: book?.name || book?.book_name,
          quantity_ordered: 1,
          price: book?.price || 0
        };
      });

      const response = await axios.post(
        `${API_URL}/api/store/textbook-orders/submit`,
        {
          student_id: selectedStudent.student_id,
          items: orderItems,
          form_data: formData,
          uploaded_files: uploadedFiles,
          payment_method: "wallet"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(te.paymentSuccess || te.orderSuccess);
      // Show warnings if some items failed
      if (response.data?.warnings?.length > 0) {
        toast.warning(`${response.data.items_failed} ${te.itemsUnavailable || 'item(s) could not be processed'}`);
      }
      // Refresh wallet balance after payment
      fetchWalletBalance();
      fetchStudentOrders();
      setView('students');
      setFormData({});
      setUploadedFiles({});
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.detail || te.orderError);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reorder request
  const handleReorderRequest = async (bookId) => {
    const reason = prompt(te.reorderReason);
    if (!reason) return;
    
    setReorderingBook(bookId);
    try {
      await axios.post(
        `${API_URL}/api/store/textbook-orders/${currentOrderId}/reorder/${bookId}`,
        { reason, book_id: bookId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(te.reorderSuccess);
      // Refresh the textbooks to show updated status
      if (selectedStudent) {
        fetchTextbooksForStudent(selectedStudent);
      }
    } catch (error) {
      console.error('Error requesting reorder:', error);
      toast.error(error.response?.data?.detail || te.reorderError);
    } finally {
      setReorderingBook(null);
    }
  };

  const getStudentOrderStatus = (studentId) => {
    const orders = studentOrders[studentId] || [];
    if (orders.length === 0) return { status: 'pending', label: te.pending, count: 0, total: 0 };
    
    const latestOrder = orders[0];
    const itemCount = latestOrder.items?.filter(i => i.quantity_ordered > 0).length || 0;
    const total = latestOrder.items?.reduce((sum, i) => sum + (i.quantity_ordered * (i.price || 0)), 0) || 0;
    
    return {
      status: 'ordered',
      label: te.sent,
      count: itemCount,
      total: total,
      order: latestOrder
    };
  };

  // Linking View — redirect to My Students page
  if (view === 'linking') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('students')}
          className="mb-4 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {te.backToStudents}
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{te.linkStudent}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {te.noStudentsLinked}
            </p>
            <Button onClick={() => {
              window.location.href = '/mi-cuenta?tab=students';
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              {te.linkNew}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // Textbooks View for selected student
  if (view === 'textbooks' && selectedStudent) {
    const orderStatus = getStudentOrderStatus(selectedStudent.student_id);
    // Available books: not ordered OR reorder approved (can order again), AND not out of stock
    const availableBooks = textbooks.filter(b => (!b.already_ordered || b.can_reorder) && b.status !== 'out_of_stock');
    // Ordered books: already ordered AND not reorder approved (can't order again unless approved)
    const orderedBooks = textbooks.filter(b => b.already_ordered && !b.can_reorder);
    // Out of stock books: show separately
    const outOfStockBooks = textbooks.filter(b => b.status === 'out_of_stock' && !b.already_ordered);
    const selectedCount = Object.values(selectedBooks).filter(Boolean).length;
    const selectedTotal = textbooks
      .filter(b => selectedBooks[b.book_id])
      .reduce((sum, b) => sum + (b.price || 0), 0);

    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setView('students');
            setSelectedStudent(null);
          }}
          className="mb-4 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {te.backToStudents}
        </Button>

        {/* Student Header */}
        <Card className="mb-6 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedStudent.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {te.grade} {selectedStudent.grade} • {selectedStudent.school_name || 'PCA'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loadingTextbooks ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Already Ordered Books */}
            {orderedBooks.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {te.booksOrdered} ({orderedBooks.length})
                </h3>
                <div className="space-y-2">
                  {orderedBooks.map(book => (
                    <div 
                      key={book.book_id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">{book.name || book.book_name}</p>
                          <p className="text-sm text-muted-foreground">{book.subject}</p>
                          {book.reorder_pending && (
                            <p className="text-xs text-amber-600">{te.reorderPending}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-700">${book.price?.toFixed(2)}</span>
                        {!book.reorder_pending && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReorderRequest(book.book_id)}
                            disabled={reorderingBook === book.book_id}
                            className="text-xs"
                          >
                            {reorderingBook === book.book_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              te.reorderButton
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Books to Order */}
            {availableBooks.length > 0 ? (
              <>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {te.booksAvailable} ({availableBooks.length})
                </h3>
                <div className="space-y-2 mb-6">
                  {availableBooks.map(book => (
                    <div 
                      key={book.book_id}
                      onClick={() => handleToggleBook(book.book_id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBooks[book.book_id]
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                          : 'bg-card hover:bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedBooks[book.book_id]
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedBooks[book.book_id] && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{book.name || book.book_name}</p>
                          <p className="text-sm text-muted-foreground">{book.subject}</p>
                        </div>
                      </div>
                      <span className="font-semibold">${book.price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Out of Stock Books */}
                {outOfStockBooks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {te.outOfStock || 'Out of Stock'} ({outOfStockBooks.length})
                    </h3>
                    <div className="space-y-2">
                      {outOfStockBooks.map(book => (
                        <div
                          key={book.book_id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 border-border opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center opacity-50" />
                            <div>
                              <p className="font-medium text-muted-foreground">{book.name || book.book_name}</p>
                              <p className="text-sm text-muted-foreground">{book.subject}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-muted-foreground">${book.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Form Fields */}
                {formFields.length > 0 && (
                  <div className="mt-6 space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {te.additionalInfo}
                    </h4>
                    {formFields.map(field => (
                      <div key={field.field_id} className="space-y-2">
                        {/* Info field - display only */}
                        {field.field_type === 'info' && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                              {getLocalizedText(field, 'label')}
                            </p>
                            <div className="text-sm whitespace-pre-line">
                              {getLocalizedText(field, 'content')}
                            </div>
                          </div>
                        )}

                        {/* Text input */}
                        {field.field_type === 'text' && (
                          <div>
                            <Label>
                              {getLocalizedText(field, 'label')}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                              value={formData[field.field_id] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.field_id]: e.target.value }))}
                              placeholder={getLocalizedText(field, 'placeholder')}
                            />
                            {field.help_text && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {getLocalizedText(field, 'help_text')}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Textarea */}
                        {field.field_type === 'textarea' && (
                          <div>
                            <Label>
                              {getLocalizedText(field, 'label')}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Textarea
                              value={formData[field.field_id] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.field_id]: e.target.value }))}
                              placeholder={getLocalizedText(field, 'placeholder')}
                              rows={3}
                            />
                          </div>
                        )}

                        {/* File upload */}
                        {field.field_type === 'file' && (
                          <div>
                            <Label>
                              {getLocalizedText(field, 'label')}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept={field.allowed_extensions?.join(',')}
                                onChange={(e) => handleFileUpload(field.field_id, e.target.files?.[0])}
                                disabled={uploadingFile === field.field_id}
                                className="flex-1"
                              />
                              {uploadingFile === field.field_id && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              {uploadedFiles[field.field_id] && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            {field.help_text && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {getLocalizedText(field, 'help_text')}
                              </p>
                            )}
                            {uploadedFiles[field.field_id] && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {uploadedFiles[field.field_id].original_name}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Checkbox */}
                        {field.field_type === 'checkbox' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData[field.field_id] || false}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.field_id]: e.target.checked }))}
                              className="h-4 w-4"
                            />
                            <Label>
                              {getLocalizedText(field, 'label')}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                          </div>
                        )}

                        {/* Select */}
                        {field.field_type === 'select' && field.options && (
                          <div>
                            <Label>
                              {getLocalizedText(field, 'label')}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <select
                              value={formData[field.field_id] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.field_id]: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg bg-background"
                            >
                              <option value="">{te.select}</option>
                              {field.options.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {lang === 'zh' && opt.label_zh ? opt.label_zh : 
                                   lang === 'es' && opt.label_es ? opt.label_es : opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Wallet Balance & Payment Section */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t space-y-3">
                  {/* Wallet Balance Card */}
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    walletBalance !== null && walletBalance >= selectedTotal
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Wallet className={`h-4 w-4 ${
                        walletBalance !== null && walletBalance >= selectedTotal
                          ? 'text-green-600' : 'text-amber-600'
                      }`} />
                      <span className="text-sm font-medium" data-testid="wallet-balance-label">
                        {te.walletBalance}:
                      </span>
                    </div>
                    <span className={`font-bold ${
                      walletBalance !== null && walletBalance >= selectedTotal
                        ? 'text-green-700' : 'text-amber-700'
                    }`} data-testid="wallet-balance-amount">
                      {loadingWallet ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `$${(walletBalance ?? 0).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Insufficient Balance Warning */}
                  {selectedCount > 0 && walletBalance !== null && walletBalance < selectedTotal && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800" data-testid="insufficient-balance-warning">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {te.insufficientBalance}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {te.insufficientBalanceMsg}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Summary + Pay Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selectedCount} {te.booksSelected}
                      </p>
                      <p className="font-semibold">{te.total}: ${selectedTotal.toFixed(2)}</p>
                    </div>
                    <Button 
                      onClick={handleSubmitOrder}
                      disabled={
                        selectedCount === 0 || 
                        submitting || 
                        loadingWallet ||
                        (walletBalance !== null && walletBalance < selectedTotal)
                      }
                      className="gap-2"
                      data-testid="pay-with-wallet-btn"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {te.payWithWallet}
                    </Button>
                  </div>
                </div>
              </>
            ) : orderedBooks.length > 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="font-semibold text-green-700">{te.allBooksOrdered}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {te.requestMoreInfo}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{te.noBooksAvailable}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </>
    );
  }

  // Main Students View
  return (
    <>
      {/* Header - Compact on mobile */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">{te.exclusivePurchase}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {te.yourStudentsBooks}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('linking')}
            className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0 text-xs sm:text-sm px-2 sm:px-3"
          >
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{te.linkNew.split(' ')[0]}</span> {te.linkNew.split(' ')[1] || ''}
          </Button>
        </div>
      </div>

      {/* Students List */}
      {privateCatalogAccess?.students?.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            {te.myStudents} ({privateCatalogAccess.students.length})
          </h3>
          
          {privateCatalogAccess.students.map((student) => {
            const orderStatus = getStudentOrderStatus(student.student_id || student.sync_id);
            
            return (
              <Card 
                key={student.student_id || student.sync_id}
                className="border-l-4 border-l-purple-500"
              >
                <CardContent className="p-3 sm:p-4">
                  {/* Mobile: Stack layout, Desktop: Row layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Student Info */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{student.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {te.grade} {student.grade} • {student.school_name || 'PCA'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status and Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-8 sm:pl-0">
                      {orderStatus.status === 'ordered' ? (
                        <>
                          <div className="text-left sm:text-right">
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {te.sent}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {orderStatus.count} {te.books} • ${orderStatus.total.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTextbooks(student)}
                            className="text-xs h-8"
                          >
                            {te.view}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {te.pending}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleViewTextbooks(student)}
                            className="gap-1 text-xs h-8"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span className="hidden xs:inline">{te.view}</span> {te.viewList.split(' ')[1] || ''}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              {te.noStudentsLinked}
            </p>
            <Button onClick={() => setView('linking')} size="sm" className="text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 mr-2" />
              {te.linkStudent}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
