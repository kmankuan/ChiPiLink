import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { STORE_ENDPOINTS, buildUrl } from '@/config/api';
import {
  Search,
  ShoppingCart,
  Loader2,
  Store,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  Home,
  BookOpen,
  GraduationCap,
  Lock,
  User,
  ClipboardList,
  UserPlus,
  Users,
  CheckCircle,
  FileText
} from 'lucide-react';
import FloatingStoreNav from '@/components/store/FloatingStoreNav';
import CategoryLanding from '@/components/store/CategoryLanding';
import CompraExclusiva from '@/modules/account/linking/LinkingPage';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default category icons mapping
const categoryIcons = {
  'libros': '📚',
  'snacks': '🍫',
  'bebidas': '🥤',
  'preparados': '🌭',
  'uniformes': '👕',
  'servicios': '🔧'
};

// Compra Exclusiva Section Component - Student-centered view
function CompraExclusivaSection({ catalogoPrivadoAcceso, onBack, onRefreshAccess }) {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const [view, setView] = useState('students'); // 'students', 'textbooks', 'linking'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentOrders, setStudentOrders] = useState({});
  const [textbooks, setTextbooks] = useState([]);
  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState({});
  
  // Dynamic form fields
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingFile, setUploadingFile] = useState(null);

  // Get current language
  const lang = i18n.language || 'es';

  // Fetch form fields configuration
  useEffect(() => {
    fetchFormFields();
  }, []);

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
    if (catalogoPrivadoAcceso?.estudiantes?.length > 0) {
      fetchStudentOrders();
    }
  }, [catalogoPrivadoAcceso]);

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
    try {
      // Get or create order for this student - returns available books
      const response = await axios.get(
        `${API_URL}/api/store/textbook-orders/student/${student.student_id || student.sync_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const order = response.data;
      const books = order.items || [];
      
      // Transform items to book format
      const transformedBooks = books.map(item => ({
        book_id: item.book_id,
        name: item.book_name,
        book_name: item.book_name,
        subject: item.subject,
        price: item.price,
        already_ordered: item.quantity_ordered > 0 && order.status === 'submitted'
      }));
      
      setTextbooks(transformedBooks);
      
      // Initialize selected books (only those not already ordered)
      const initialSelected = {};
      transformedBooks.forEach(book => {
        if (!book.already_ordered) {
          initialSelected[book.book_id] = false;
        }
      });
      setSelectedBooks(initialSelected);
    } catch (error) {
      console.error('Error fetching textbooks:', error);
      toast.error('Error al cargar los libros');
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
      toast.error('Selecciona al menos un libro');
      return;
    }

    // Validate required form fields
    for (const field of formFields) {
      if (field.required && !formData[field.field_id]) {
        toast.error(`El campo "${getLocalizedText(field, 'label')}" es requerido`);
        return;
      }
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

      await axios.post(
        `${API_URL}/api/store/textbook-orders/submit`,
        {
          student_id: selectedStudent.student_id,
          items: orderItems,
          form_data: formData,
          uploaded_files: uploadedFiles
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Pedido enviado exitosamente');
      fetchStudentOrders();
      setView('students');
      // Reset form data
      setFormData({});
      setUploadedFiles({});
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.detail || 'Error al enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const getStudentOrderStatus = (studentId) => {
    const orders = studentOrders[studentId] || [];
    if (orders.length === 0) return { status: 'pending', label: 'Pendiente de ordenar', count: 0, total: 0 };
    
    const latestOrder = orders[0];
    const itemCount = latestOrder.items?.filter(i => i.quantity_ordered > 0).length || 0;
    const total = latestOrder.items?.reduce((sum, i) => sum + (i.quantity_ordered * (i.price || 0)), 0) || 0;
    
    return {
      status: 'ordered',
      label: `Pedido enviado`,
      count: itemCount,
      total: total,
      order: latestOrder
    };
  };

  // Linking View
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
          Volver a estudiantes
        </Button>
        <CompraExclusiva embedded={true} onStudentLinked={() => {
          onRefreshAccess();
          setView('students');
        }} />
      </>
    );
  }

  // Textbooks View for selected student
  if (view === 'textbooks' && selectedStudent) {
    const orderStatus = getStudentOrderStatus(selectedStudent.student_id);
    const availableBooks = textbooks.filter(b => !b.already_ordered);
    const orderedBooks = textbooks.filter(b => b.already_ordered);
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
          Volver a estudiantes
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
                  <CardTitle className="text-lg">{selectedStudent.nombre}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Grado {selectedStudent.grade} • {selectedStudent.school_name || 'PCA'}
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
                  Libros ya ordenados ({orderedBooks.length})
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
                        </div>
                      </div>
                      <span className="font-semibold text-green-700">${book.price?.toFixed(2)}</span>
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
                  Libros disponibles para ordenar ({availableBooks.length})
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

                {/* Dynamic Form Fields */}
                {formFields.length > 0 && (
                  <div className="mt-6 space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Información Adicional
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
                              <option value="">-- Seleccionar --</option>
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

                {/* Submit Button */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selectedCount} libro{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
                      </p>
                      <p className="font-semibold">Total: ${selectedTotal.toFixed(2)}</p>
                    </div>
                    <Button 
                      onClick={handleSubmitOrder}
                      disabled={selectedCount === 0 || submitting}
                      className="gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardList className="h-4 w-4" />
                      )}
                      Enviar Pedido
                    </Button>
                  </div>
                </div>
              </>
            ) : orderedBooks.length > 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="font-semibold text-green-700">¡Todos los libros han sido ordenados!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Si necesitas ordenar más, solicita habilitación al administrador.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay libros disponibles para este grado</p>
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
      {/* Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="font-bold">Compra Exclusiva</h3>
              <p className="text-sm text-muted-foreground">
                Gestiona los textos de tus estudiantes vinculados
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('linking')}
            className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <UserPlus className="h-4 w-4" />
            Vincular Nuevo
          </Button>
        </div>
      </div>

      {/* Students List */}
      {catalogoPrivadoAcceso?.estudiantes?.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mis Estudiantes ({catalogoPrivadoAcceso.estudiantes.length})
          </h3>
          
          {catalogoPrivadoAcceso.estudiantes.map((student) => {
            const orderStatus = getStudentOrderStatus(student.student_id || student.sync_id);
            
            return (
              <Card 
                key={student.student_id || student.sync_id}
                className="border-l-4 border-l-purple-500"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{student.nombre}</h4>
                        <p className="text-sm text-muted-foreground">
                          Grado {student.grade} • {student.school_name || 'PCA'} • Año 2026
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {orderStatus.status === 'ordered' ? (
                        <>
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {orderStatus.label}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {orderStatus.count} libros - ${orderStatus.total.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTextbooks(student)}
                          >
                            Ver Listado
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {orderStatus.label}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleViewTextbooks(student)}
                            className="gap-1"
                          >
                            <BookOpen className="h-4 w-4" />
                            Ver Listado y Ordenar
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
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No tienes estudiantes vinculados
            </p>
            <Button onClick={() => setView('linking')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular Estudiante
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default function Unatienda() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { addItem, items, openCart } = useCart();
  
  // Main state
  const [activeView, setActiveView] = useState('public'); // 'public' or 'private'
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Private catalog state
  const [catalogoPrivadoAcceso, setCatalogoPrivadoAcceso] = useState(null);
  
  // Hierarchical navigation state (for public catalog)
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  const [showLandingView, setShowLandingView] = useState(true);
  
  const [addedItems, setAddedItems] = useState({});

  // Read category and search from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const search = params.get('search');
    const tab = params.get('tab');
    
    if (categoria) setSelectedCategoria(categoria);
    if (search) setSearchTerm(decodeURIComponent(search));
    if (tab === 'private') setActiveView('private');
    
    // Clean up URL
    if (categoria || search || tab) {
      window.history.replaceState({}, '', '/unatienda');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Check private catalog access when user changes
  useEffect(() => {
    if (isAuthenticated && token) {
      checkPrivateCatalogAccess();
    } else {
      setCatalogoPrivadoAcceso(null);
    }
  }, [isAuthenticated, token]);

  const fetchData = async () => {
    try {
      const [productsRes, storeRes, categoriasRes, gradosRes] = await Promise.all([
        axios.get(`${API_URL}/api/store/products`),
        axios.get(`${API_URL}/api/platform-store`),
        axios.get(buildUrl(STORE_ENDPOINTS.categories)),
        axios.get(`${API_URL}/api/store/products/grades`)
      ]);
      
      // Filter only public products (not private catalog)
      const allProducts = productsRes.data || [];
      const publicProducts = allProducts.filter(p => !p.is_private_catalog);
      setProducts(publicProducts);
      setStoreInfo(storeRes.data);
      setCategorias(categoriasRes.data || []);
      setGrados(gradosRes.data.grades || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPrivateCatalogAccess = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/store/catalogo-privado/acceso`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogoPrivadoAcceso(response.data);
    } catch (error) {
      console.error('Error checking private catalog access:', error);
      setCatalogoPrivadoAcceso({ tiene_acceso: false, estudiantes: [], grados: [] });
    }
  };

  // Filter products based on hierarchical selection (public catalog)
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedCategoria) return matchesSearch;
    
    const matchesCategoria = product.categoria === selectedCategoria;
    
    if (selectedSubcategoria && selectedCategoria === 'libros') {
      const matchesGrado = product.grade === selectedSubcategoria || 
        product.grades?.includes(selectedSubcategoria);
      return matchesSearch && matchesCategoria && matchesGrado;
    }
    
    return matchesSearch && matchesCategoria;
  });

  // Navigation helpers
  const hasSubcategories = selectedCategoria === 'libros';
  const subcategories = hasSubcategories ? grados.map(g => ({ id: g, nombre: g })) : [];
  const shouldShowLanding = selectedCategoria && !selectedSubcategoria && showLandingView && !searchTerm;

  const handleSelectCategoria = (categoriaId) => {
    setSelectedCategoria(categoriaId);
    setSelectedSubcategoria(null);
    setShowLandingView(true);
  };

  const handleSelectSubcategoria = (subcategoriaId) => {
    setSelectedSubcategoria(subcategoriaId);
    setShowLandingView(false);
  };

  const handleViewAllProducts = () => setShowLandingView(false);

  const handleGoBack = () => {
    if (!showLandingView && selectedCategoria && !selectedSubcategoria) {
      setShowLandingView(true);
    } else if (selectedSubcategoria) {
      setSelectedSubcategoria(null);
      setShowLandingView(true);
    } else {
      setSelectedCategoria(null);
      setShowLandingView(true);
    }
  };

  const handleGoHome = () => {
    setSelectedCategoria(null);
    setSelectedSubcategoria(null);
    setShowLandingView(true);
  };

  const handleAddToCart = (product) => {
    if (product.inventory_quantity <= 0 && !product.is_private_catalog) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    setAddedItems(prev => ({ ...prev, [product.libro_id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.libro_id]: false }));
    }, 1500);
    toast.success('Producto agregado al carrito');
  };

  const isInCart = (libroId) => items.some(item => item.libro_id === libroId);
  const getCartQuantity = (libroId) => {
    const item = items.find(item => item.libro_id === libroId);
    return item ? item.quantity : 0;
  };

  const getStockStatus = (cantidad) => {
    if (cantidad <= 0) return { label: 'Agotado', color: 'destructive', canBuy: false };
    if (cantidad < 10) return { label: `Solo ${cantidad}`, color: 'warning', canBuy: true };
    return { label: 'Disponible', color: 'success', canBuy: true };
  };

  const getCategoryInfo = (categoriaId) => {
    const cat = categorias.find(c => c.categoria_id === categoriaId);
    return cat || { nombre: categoriaId, icono: categoryIcons[categoriaId] || '📦' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Product Card Component
  const ProductCard = ({ product, isPrivate = false }) => {
    const stockStatus = getStockStatus(product.inventory_quantity);
    const inCart = isInCart(product.libro_id);
    const cartQty = getCartQuantity(product.libro_id);
    const justAdded = addedItems[product.libro_id];
    const catInfo = isPrivate ? { nombre: 'Libro de Texto', icono: '📚' } : getCategoryInfo(product.categoria);
    
    return (
      <div
        data-testid={`product-card-${product.libro_id}`}
        className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => navigate(isPrivate ? `/unatienda/libro/${product.libro_id}` : `/unatienda/producto/${product.libro_id}`)}
      >
        {/* Product Image */}
        <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <span className="text-5xl">{catInfo.icono}</span>
          )}
        </div>
        
        {/* Private Badge */}
        {isPrivate && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-purple-600 text-xs">
              <GraduationCap className="h-3 w-3 mr-1" />
              PCA
            </Badge>
          </div>
        )}

        {/* Stock Badge */}
        {!isPrivate && (
          <div className="absolute top-3 right-3">
            <Badge 
              variant={stockStatus.color === 'success' ? 'default' : 
                       stockStatus.color === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {stockStatus.label}
            </Badge>
          </div>
        )}

        {/* Cart Quantity Badge */}
        {inCart && (
          <div className="absolute top-3 right-3">
            <Badge variant="default" className="bg-primary text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              {cartQty}
            </Badge>
          </div>
        )}

        {/* Requires Preparation Badge */}
        {product.requires_preparation && (
          <div className="absolute top-12 right-3">
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              Preparación
            </Badge>
          </div>
        )}
        
        {/* Content */}
        <div className="p-5">
          {/* Category & Grade Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isPrivate ? (
              <>
                <Badge variant="secondary" className="text-xs">
                  {product.grade}
                </Badge>
                {product.subject && (
                  <Badge variant="outline" className="text-xs">
                    {product.subject}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">{catInfo.icono}</span>
                  {catInfo.nombre}
                </Badge>
                {product.categoria === 'libros' && product.grade && (
                  <Badge variant="secondary" className="text-xs">
                    {product.grade}
                  </Badge>
                )}
              </>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.nombre}
          </h3>
          
          {/* Description or Editorial */}
          {isPrivate && product.editorial ? (
            <p className="text-sm text-muted-foreground mb-3">
              Editorial: {product.editorial}
            </p>
          ) : product.descripcion && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.descripcion}
            </p>
          )}
          
          {/* Price & Action */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div>
              {product.sale_price ? (
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${product.sale_price.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground line-through">
                    ${product.precio?.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">
                  ${product.precio?.toFixed(2)}
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                inCart ? openCart() : handleAddToCart(product);
              }}
              disabled={!isPrivate && !stockStatus.canBuy}
            >
              {justAdded ? (
                <><Check className="h-4 w-4 mr-1" /> Listo</>
              ) : inCart ? (
                <><ShoppingCart className="h-4 w-4 mr-1" /> Ver</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Agregar</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

 

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold">
                  {storeInfo?.nombre || 'Unatienda'}
                </h1>
                <p className="text-muted-foreground">
                  {storeInfo?.descripcion || 'Tu tienda de confianza'}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            {isAuthenticated && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveView('private')}
                  variant="outline"
                  className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
                >
                  <GraduationCap className="h-4 w-4" />
                  Compra Exclusiva
                  {catalogoPrivadoAcceso?.tiene_acceso && catalogoPrivadoAcceso?.estudiantes?.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-purple-200 dark:bg-purple-800 text-xs">
                      {catalogoPrivadoAcceso.estudiantes.length}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar - only show in public view */}
        {activeView === 'public' && (
          <div className="mb-6">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        )}

        {/* Back to Store button - show in private view */}
        {activeView === 'private' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('public')}
            className="mb-4 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a la tienda
          </Button>
        )}

        {/* Category Navigation - only in public view */}
        {activeView === 'public' && (
          <div className="mb-6" data-category-nav>
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                variant={!selectedCategoria ? 'default' : 'outline'}
                size="icon"
                onClick={handleGoHome}
                className="h-9 w-9 rounded-full"
                title="Inicio - Todas las categorías"
              >
                <Home className="h-4 w-4" />
              </Button>

              {(selectedCategoria || selectedSubcategoria) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="rounded-full gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Regresar
              </Button>
            )}

            {selectedCategoria && (
              <span className="text-muted-foreground/50 mx-1">|</span>
            )}

            {!selectedCategoria ? (
              <>
                {categorias.map((cat) => (
                  <Button
                    key={cat.categoria_id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectCategoria(cat.categoria_id)}
                    className="rounded-full"
                  >
                    <span className="mr-1.5">{cat.icono}</span>
                    {cat.nombre}
                  </Button>
                ))}
              </>
            ) : (
              <>
                <span className="font-semibold text-sm flex items-center gap-1">
                  {getCategoryInfo(selectedCategoria).icono} {getCategoryInfo(selectedCategoria).nombre}
                </span>
                {!showLandingView && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredProducts.length} productos
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        )}

        {/* Content - Public or Private */}
        {activeView === 'private' ? (
          <CompraExclusivaSection 
            catalogoPrivadoAcceso={catalogoPrivadoAcceso}
            onBack={() => setActiveView('public')}
            onRefreshAccess={checkPrivateCatalogAccess}
          />
        ) : (
          <>
            {/* Public Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.libro_id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Navigation Component */}
      <FloatingStoreNav
        categorias={categorias}
        grados={grados.map(g => ({ id: g, nombre: g }))}
        selectedCategoria={selectedCategoria}
        selectedSubcategoria={selectedSubcategoria}
        onSelectCategoria={handleSelectCategoria}
        onSelectSubcategoria={handleSelectSubcategoria}
        onGoHome={handleGoHome}
        onGoBack={handleGoBack}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
}
