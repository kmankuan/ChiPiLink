import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  LayoutDashboard,
  Package,
  Book,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Printer,
  Loader2,
  Search,
  Save,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Settings,
  Sheet,
  Eye,
  Copy,
  ExternalLink,
  Palette,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  FileImage,
  User,
  Phone,
  Mail,
  Send,
  RefreshCw
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import GoogleSheetsSync from '@/components/admin/GoogleSheetsSync';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import { Layers } from 'lucide-react';

// Empty product row template
const emptyProductRow = {
  nombre: '',
  grado: '',
  materia: '',
  precio: '',
  cantidad_inventario: '',
  descripcion: '',
  isbn: '',
  editorial: ''
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { api, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState({ libros: [], alertas_bajo_stock: [] });
  const [pedidos, setPedidos] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  
  // Single product edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({...emptyProductRow});
  
  // Bulk add products dialog
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([{...emptyProductRow}]);
  const [savingBulk, setSavingBulk] = useState(false);
  
  // CSV Import
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  
  // Form configuration state
  const [formConfig, setFormConfig] = useState({
    titulo: 'Formulario de Pedido de Libros',
    descripcion: 'Complete el formulario para ordenar los libros de texto',
    mostrar_precios: true,
    metodos_pago: ['transferencia_bancaria', 'yappy'],
    mensaje_exito: '¡Gracias! Su pedido ha sido recibido.',
    color_primario: '#166534'
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Matriculas state
  const [matriculas, setMatriculas] = useState([]);
  const [matriculaFilter, setMatriculaFilter] = useState('pendiente');
  const [loadingMatriculas, setLoadingMatriculas] = useState(false);
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  const [matriculaDialog, setMatriculaDialog] = useState(false);
  const [verifyingMatricula, setVerifyingMatricula] = useState(false);

  // Get active tab from URL or default
  const activeTab = location.hash.replace('#', '') || 'overview';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [invRes, pedidosRes, gradosRes, materiasRes, configRes] = await Promise.all([
        api.get('/admin/inventario'),
        api.get('/admin/pedidos'),
        api.get('/grados'),
        api.get('/materias'),
        api.get('/admin/config-formulario')
      ]);
      
      setInventario(invRes.data);
      setPedidos(pedidosRes.data);
      setGrados(gradosRes.data.grados);
      setMaterias(materiasRes.data.materias);
      setFormConfig(configRes.data);
      setConfigLoaded(true);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };
  
  // Save form configuration
  const handleSaveFormConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/admin/config-formulario', formConfig);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSavingConfig(false);
    }
  };
  
  // Copy embed URL to clipboard
  const copyEmbedUrl = () => {
    const url = `${window.location.origin}/embed/orden`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };
  
  // Copy iframe code to clipboard
  const copyIframeCode = () => {
    const url = `${window.location.origin}/embed/orden`;
    const code = `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border: none;"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success('Código iframe copiado al portapapeles');
  };
  
  // Toggle payment method
  const togglePaymentMethod = (method) => {
    setFormConfig(prev => {
      const methods = prev.metodos_pago || [];
      if (methods.includes(method)) {
        return { ...prev, metodos_pago: methods.filter(m => m !== method) };
      } else {
        return { ...prev, metodos_pago: [...methods, method] };
      }
    });
  };

  // ========== MATRICULAS FUNCTIONS ==========
  const fetchMatriculas = async (estado = matriculaFilter) => {
    setLoadingMatriculas(true);
    try {
      const params = estado !== 'all' ? { estado } : {};
      const response = await api.get('/admin/matriculas', { params });
      setMatriculas(response.data);
    } catch (error) {
      console.error('Error fetching matriculas:', error);
      toast.error('Error al cargar matrículas');
    } finally {
      setLoadingMatriculas(false);
    }
  };

  const handleVerifyMatricula = async (accion) => {
    if (!selectedMatricula) return;
    
    setVerifyingMatricula(true);
    try {
      await api.put(
        `/admin/matriculas/${selectedMatricula.cliente_id}/${selectedMatricula.estudiante_id}/verificar?accion=${accion}`
      );
      toast.success(`Matrícula ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`);
      setMatriculaDialog(false);
      setSelectedMatricula(null);
      fetchMatriculas();
    } catch (error) {
      console.error('Error verifying matricula:', error);
      toast.error('Error al verificar matrícula');
    } finally {
      setVerifyingMatricula(false);
    }
  };

  const openMatriculaDetail = (matricula) => {
    setSelectedMatricula(matricula);
    setMatriculaDialog(true);
  };

  // Load matriculas when tab changes
  useEffect(() => {
    if (activeTab === 'matriculas') {
      fetchMatriculas();
    }
  }, [activeTab, matriculaFilter]);

  // ========== SINGLE PRODUCT EDIT ==========
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...editForm,
        precio: parseFloat(editForm.precio),
        cantidad_inventario: parseInt(editForm.cantidad_inventario)
      };
      
      await api.put(`/admin/libros/${editingProduct.libro_id}`, data);
      toast.success('Producto actualizado');
      
      setEditDialog(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar producto');
    }
  };

  const handleEditProduct = (libro) => {
    setEditingProduct(libro);
    setEditForm({
      nombre: libro.nombre,
      descripcion: libro.descripcion || '',
      grado: libro.grado,
      materia: libro.materia,
      precio: libro.precio.toString(),
      cantidad_inventario: libro.cantidad_inventario.toString(),
      isbn: libro.isbn || '',
      editorial: libro.editorial || ''
    });
    setEditDialog(true);
  };

  const handleDeleteProduct = async (libroId) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    try {
      await api.delete(`/admin/libros/${libroId}`);
      toast.success('Producto eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  // ========== BULK ADD PRODUCTS ==========
  const addBulkRow = () => {
    setBulkProducts([...bulkProducts, {...emptyProductRow}]);
  };

  const removeBulkRow = (index) => {
    if (bulkProducts.length === 1) return;
    setBulkProducts(bulkProducts.filter((_, i) => i !== index));
  };

  const updateBulkRow = (index, field, value) => {
    const updated = [...bulkProducts];
    updated[index] = { ...updated[index], [field]: value };
    setBulkProducts(updated);
  };

  const handleBulkSubmit = async () => {
    // Validate all rows
    const validProducts = bulkProducts.filter(p => 
      p.nombre && p.grado && p.materia && p.precio && p.cantidad_inventario
    );
    
    if (validProducts.length === 0) {
      toast.error('Complete al menos un producto con los campos requeridos');
      return;
    }
    
    setSavingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of validProducts) {
      try {
        const data = {
          ...product,
          precio: parseFloat(product.precio),
          cantidad_inventario: parseInt(product.cantidad_inventario),
          activo: true
        };
        
        await api.post('/admin/libros', data);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error creating product:', error);
      }
    }
    
    setSavingBulk(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} producto(s) creado(s) exitosamente`);
      setBulkDialog(false);
      setBulkProducts([{...emptyProductRow}]);
      fetchData();
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} producto(s) fallaron al crear`);
    }
  };

  const openBulkDialog = () => {
    setBulkProducts([{...emptyProductRow}]);
    setBulkDialog(true);
  };

  // ========== CSV IMPORT ==========
  
  // Grade mapping from Spanish names to IDs
  const gradeMapping = {
    'preescolar': 'preescolar',
    'pre-escolar': 'preescolar',
    'pre escolar': 'preescolar',
    '1': '1', '1er grado': '1', '1er': '1', 'primer grado': '1', 'primero': '1',
    '2': '2', '2do grado': '2', '2do': '2', 'segundo grado': '2', 'segundo': '2',
    '3': '3', '3er grado': '3', '3er': '3', 'tercer grado': '3', 'tercero': '3',
    '4': '4', '4to grado': '4', '4to': '4', 'cuarto grado': '4', 'cuarto': '4',
    '5': '5', '5to grado': '5', '5to': '5', 'quinto grado': '5', 'quinto': '5',
    '6': '6', '6to grado': '6', '6to': '6', 'sexto grado': '6', 'sexto': '6',
    '7': '7', '7mo grado': '7', '7mo': '7', 'séptimo grado': '7', 'septimo': '7',
    '8': '8', '8vo grado': '8', '8vo': '8', 'octavo grado': '8', 'octavo': '8',
    '9': '9', '9no grado': '9', '9no': '9', 'noveno grado': '9', 'noveno': '9',
    '10': '10', '10mo grado': '10', '10mo': '10', 'décimo grado': '10', 'decimo': '10',
    '11': '11', '11vo grado': '11', '11vo': '11', 'undécimo grado': '11', 'undecimo': '11',
    '12': '12', '12vo grado': '12', '12vo': '12', 'duodécimo grado': '12', 'duodecimo': '12'
  };

  // Subject mapping from Spanish names to IDs
  const subjectMapping = {
    'matematicas': 'matematicas', 'matemáticas': 'matematicas', 'math': 'matematicas', 'mate': 'matematicas',
    'espanol': 'espanol', 'español': 'espanol', 'spanish': 'espanol', 'lengua': 'espanol',
    'ciencias': 'ciencias', 'ciencia': 'ciencias', 'science': 'ciencias',
    'sociales': 'sociales', 'estudios sociales': 'sociales', 'social': 'sociales', 'historia': 'sociales',
    'ingles': 'ingles', 'inglés': 'ingles', 'english': 'ingles',
    'arte': 'arte', 'artes': 'arte', 'art': 'arte',
    'musica': 'musica', 'música': 'musica', 'music': 'musica',
    'educacion fisica': 'educacion_fisica', 'educación física': 'educacion_fisica', 'ed. fisica': 'educacion_fisica', 'deportes': 'educacion_fisica',
    'tecnologia': 'tecnologia', 'tecnología': 'tecnologia', 'tech': 'tecnologia', 'informatica': 'tecnologia',
    'religion': 'religion', 'religión': 'religion'
  };

  const normalizeGrade = (value) => {
    if (!value) return null;
    const normalized = value.toString().toLowerCase().trim();
    return gradeMapping[normalized] || null;
  };

  const normalizeSubject = (value) => {
    if (!value) return null;
    const normalized = value.toString().toLowerCase().trim();
    return subjectMapping[normalized] || null;
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { data: [], errors: ['El archivo CSV debe tener al menos una fila de encabezados y una fila de datos'] };

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(/[,;]/).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    
    // Expected columns mapping
    const columnMapping = {
      'nombre': ['nombre', 'name', 'titulo', 'título', 'libro', 'product', 'producto'],
      'grado': ['grado', 'grade', 'nivel', 'level', 'año', 'year'],
      'materia': ['materia', 'subject', 'asignatura', 'curso', 'course'],
      'precio': ['precio', 'price', 'costo', 'cost', 'valor'],
      'cantidad_inventario': ['cantidad', 'stock', 'inventario', 'qty', 'quantity', 'cantidad_inventario', 'unidades'],
      'descripcion': ['descripcion', 'descripción', 'description', 'desc', 'detalle'],
      'isbn': ['isbn', 'codigo', 'código', 'code'],
      'editorial': ['editorial', 'publisher', 'publicador', 'editor']
    };

    // Find column indices
    const columnIndices = {};
    for (const [field, aliases] of Object.entries(columnMapping)) {
      const index = headers.findIndex(h => aliases.includes(h));
      if (index !== -1) columnIndices[field] = index;
    }

    // Check required columns
    const requiredColumns = ['nombre', 'grado', 'materia', 'precio', 'cantidad_inventario'];
    const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
    
    if (missingColumns.length > 0) {
      return { 
        data: [], 
        errors: [`Columnas requeridas no encontradas: ${missingColumns.join(', ')}. Columnas detectadas: ${headers.join(', ')}`] 
      };
    }

    // Parse data rows
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Split by comma or semicolon, handling quoted values
      const values = line.match(/("([^"]|"")*"|[^,;]+)/g)?.map(v => v.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"')) || [];
      
      const row = {
        rowNumber: i + 1,
        nombre: values[columnIndices.nombre] || '',
        grado: normalizeGrade(values[columnIndices.grado]),
        materia: normalizeSubject(values[columnIndices.materia]),
        precio: values[columnIndices.precio] || '',
        cantidad_inventario: values[columnIndices.cantidad_inventario] || '',
        descripcion: columnIndices.descripcion !== undefined ? values[columnIndices.descripcion] || '' : '',
        isbn: columnIndices.isbn !== undefined ? values[columnIndices.isbn] || '' : '',
        editorial: columnIndices.editorial !== undefined ? values[columnIndices.editorial] || '' : '',
        valid: true,
        error: null
      };

      // Validate row
      const rowErrors = [];
      if (!row.nombre) rowErrors.push('Nombre vacío');
      if (!row.grado) rowErrors.push(`Grado inválido: "${values[columnIndices.grado]}"`);
      if (!row.materia) rowErrors.push(`Materia inválida: "${values[columnIndices.materia]}"`);
      if (!row.precio || isNaN(parseFloat(row.precio))) rowErrors.push('Precio inválido');
      if (!row.cantidad_inventario || isNaN(parseInt(row.cantidad_inventario))) rowErrors.push('Cantidad inválida');

      if (rowErrors.length > 0) {
        row.valid = false;
        row.error = rowErrors.join(', ');
        errors.push(`Fila ${row.rowNumber}: ${row.error}`);
      }

      data.push(row);
    }

    return { data, errors };
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    // Check file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      toast.error('Por favor seleccione un archivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const { data, errors } = parseCSV(text);
        setCsvData(data);
        setCsvErrors(errors);
        setCsvDialog(true);
      }
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    const validProducts = csvData.filter(row => row.valid);
    
    if (validProducts.length === 0) {
      toast.error('No hay productos válidos para importar');
      return;
    }

    setImportingCsv(true);
    let successCount = 0;
    let errorCount = 0;

    for (const product of validProducts) {
      try {
        const data = {
          nombre: product.nombre,
          grado: product.grado,
          materia: product.materia,
          precio: parseFloat(product.precio),
          cantidad_inventario: parseInt(product.cantidad_inventario),
          descripcion: product.descripcion || '',
          isbn: product.isbn || '',
          editorial: product.editorial || '',
          activo: true
        };

        await api.post('/admin/libros', data);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error importing product:', error);
      }
    }

    setImportingCsv(false);

    if (successCount > 0) {
      toast.success(`${successCount} producto(s) importado(s) exitosamente`);
      setCsvDialog(false);
      setCsvData([]);
      setCsvErrors([]);
      fetchData();
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} producto(s) fallaron al importar`);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = ['nombre', 'grado', 'materia', 'precio', 'cantidad', 'descripcion', 'isbn', 'editorial'];
    const exampleRows = [
      ['Matemáticas 1', '1', 'matematicas', '25.00', '50', 'Libro de matemáticas primer grado', '978-1-234-56789-0', 'Editorial Santillana'],
      ['Español 2', '2', 'espanol', '26.50', '40', 'Libro de español segundo grado', '978-1-234-56789-1', 'Editorial Norma'],
      ['Ciencias 3', '3', 'ciencias', '28.00', '35', '', '', '']
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_productos.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success('Plantilla descargada');
  };

  const exportProductsToCsv = () => {
    if (inventario.libros.length === 0) {
      toast.error('No hay productos para exportar');
      return;
    }

    const headers = ['nombre', 'grado', 'materia', 'precio', 'cantidad', 'descripcion', 'isbn', 'editorial', 'libro_id'];
    
    const rows = inventario.libros.map(libro => [
      libro.nombre || '',
      libro.grado || '',
      libro.materia || '',
      libro.precio?.toString() || '0',
      libro.cantidad_inventario?.toString() || '0',
      libro.descripcion || '',
      libro.isbn || '',
      libro.editorial || '',
      libro.libro_id || ''
    ]);

    // Escape CSV values properly
    const escapeCSV = (value) => {
      const str = value.toString();
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.download = `productos_export_${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success(`${inventario.libros.length} productos exportados`);
  };

  // ========== INVENTORY & ORDERS ==========
  const handleUpdateStock = async (libroId, cantidad) => {
    try {
      await api.put(`/admin/inventario/${libroId}`, null, {
        params: { cantidad }
      });
      toast.success('Stock actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar stock');
    }
  };

  const handleUpdateOrderStatus = async (pedidoId, estado) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}`, null, {
        params: { estado }
      });
      toast.success('Estado actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleConfirmPayment = async (pedidoId) => {
    try {
      await api.put(`/admin/pedidos/${pedidoId}/confirmar-pago`);
      toast.success('Pago confirmado');
      fetchData();
    } catch (error) {
      toast.error('Error al confirmar pago');
    }
  };

  const filteredProducts = inventario.libros.filter(libro =>
    libro.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = pedidos.filter(pedido =>
    orderFilter === 'all' || pedido.estado === orderFilter
  );

  const pendingOrders = pedidos.filter(p => p.estado === 'pendiente').length;
  const confirmedOrders = pedidos.filter(p => p.estado === 'confirmado').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          {t('admin.dashboard')}
        </h1>
        <p className="text-muted-foreground">
          Gestione productos, inventario y pedidos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => navigate(`#${v}`)}>
        <TabsList className="mb-8">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Book className="h-4 w-4" />
            {t('admin.products')}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('admin.orders')}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            {t('admin.inventory')}
          </TabsTrigger>
          <TabsTrigger value="matriculas" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Matrículas
          </TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2">
            <Sheet className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="form-config" className="gap-2">
            <Settings className="h-4 w-4" />
            Formulario
          </TabsTrigger>
          <TabsTrigger value="landing-editor" className="gap-2">
            <Layers className="h-4 w-4" />
            Landing Page
          </TabsTrigger>
          <TabsTrigger value="monday" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Monday.com
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inventario.total_productos}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.totalProducts')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <ShoppingCart className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingOrders')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{confirmedOrders}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.confirmedOrders')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inventario.productos_bajo_stock}</p>
                  <p className="text-sm text-muted-foreground">Bajo Stock</p>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {inventario.alertas_bajo_stock.length > 0 && (
            <div className="bg-destructive/10 rounded-xl p-6 mb-8">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t('admin.lowStockAlerts')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventario.alertas_bajo_stock.map((libro) => (
                  <div 
                    key={libro.libro_id}
                    className="bg-card rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{libro.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {libro.cantidad_inventario}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditProduct(libro)}
                    >
                      Actualizar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Pedidos Recientes</h3>
              <Link to="#orders">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {pedidos.slice(0, 5).map((pedido) => (
                <div 
                  key={pedido.pedido_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div>
                    <p className="font-mono text-sm">{pedido.pedido_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.estudiante_nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${pedido.total?.toFixed(2)}</p>
                    <Badge variant="outline">{t(`status.${pedido.estado}`)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* CSV Import/Export Section */}
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />
              
              {/* Export Products Button */}
              <Button 
                variant="outline" 
                onClick={exportProductsToCsv}
                className="rounded-full gap-2"
                data-testid="export-csv-button"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
              
              {/* Download Template Button */}
              <Button 
                variant="outline" 
                onClick={downloadCsvTemplate}
                className="rounded-full gap-2"
                data-testid="download-csv-template"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Plantilla</span>
              </Button>
              
              {/* Upload CSV Button */}
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full gap-2"
                data-testid="import-csv-button"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar CSV</span>
              </Button>
              
              {/* Bulk Add Products Button */}
              <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
                <DialogTrigger asChild>
                  <Button onClick={openBulkDialog} className="rounded-full" data-testid="add-product-button">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.addProduct')}
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    Agregar Productos en Lote
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto mt-4">
                  {/* Table Header */}
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-[1fr_120px_120px_80px_80px_1fr_100px_100px_50px] gap-2 pb-2 border-b border-border sticky top-0 bg-background z-10">
                      <div className="text-xs font-medium text-muted-foreground">Nombre *</div>
                      <div className="text-xs font-medium text-muted-foreground">Grado *</div>
                      <div className="text-xs font-medium text-muted-foreground">Materia *</div>
                      <div className="text-xs font-medium text-muted-foreground">Precio *</div>
                      <div className="text-xs font-medium text-muted-foreground">Stock *</div>
                      <div className="text-xs font-medium text-muted-foreground">Descripción</div>
                      <div className="text-xs font-medium text-muted-foreground">ISBN</div>
                      <div className="text-xs font-medium text-muted-foreground">Editorial</div>
                      <div></div>
                    </div>
                    
                    {/* Product Rows */}
                    <div className="space-y-2 mt-2">
                      {bulkProducts.map((product, index) => (
                        <div 
                          key={index}
                          className="grid grid-cols-[1fr_120px_120px_80px_80px_1fr_100px_100px_50px] gap-2 items-center"
                          data-testid={`bulk-row-${index}`}
                        >
                          <Input
                            value={product.nombre}
                            onChange={(e) => updateBulkRow(index, 'nombre', e.target.value)}
                            placeholder="Nombre del libro"
                            className="h-9 text-sm"
                          />
                          
                          <Select 
                            value={product.grado} 
                            onValueChange={(v) => updateBulkRow(index, 'grado', v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Grado" />
                            </SelectTrigger>
                            <SelectContent>
                              {grados.map((g) => (
                                <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={product.materia} 
                            onValueChange={(v) => updateBulkRow(index, 'materia', v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Materia" />
                            </SelectTrigger>
                            <SelectContent>
                              {materias.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Input
                            type="number"
                            step="0.01"
                            value={product.precio}
                            onChange={(e) => updateBulkRow(index, 'precio', e.target.value)}
                            placeholder="$"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            type="number"
                            value={product.cantidad_inventario}
                            onChange={(e) => updateBulkRow(index, 'cantidad_inventario', e.target.value)}
                            placeholder="Qty"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.descripcion}
                            onChange={(e) => updateBulkRow(index, 'descripcion', e.target.value)}
                            placeholder="Descripción"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.isbn}
                            onChange={(e) => updateBulkRow(index, 'isbn', e.target.value)}
                            placeholder="ISBN"
                            className="h-9 text-sm"
                          />
                          
                          <Input
                            value={product.editorial}
                            onChange={(e) => updateBulkRow(index, 'editorial', e.target.value)}
                            placeholder="Editorial"
                            className="h-9 text-sm"
                          />
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removeBulkRow(index)}
                            disabled={bulkProducts.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBulkRow}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Fila
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setBulkDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleBulkSubmit}
                      disabled={savingBulk}
                      className="gap-2"
                      data-testid="save-bulk-products"
                    >
                      {savingBulk ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Todos ({bulkProducts.filter(p => p.nombre && p.grado && p.materia && p.precio && p.cantidad_inventario).length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* CSV Import Dialog */}
          <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
            <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="font-serif flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Importar Productos desde CSV
                </DialogTitle>
              </DialogHeader>
              
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg mt-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <strong>{csvData.filter(r => r.valid).length}</strong> válidos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    <strong>{csvData.filter(r => !r.valid).length}</strong> con errores
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {csvData.length} filas
                </div>
              </div>

              {/* Errors */}
              {csvErrors.length > 0 && (
                <div className="p-4 bg-destructive/10 rounded-lg mt-4 max-h-32 overflow-auto">
                  <p className="font-medium text-destructive mb-2">Errores encontrados:</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {csvErrors.slice(0, 10).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {csvErrors.length > 10 && (
                      <li className="text-muted-foreground">... y {csvErrors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="flex-1 overflow-auto mt-4 border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Nombre</th>
                      <th className="text-left p-3 font-medium">Grado</th>
                      <th className="text-left p-3 font-medium">Materia</th>
                      <th className="text-right p-3 font-medium">Precio</th>
                      <th className="text-right p-3 font-medium">Stock</th>
                      <th className="text-left p-3 font-medium">Editorial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`border-t border-border ${!row.valid ? 'bg-destructive/5' : ''}`}
                      >
                        <td className="p-3">
                          {row.valid ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-destructive" title={row.error}>
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{row.nombre || '-'}</td>
                        <td className="p-3">{row.grado ? t(`grades.${row.grado}`) : <span className="text-destructive">-</span>}</td>
                        <td className="p-3">{row.materia ? t(`subjects.${row.materia}`) : <span className="text-destructive">-</span>}</td>
                        <td className="p-3 text-right">{row.precio ? `$${parseFloat(row.precio).toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-right">{row.cantidad_inventario || '-'}</td>
                        <td className="p-3">{row.editorial || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                <p className="text-sm text-muted-foreground">
                  Solo se importarán los {csvData.filter(r => r.valid).length} productos válidos
                </p>
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCsvDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCsvImport}
                    disabled={importingCsv || csvData.filter(r => r.valid).length === 0}
                    className="gap-2"
                    data-testid="confirm-csv-import"
                  >
                    {importingCsv ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Importar {csvData.filter(r => r.valid).length} Productos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Single Product Dialog */}
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {t('admin.editProduct')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Grado *</Label>
                    <Select 
                      value={editForm.grado} 
                      onValueChange={(v) => setEditForm({...editForm, grado: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {grados.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Materia *</Label>
                    <Select 
                      value={editForm.materia} 
                      onValueChange={(v) => setEditForm({...editForm, materia: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {materias.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Precio ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({...editForm, precio: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Stock *</Label>
                    <Input
                      type="number"
                      value={editForm.cantidad_inventario}
                      onChange={(e) => setEditForm({...editForm, cantidad_inventario: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>ISBN</Label>
                    <Input
                      value={editForm.isbn}
                      onChange={(e) => setEditForm({...editForm, isbn: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Editorial</Label>
                    <Input
                      value={editForm.editorial}
                      onChange={(e) => setEditForm({...editForm, editorial: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Producto</th>
                    <th className="text-left p-4 text-sm font-medium">Grado</th>
                    <th className="text-left p-4 text-sm font-medium">Materia</th>
                    <th className="text-right p-4 text-sm font-medium">Precio</th>
                    <th className="text-right p-4 text-sm font-medium">Stock</th>
                    <th className="text-right p-4 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((libro) => (
                    <tr key={libro.libro_id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{libro.nombre}</p>
                        <p className="text-sm text-muted-foreground">{libro.editorial}</p>
                      </td>
                      <td className="p-4">{t(`grades.${libro.grado}`)}</td>
                      <td className="p-4">{t(`subjects.${libro.materia}`)}</td>
                      <td className="p-4 text-right">${libro.precio.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <span className={libro.cantidad_inventario < 10 ? 'text-destructive font-bold' : ''}>
                          {libro.cantidad_inventario}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProduct(libro)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProduct(libro.libro_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="flex gap-4 mb-6">
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="preparando">Preparando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((pedido) => (
              <div 
                key={pedido.pedido_id}
                className="bg-card rounded-xl border border-border p-6"
                data-testid={`admin-order-${pedido.pedido_id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={pedido.estado === 'pendiente' ? 'secondary' : 'default'}>
                        {t(`status.${pedido.estado}`)}
                      </Badge>
                      {!pedido.pago_confirmado && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pago Pendiente
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono font-bold">{pedido.pedido_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.estudiante_nombre} • {new Date(pedido.fecha_creacion).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold">${pedido.total?.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {pedido.metodo_pago === 'transferencia_bancaria' ? 'Transferencia' : 'Yappy'}
                    </p>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-4">
                  {pedido.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{item.nombre_libro} x{item.cantidad}</span>
                      <span>${(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {!pedido.pago_confirmado && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmPayment(pedido.pedido_id)}
                      className="rounded-full"
                      data-testid={`confirm-payment-${pedido.pedido_id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('admin.confirmPayment')}
                    </Button>
                  )}
                  
                  <Select 
                    value={pedido.estado}
                    onValueChange={(v) => handleUpdateOrderStatus(pedido.pedido_id, v)}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="preparando">Preparando</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Link to={`/recibo/${pedido.pedido_id}?print=true`}>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Printer className="h-4 w-4 mr-2" />
                      {t('admin.printReceipt')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">Producto</th>
                    <th className="text-center p-4 text-sm font-medium">Stock Actual</th>
                    <th className="text-center p-4 text-sm font-medium">Estado</th>
                    <th className="text-right p-4 text-sm font-medium">Actualizar Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.libros.map((libro) => (
                    <tr key={libro.libro_id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{libro.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`grades.${libro.grado}`)} • {t(`subjects.${libro.materia}`)}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-lg font-bold ${
                          libro.cantidad_inventario < 10 ? 'text-destructive' : ''
                        }`}>
                          {libro.cantidad_inventario}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {libro.cantidad_inventario <= 0 ? (
                          <Badge variant="destructive">Agotado</Badge>
                        ) : libro.cantidad_inventario < 10 ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Bajo Stock
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Normal
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            defaultValue={libro.cantidad_inventario}
                            className="w-20 text-center"
                            id={`stock-${libro.libro_id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`stock-${libro.libro_id}`);
                              handleUpdateStock(libro.libro_id, parseInt(input.value));
                            }}
                          >
                            Guardar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        
        {/* Matriculas Tab */}
        <TabsContent value="matriculas">
          <div className="bg-card rounded-xl border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Verificación de Matrículas</h3>
                  <p className="text-sm text-muted-foreground">
                    Revise y apruebe las matrículas de estudiantes
                  </p>
                </div>
                
                <Select value={matriculaFilter} onValueChange={setMatriculaFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="confirmada">Confirmadas</SelectItem>
                    <SelectItem value="rechazada">Rechazadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-6">
              {loadingMatriculas ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : matriculas.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay matrículas {matriculaFilter !== 'all' ? matriculaFilter + 's' : ''}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matriculas.map((matricula) => (
                    <div
                      key={`${matricula.cliente_id}-${matricula.estudiante_id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          matricula.estado_matricula === 'pendiente' ? 'bg-amber-100' :
                          matricula.estado_matricula === 'confirmada' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <GraduationCap className={`h-6 w-6 ${
                            matricula.estado_matricula === 'pendiente' ? 'text-amber-600' :
                            matricula.estado_matricula === 'confirmada' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{matricula.nombre} {matricula.apellido}</h4>
                            <Badge 
                              variant="outline" 
                              className={
                                matricula.estado_matricula === 'pendiente' ? 'border-amber-500 text-amber-600' :
                                matricula.estado_matricula === 'confirmada' ? 'border-green-500 text-green-600' : 
                                'border-red-500 text-red-600'
                              }
                            >
                              {matricula.estado_matricula === 'pendiente' && <Clock className="h-3 w-3 mr-1" />}
                              {matricula.estado_matricula === 'confirmada' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {matricula.estado_matricula === 'rechazada' && <XCircle className="h-3 w-3 mr-1" />}
                              {matricula.estado_matricula}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Grado: {grados.find(g => g.id === matricula.grado)?.nombre || matricula.grado}
                            {matricula.escuela && ` • ${matricula.escuela}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {matricula.cliente_nombre}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {matricula.es_nuevo ? '🆕 Estudiante Nuevo' : '📚 Del Año Anterior'}
                            • {matricula.ano_escolar || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {matricula.documento_matricula_url && (
                          <Badge variant="outline" className="gap-1">
                            <FileImage className="h-3 w-3" />
                            Doc
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMatriculaDetail(matricula)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalles
                        </Button>
                        {matricula.estado_matricula === 'pendiente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedMatricula(matricula);
                                handleVerifyMatricula('aprobar');
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedMatricula(matricula);
                                handleVerifyMatricula('rechazar');
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Matricula Detail Dialog */}
          <Dialog open={matriculaDialog} onOpenChange={setMatriculaDialog}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Detalles de Matrícula
                </DialogTitle>
              </DialogHeader>
              
              {selectedMatricula && (
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">
                        {selectedMatricula.nombre} {selectedMatricula.apellido}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={
                          selectedMatricula.estado_matricula === 'pendiente' ? 'border-amber-500 text-amber-600' :
                          selectedMatricula.estado_matricula === 'confirmada' ? 'border-green-500 text-green-600' : 
                          'border-red-500 text-red-600'
                        }
                      >
                        {selectedMatricula.estado_matricula}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Grado</p>
                        <p className="font-medium">{grados.find(g => g.id === selectedMatricula.grado)?.nombre || selectedMatricula.grado}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium">{selectedMatricula.es_nuevo ? 'Estudiante Nuevo' : 'Del Año Anterior'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Escuela</p>
                        <p className="font-medium">{selectedMatricula.escuela || 'No especificada'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Año Escolar</p>
                        <p className="font-medium">{selectedMatricula.ano_escolar || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Parent/Guardian Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Datos del Acudiente</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedMatricula.cliente_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedMatricula.cliente_email}</span>
                      </div>
                      {selectedMatricula.cliente_telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedMatricula.cliente_telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Document */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Documento de Matrícula</h4>
                    {selectedMatricula.documento_matricula_url ? (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <img 
                          src={selectedMatricula.documento_matricula_url} 
                          alt="Documento de matrícula"
                          className="w-full max-h-[300px] object-contain bg-muted"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/50 rounded-lg">
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No se adjuntó documento</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Notes */}
                  {selectedMatricula.notas && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Notas</h4>
                        <p className="text-sm text-muted-foreground">{selectedMatricula.notas}</p>
                      </div>
                    </>
                  )}
                  
                  {/* Actions */}
                  {selectedMatricula.estado_matricula === 'pendiente' && (
                    <>
                      <Separator />
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerifyMatricula('aprobar')}
                          disabled={verifyingMatricula}
                        >
                          {verifyingMatricula ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Aprobar Matrícula
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleVerifyMatricula('rechazar')}
                          disabled={verifyingMatricula}
                        >
                          {verifyingMatricula ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Rechazar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Google Sheets Sync Tab */}
        <TabsContent value="sheets">
          <GoogleSheetsSync />
        </TabsContent>
        
        {/* Form Configuration Tab */}
        <TabsContent value="form-config">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración Básica
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-titulo">Título del Formulario</Label>
                    <Input
                      id="form-titulo"
                      value={formConfig.titulo || ''}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Formulario de Pedido de Libros"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-descripcion">Descripción</Label>
                    <Textarea
                      id="form-descripcion"
                      value={formConfig.descripcion || ''}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Complete el formulario para ordenar los libros de texto"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-mensaje">Mensaje de Éxito</Label>
                    <Textarea
                      id="form-mensaje"
                      value={formConfig.mensaje_exito || ''}
                      onChange={(e) => setFormConfig(prev => ({ ...prev, mensaje_exito: e.target.value }))}
                      placeholder="¡Gracias! Su pedido ha sido recibido."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              
              {/* Display Options */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Opciones de Visualización
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Precios</Label>
                      <p className="text-sm text-muted-foreground">Muestra los precios de los libros en el formulario</p>
                    </div>
                    <Switch
                      checked={formConfig.mostrar_precios !== false}
                      onCheckedChange={(checked) => setFormConfig(prev => ({ ...prev, mostrar_precios: checked }))}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Primario
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formConfig.color_primario || '#166534'}
                        onChange={(e) => setFormConfig(prev => ({ ...prev, color_primario: e.target.value }))}
                        className="h-10 w-14 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={formConfig.color_primario || '#166534'}
                        onChange={(e) => setFormConfig(prev => ({ ...prev, color_primario: e.target.value }))}
                        placeholder="#166534"
                        className="w-28 font-mono"
                      />
                      <div 
                        className="h-10 flex-1 rounded flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: formConfig.color_primario || '#166534' }}
                      >
                        Vista Previa
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Methods */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4">Métodos de Pago</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Transferencia Bancaria</p>
                        <p className="text-sm text-muted-foreground">Banco General / Banistmo</p>
                      </div>
                    </div>
                    <Switch
                      checked={(formConfig.metodos_pago || []).includes('transferencia_bancaria')}
                      onCheckedChange={() => togglePaymentMethod('transferencia_bancaria')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Yappy</p>
                        <p className="text-sm text-muted-foreground">Pago móvil instantáneo</p>
                      </div>
                    </div>
                    <Switch
                      checked={(formConfig.metodos_pago || []).includes('yappy')}
                      onCheckedChange={() => togglePaymentMethod('yappy')}
                    />
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <Button 
                onClick={handleSaveFormConfig} 
                className="w-full h-12"
                disabled={savingConfig}
              >
                {savingConfig ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
            
            {/* Right Column - Embed Info & Preview */}
            <div className="space-y-6">
              {/* Embed URL */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Enlace del Formulario
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL Directa</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/embed/orden`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={copyEmbedUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Comparta este enlace directamente con sus clientes
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Código para Embeber (iframe)</Label>
                    <div className="relative">
                      <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`<iframe 
  src="${window.location.origin}/embed/orden"
  width="100%" 
  height="800" 
  frameborder="0"
></iframe>`}
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="absolute top-2 right-2"
                        onClick={copyIframeCode}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pegue este código en su sitio web para mostrar el formulario
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open('/embed/orden', '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Formulario en Nueva Pestaña
                  </Button>
                </div>
              </div>
              
              {/* Preview */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa
                </h3>
                
                <div className="border border-border rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 p-6">
                  <div className="text-center mb-4">
                    <div 
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                      style={{ backgroundColor: formConfig.color_primario || '#166534' }}
                    >
                      <Book className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-lg">{formConfig.titulo || 'Formulario de Pedido'}</h4>
                    <p className="text-sm text-muted-foreground">{formConfig.descripcion || 'Complete el formulario'}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Sección: Datos del Acudiente</p>
                      <div className="h-2 bg-muted rounded w-3/4"></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Sección: Datos del Estudiante</p>
                      <div className="h-2 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Sección: Selección de Libros</p>
                      <div className="flex gap-2 mt-2">
                        <div className="h-8 bg-muted rounded flex-1"></div>
                        {formConfig.mostrar_precios !== false && (
                          <div className="h-8 w-16 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center text-xs font-medium text-green-600">$XX.XX</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    style={{ backgroundColor: formConfig.color_primario || '#166534' }}
                  >
                    Enviar Pedido
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Esta es una vista previa simplificada. El formulario real incluye todos los campos.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Landing Page Editor Tab */}
        <TabsContent value="landing-editor">
          <LandingPageEditor />
        </TabsContent>

        {/* Monday.com Integration Tab */}
        <TabsContent value="monday">
          <MondayIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Monday.com Integration Component
function MondayIntegration() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/admin/monday/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (error) {
      toast.error('Error cargando estado de Monday.com');
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async () => {
    if (!status?.board_id_configured) {
      toast.error('Configure el MONDAY_BOARD_ID en las variables de entorno primero');
      return;
    }

    try {
      setTesting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BACKEND_URL}/api/admin/monday/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error probando integración');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold">Integración Monday.com</h2>
        <p className="text-muted-foreground">
          Los pedidos se envían automáticamente a tu tablero de Monday.com
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.api_key_configured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Configurada</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">No configurada</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Board ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.board_id_configured ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Configurado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-yellow-600">Pendiente</span>
                </>
              )}
            </div>
            {status?.board_id && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {status.board_id}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">Desconectado</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Board Selection */}
      {status?.connected && status?.boards?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tableros Disponibles</CardTitle>
            <CardDescription>
              {status?.board_id_configured 
                ? `Board ID actual: ${status.board_id}`
                : 'Selecciona un tablero y configura el MONDAY_BOARD_ID en las variables de entorno'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {status.boards.map((board) => (
                <div 
                  key={board.id}
                  className={`p-3 border rounded-lg ${
                    status.board_id === board.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } cursor-pointer transition-colors`}
                  onClick={() => {
                    navigator.clipboard.writeText(board.id);
                    toast.success(`Board ID copiado: ${board.id}`);
                  }}
                >
                  <p className="font-medium text-sm truncate">{board.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {board.id}
                  </p>
                  {status.board_id === board.id && (
                    <Badge variant="default" className="mt-2">Seleccionado</Badge>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              💡 Haz clic en un tablero para copiar su ID. Luego configura la variable de entorno MONDAY_BOARD_ID con ese valor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Button */}
      <div className="flex gap-4">
        <Button 
          onClick={testIntegration}
          disabled={testing || !status?.board_id_configured}
          className="gap-2"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Probar Integración
        </Button>
        <Button variant="outline" onClick={fetchStatus} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar Estado
        </Button>
      </div>

      {/* Instructions */}
      {!status?.board_id_configured && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuración Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
            <p className="mb-3">
              Para completar la integración, configura la variable de entorno <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">MONDAY_BOARD_ID</code> con el ID del tablero donde deseas recibir los pedidos.
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Haz clic en un tablero de la lista arriba para copiar su ID</li>
              <li>Agrega <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">MONDAY_BOARD_ID=ID_COPIADO</code> a las variables de entorno</li>
              <li>Reinicia el servidor backend</li>
              <li>Haz clic en "Probar Integración" para verificar</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
