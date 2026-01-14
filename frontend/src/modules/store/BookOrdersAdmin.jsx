import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Users,
  BookOpen,
  ClipboardPaste,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  Link2,
  UserPlus,
  UserCheck,
  Clock,
  XCircle,
  Settings,
  ExternalLink,
  Plug,
  ArrowLeft,
  Key,
  Building2,
  LayoutGrid,
  Database,
  Play,
  ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Helper para columnas de letras (A, B, C, ..., AA, AB, etc.)
const getColumnLetter = (index) => {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
};

// Componente de Tab de Importación de Estudiantes
function ImportStudentsTab({ token }) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [gradeDefault, setGradeDefault] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  
  // Mapeo de columnas (índice 0-based)
  const [columnMapping, setColumnMapping] = useState({
    numero_estudiante: 0,
    nombre_completo: 1,
    grado: 2,
    seccion: 3
  });

  const handlePaste = async (e) => {
    const text = e.clipboardData?.getData('text') || '';
    setRawText(text);
    
    // Auto-preview al pegar
    if (text.trim()) {
      await handlePreview(text);
    }
  };

  const handlePreview = async (text = rawText) => {
    if (!text.trim()) {
      toast.error('Pega los datos de Google Sheets primero');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/estudiantes/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: text,
          column_mapping: columnMapping,
          grado_default: gradeDefault || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en preview');
      
      setPreview(data);
      
      if (data.resumen) {
        toast.success(`${data.resumen.validos} estudiantes listos para importar`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.preview.length === 0) {
      toast.error('No hay datos para importar');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/estudiantes/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          column_mapping: columnMapping,
          grado_default: gradeDefault || null,
          hoja_nombre: sheetName || 'Importación Manual',
          actualizar_existentes: updateExisting
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en importación');
      
      toast.success(`Importación completada: ${data.creados} nuevos, ${data.actualizados} actualizados`);
      
      // Limpiar
      setRawText('');
      setPreview(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de columnas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Mapeo de Columnas
          </CardTitle>
          <CardDescription>
            Indica en qué columna (A, B, C...) está cada dato en tu Google Sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Número Estudiante</Label>
              <Select 
                value={columnMapping.numero_estudiante.toString()} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, numero_estudiante: parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Select 
                value={columnMapping.nombre_completo.toString()} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, nombre_completo: parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select 
                value={columnMapping.grado !== null && columnMapping.grado !== undefined ? columnMapping.grado.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, grado: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sección</Label>
              <Select 
                value={columnMapping.seccion !== null && columnMapping.seccion !== undefined ? columnMapping.seccion.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, seccion: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Grado por Defecto (si no está en datos)</Label>
              <Input 
                placeholder="Ej: 1er Grado, 2do Grado..." 
                value={gradeDefault}
                onChange={(e) => setGradeDefault(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nombre de la Hoja/Pestaña</Label>
              <Input 
                placeholder="Ej: Primer Grado 2025" 
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 pt-6">
              <Switch 
                id="update-existing"
                checked={updateExisting}
                onCheckedChange={setUpdateExisting}
              />
              <Label htmlFor="update-existing">Actualizar estudiantes existentes</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área de pegado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Pegar Datos de Google Sheets
          </CardTitle>
          <CardDescription>
            Selecciona los datos en Google Sheets (incluyendo encabezados), copia (Ctrl+C) y pega aquí (Ctrl+V)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Pega aquí los datos copiados de Google Sheets...

Ejemplo:
Número	Nombre Completo	Grado	Sección
001	Juan Pérez García	1er Grado	A
002	María López Sánchez	1er Grado	B"
            className="min-h-[200px] font-mono text-sm"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onPaste={handlePaste}
          />
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => handlePreview()}
              disabled={loading || !rawText.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Previsualizar
            </Button>
            
            <Button 
              onClick={handleImport}
              disabled={importing || !preview || preview.preview.length === 0}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar Estudiantes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Previsualización
              </span>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {preview.resumen.nuevos} nuevos
                </Badge>
                <Badge variant="secondary">
                  {preview.resumen.actualizaciones} actualizaciones
                </Badge>
                {preview.resumen.errores > 0 && (
                  <Badge variant="destructive">
                    {preview.resumen.errores} errores
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preview.headers_detectados && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Encabezados detectados:</strong> {preview.headers_detectados.join(' | ')}
                </p>
              </div>
            )}
            
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead className="w-24">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.preview.map((est, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{est.fila}</TableCell>
                      <TableCell className="font-mono">{est.numero_estudiante}</TableCell>
                      <TableCell>{est.nombre_completo}</TableCell>
                      <TableCell>{est.grado}</TableCell>
                      <TableCell>{est.seccion || '-'}</TableCell>
                      <TableCell>
                        {est.ya_existe ? (
                          <Badge variant="secondary">Actualizar</Badge>
                        ) : (
                          <Badge variant="default">Crear</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {/* Errores */}
            {preview.errores && preview.errores.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errores encontrados
                </h4>
                <ul className="text-sm space-y-1">
                  {preview.errores.map((err, idx) => (
                    <li key={idx}>
                      Fila {err.fila}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente de Tab de Importación de Libros
function ImportBooksTab({ token }) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [gradeDefault, setGradeDefault] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  
  const [columnMapping, setColumnMapping] = useState({
    codigo: 0,
    nombre: 1,
    precio: 2,
    editorial: 3,
    isbn: 4,
    grado: 5,
    materia: 6
  });

  const handlePreview = async () => {
    if (!rawText.trim()) {
      toast.error('Pega los datos de Google Sheets primero');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/libros/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          column_mapping: columnMapping,
          grado_default: gradeDefault || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en preview');
      
      setPreview(data);
      
      if (data.resumen) {
        toast.success(`${data.resumen.validos} libros listos para importar`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.preview.length === 0) {
      toast.error('No hay datos para importar');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`${API}/api/store/bulk-import/libros/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          column_mapping: columnMapping,
          grado_default: gradeDefault || null,
          actualizar_existentes: updateExisting
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en importación');
      
      toast.success(`Importación completada: ${data.creados} nuevos, ${data.actualizados} actualizados`);
      
      setRawText('');
      setPreview(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de columnas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Mapeo de Columnas - Libros
          </CardTitle>
          <CardDescription>
            Indica en qué columna está cada dato del libro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Select 
                value={columnMapping.codigo.toString()} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, codigo: parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Select 
                value={columnMapping.nombre.toString()} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, nombre: parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Precio *</Label>
              <Select 
                value={columnMapping.precio.toString()} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, precio: parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Editorial</Label>
              <Select 
                value={columnMapping.editorial !== null && columnMapping.editorial !== undefined ? columnMapping.editorial.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, editorial: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ISBN</Label>
              <Select 
                value={columnMapping.isbn !== null && columnMapping.isbn !== undefined ? columnMapping.isbn.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, isbn: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select 
                value={columnMapping.grado !== null && columnMapping.grado !== undefined ? columnMapping.grado.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, grado: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Materia</Label>
              <Select 
                value={columnMapping.materia !== null && columnMapping.materia !== undefined ? columnMapping.materia.toString() : 'none'} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, materia: v === 'none' ? null : parseInt(v)}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No incluido</SelectItem>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      Columna {getColumnLetter(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grado por Defecto</Label>
              <Input 
                placeholder="Ej: 1er Grado" 
                value={gradeDefault}
                onChange={(e) => setGradeDefault(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 pt-6">
              <Switch 
                id="update-books"
                checked={updateExisting}
                onCheckedChange={setUpdateExisting}
              />
              <Label htmlFor="update-books">Actualizar libros existentes</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área de pegado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Pegar Datos de Libros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Pega aquí los datos copiados de Google Sheets...

Ejemplo:
Código	Nombre	Precio	Editorial	ISBN
LIB001	Matemáticas 1	25.00	Santillana	978-123456789
LIB002	Español 1	22.50	Norma	978-987654321"
            className="min-h-[200px] font-mono text-sm"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handlePreview}
              disabled={loading || !rawText.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Previsualizar
            </Button>
            
            <Button 
              onClick={handleImport}
              disabled={importing || !preview || preview.preview.length === 0}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar Libros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Previsualización</span>
              <div className="flex gap-2">
                <Badge variant="outline">{preview.resumen.nuevos} nuevos</Badge>
                <Badge variant="secondary">{preview.resumen.actualizaciones} actualizaciones</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Editorial</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.preview.map((libro, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{libro.codigo}</TableCell>
                      <TableCell>{libro.nombre}</TableCell>
                      <TableCell>${libro.precio?.toFixed(2)}</TableCell>
                      <TableCell>{libro.editorial || '-'}</TableCell>
                      <TableCell>{libro.grado || '-'}</TableCell>
                      <TableCell>
                        {libro.ya_existe ? (
                          <Badge variant="secondary">Actualizar</Badge>
                        ) : (
                          <Badge variant="default">Crear</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente de Tab de Vinculaciones
function VinculacionesTab({ token }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [vinculaciones, setVinculaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendientes');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (filter === 'pendientes') {
        const res = await fetch(`${API}/api/store/vinculacion/admin/solicitudes-pendientes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSolicitudes(data.solicitudes || []);
      } else {
        const res = await fetch(`${API}/api/store/vinculacion/admin/todas?estado=${filter === 'todas' ? '' : filter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setVinculaciones(data.vinculaciones || []);
      }
    } catch (err) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (vinculacionId) => {
    try {
      const res = await fetch(`${API}/api/store/vinculacion/admin/${vinculacionId}/aprobar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al aprobar');
      toast.success('Vinculación aprobada');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRechazar = async (vinculacionId) => {
    try {
      const res = await fetch(`${API}/api/store/vinculacion/admin/${vinculacionId}/rechazar`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo: 'Rechazado por administrador' })
      });
      if (!res.ok) throw new Error('Error al rechazar');
      toast.success('Vinculación rechazada');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (estado) => {
    switch(estado) {
      case 'aprobada':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobada</Badge>;
      case 'pendiente_admin':
        return <Badge variant="outline" className="text-orange-500 border-orange-500"><Clock className="h-3 w-3 mr-1" />Pendiente Admin</Badge>;
      case 'pendiente_principal':
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><Clock className="h-3 w-3 mr-1" />Pendiente Principal</Badge>;
      case 'rechazada':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getRolBadge = (rol) => {
    switch(rol) {
      case 'principal':
        return <Badge className="bg-purple-500">Principal</Badge>;
      case 'autorizado':
        return <Badge variant="secondary">Autorizado</Badge>;
      case 'solo_lectura':
        return <Badge variant="outline">Solo Lectura</Badge>;
      default:
        return <Badge>{rol}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Gestión de Vinculaciones
            </span>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardTitle>
          <CardDescription>
            Administra las vinculaciones entre acudientes y estudiantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-2 mb-4">
            <Button 
              variant={filter === 'pendientes' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('pendientes')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Pendientes
            </Button>
            <Button 
              variant={filter === 'aprobada' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('aprobada')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprobadas
            </Button>
            <Button 
              variant={filter === 'todas' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('todas')}
            >
              Todas
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filter === 'pendientes' ? (
            // Vista de solicitudes pendientes
            solicitudes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitudes.map((sol) => (
                  <div key={sol.vinculacion.vinculacion_id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sol.solicitante?.nombre || 'Acudiente'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{sol.estudiante?.nombre_completo || 'Estudiante'}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>Estudiante #{sol.estudiante?.numero_estudiante}</span>
                          <span className="mx-2">•</span>
                          <span>{sol.estudiante?.grado}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(sol.vinculacion.estado)}
                          {getRolBadge(sol.vinculacion.rol)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleAprobar(sol.vinculacion.vinculacion_id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleRechazar(sol.vinculacion.vinculacion_id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Vista de todas las vinculaciones
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acudiente</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculaciones.map((v) => (
                    <TableRow key={v.vinculacion.vinculacion_id}>
                      <TableCell>{v.acudiente?.nombre || '-'}</TableCell>
                      <TableCell>{v.estudiante?.nombre_completo || '-'}</TableCell>
                      <TableCell>{v.estudiante?.grado || '-'}</TableCell>
                      <TableCell>{getRolBadge(v.vinculacion.rol)}</TableCell>
                      <TableCell>{getStatusBadge(v.vinculacion.estado)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.vinculacion.fecha_solicitud ? new Date(v.vinculacion.fecha_solicitud).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Tab de Estudiantes Importados
function EstudiantesTab({ token }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [grados, setGrados] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadGrados();
  }, []);

  useEffect(() => {
    loadEstudiantes();
  }, [search, gradeFilter]);

  const loadGrados = async () => {
    try {
      const res = await fetch(`${API}/api/store/bulk-import/grados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGrados(data.grados || []);
    } catch (err) {
      console.error('Error loading grados:', err);
    }
  };

  const loadEstudiantes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('buscar', search);
      if (gradeFilter) params.append('grado', gradeFilter);
      params.append('limit', '100');
      
      const res = await fetch(`${API}/api/store/bulk-import/estudiantes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEstudiantes(data.estudiantes || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Error cargando estudiantes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{grados.length}</p>
                <p className="text-sm text-muted-foreground">Grados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Estudiantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Estudiantes Importados</CardTitle>
          <CardDescription>
            Lista de estudiantes sincronizados desde Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o número..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={gradeFilter || 'all'} onValueChange={(v) => setGradeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grados</SelectItem>
                {grados.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadEstudiantes}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay estudiantes importados</p>
              <p className="text-sm">Importa estudiantes desde la pestaña "Importar Estudiantes"</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.map((est) => (
                    <TableRow key={est.sync_id}>
                      <TableCell className="font-mono">{est.numero_estudiante}</TableCell>
                      <TableCell>{est.nombre_completo}</TableCell>
                      <TableCell>{est.grado}</TableCell>
                      <TableCell>{est.seccion || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={est.estado === 'activo' ? 'default' : 'secondary'}>
                          {est.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Tab de Demanda Agregada y Pedidos
function PedidosAdminTab({ token }) {
  const [demanda, setDemanda] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('demanda');
  const [filtroEstado, setFiltroEstado] = useState('all');

  useEffect(() => {
    if (view === 'demanda') {
      loadDemanda();
    } else {
      loadPedidos();
    }
  }, [view, filtroEstado]);

  const loadDemanda = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/pedidos/admin/demanda`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDemanda(data);
    } catch (err) {
      toast.error('Error cargando demanda');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado && filtroEstado !== 'all') params.append('estado', filtroEstado);
      
      const res = await fetch(`${API}/api/store/pedidos/admin/todos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPedidos(data.pedidos || []);
    } catch (err) {
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      const res = await fetch(`${API}/api/store/pedidos/admin/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nuevo_estado: nuevoEstado })
      });
      if (!res.ok) throw new Error('Error actualizando estado');
      toast.success('Estado actualizado');
      loadPedidos();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getEstadoBadge = (estado) => {
    const configs = {
      borrador: { label: 'Borrador', className: 'bg-gray-500' },
      pre_orden: { label: 'Pre-Orden', className: 'bg-blue-500' },
      confirmado: { label: 'Confirmado', className: 'bg-green-500' },
      en_proceso: { label: 'En Proceso', className: 'bg-yellow-500' },
      listo_retiro: { label: 'Listo Retiro', className: 'bg-purple-500' },
      entregado: { label: 'Entregado', className: 'bg-green-700' },
      cancelado: { label: 'Cancelado', className: 'bg-red-500' }
    };
    const config = configs[estado] || configs.borrador;
    return <Badge className={`${config.className} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Toggle vista */}
      <div className="flex gap-2">
        <Button 
          variant={view === 'demanda' ? 'default' : 'outline'} 
          onClick={() => setView('demanda')}
        >
          Demanda Agregada
        </Button>
        <Button 
          variant={view === 'pedidos' ? 'default' : 'outline'} 
          onClick={() => setView('pedidos')}
        >
          Todos los Pedidos
        </Button>
      </div>

      {view === 'demanda' ? (
        // Vista de Demanda Agregada
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Demanda Agregada de Libros</span>
              <Button variant="outline" size="sm" onClick={loadDemanda}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </CardTitle>
            <CardDescription>
              Resumen de pre-órdenes y pedidos confirmados para planificación de compras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : demanda ? (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">{demanda.total_pre_ordenes}</div>
                      <div className="text-sm text-muted-foreground">Pre-Órdenes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{demanda.total_confirmados}</div>
                      <div className="text-sm text-muted-foreground">Confirmados</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{demanda.total_estudiantes}</div>
                      <div className="text-sm text-muted-foreground">Estudiantes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">${demanda.valor_total_estimado?.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Valor Total</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de libros */}
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Libro</TableHead>
                        <TableHead>Editorial</TableHead>
                        <TableHead>Grados</TableHead>
                        <TableHead className="text-center">Pre-Órdenes</TableHead>
                        <TableHead className="text-center">Confirmados</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demanda.libros?.map((libro) => (
                        <TableRow key={libro.libro_id}>
                          <TableCell className="font-mono">{libro.codigo}</TableCell>
                          <TableCell>{libro.nombre}</TableCell>
                          <TableCell>{libro.editorial || '-'}</TableCell>
                          <TableCell>
                            {libro.grados?.map(g => (
                              <Badge key={g} variant="outline" className="mr-1">{g}</Badge>
                            ))}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{libro.cantidad_pre_ordenes}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500">{libro.cantidad_confirmados}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">{libro.cantidad_total}</TableCell>
                          <TableCell className="text-right font-medium">${libro.valor_total?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de demanda
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Vista de Todos los Pedidos
        <Card>
          <CardHeader>
            <CardTitle>Todos los Pedidos</CardTitle>
            <CardDescription>
              Gestiona el estado de los pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'pre_orden', 'confirmado', 'en_proceso', 'listo_retiro', 'entregado'].map((estado) => (
                <Button 
                  key={estado}
                  variant={filtroEstado === estado ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFiltroEstado(estado)}
                >
                  {estado === 'all' ? 'Todos' : estado.replace('_', ' ')}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pedidos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay pedidos
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Acudiente</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((pedido) => (
                      <TableRow key={pedido.pedido_id}>
                        <TableCell className="font-mono text-xs">
                          {pedido.pedido_id?.slice(-8)}
                        </TableCell>
                        <TableCell>
                          <div>{pedido.estudiante_nombre}</div>
                          <div className="text-xs text-muted-foreground">{pedido.estudiante_grado}</div>
                        </TableCell>
                        <TableCell>{pedido.acudiente?.nombre || '-'}</TableCell>
                        <TableCell>{pedido.items?.length || 0}</TableCell>
                        <TableCell className="font-medium">${pedido.total?.toFixed(2)}</TableCell>
                        <TableCell>{getEstadoBadge(pedido.estado)}</TableCell>
                        <TableCell>
                          <Select 
                            value={pedido.estado} 
                            onValueChange={(v) => handleCambiarEstado(pedido.pedido_id, v)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pre_orden">Pre-Orden</SelectItem>
                              <SelectItem value="confirmado">Confirmado</SelectItem>
                              <SelectItem value="en_proceso">En Proceso</SelectItem>
                              <SelectItem value="listo_retiro">Listo Retiro</SelectItem>
                              <SelectItem value="entregado">Entregado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== CATÁLOGO PRIVADO TAB ==============
function CatalogoPrivadoTab({ token }) {
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({ grados: [], materias: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('');
  const [selectedMateria, setSelectedMateria] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    isbn: '',
    editorial: '',
    grado: '',
    materia: '',
    precio: '',
    precio_oferta: '',
    descripcion: '',
    imagen_url: '',
    activo: true,
    destacado: false
  });

  const fetchProductos = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/store/catalogo-privado/admin/productos?limit=200`;
      if (selectedGrado) url += `&grado=${encodeURIComponent(selectedGrado)}`;
      if (selectedMateria) url += `&materia=${encodeURIComponent(selectedMateria)}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setProductos(data.productos || []);
      
      // Obtener filtros
      const filtrosRes = await fetch(`${API}/api/store/catalogo-privado/admin/productos?limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filtrosData = await filtrosRes.json();
      
      // Extraer grados y materias únicos
      const allProductos = data.productos || [];
      const grados = [...new Set(allProductos.map(p => p.grado).filter(Boolean))].sort();
      const materias = [...new Set(allProductos.map(p => p.materia).filter(Boolean))].sort();
      setFiltros({ grados, materias });
      
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [token, selectedGrado, selectedMateria]);

  const filteredProductos = productos.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.editorial?.toLowerCase().includes(term) ||
      p.materia?.toLowerCase().includes(term)
    );
  });

  const handleOpenForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nombre: product.nombre || '',
        codigo: product.codigo || '',
        isbn: product.isbn || '',
        editorial: product.editorial || '',
        grado: product.grado || '',
        materia: product.materia || '',
        precio: product.precio?.toString() || '',
        precio_oferta: product.precio_oferta?.toString() || '',
        descripcion: product.descripcion || '',
        imagen_url: product.imagen_url || '',
        activo: product.activo !== false,
        destacado: product.destacado || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nombre: '',
        codigo: '',
        isbn: '',
        editorial: '',
        grado: '',
        materia: '',
        precio: '',
        precio_oferta: '',
        descripcion: '',
        imagen_url: '',
        activo: true,
        destacado: false
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.grado || !formData.precio) {
      toast.error('Nombre, grado y precio son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        precio: parseFloat(formData.precio),
        precio_oferta: formData.precio_oferta ? parseFloat(formData.precio_oferta) : null
      };

      let url = `${API}/api/store/catalogo-privado/admin/productos`;
      let method = 'POST';
      
      if (editingProduct) {
        url = `${API}/api/store/catalogo-privado/admin/productos/${editingProduct.libro_id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
        setShowForm(false);
        fetchProductos();
      } else {
        toast.error(data.detail || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (libro_id) => {
    if (!confirm('¿Estás seguro de desactivar este producto?')) return;
    
    try {
      const response = await fetch(`${API}/api/store/catalogo-privado/admin/productos/${libro_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Producto desactivado');
        fetchProductos();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const GRADOS_OPCIONES = [
    'Pre-Kinder', 'Kinder', '1ro', '2do', '3ro', '4to', '5to', '6to',
    '7mo', '8vo', '9no', '10mo', '11vo', '12vo'
  ];

  const MATERIAS_OPCIONES = [
    'Matemáticas', 'Español', 'Inglés', 'Ciencias Naturales', 'Ciencias Sociales',
    'Religión', 'Arte', 'Música', 'Educación Física', 'Tecnología', 'Otros'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Catálogo Privado - Unatienda</CardTitle>
                <CardDescription>
                  Gestiona los libros de texto disponibles para estudiantes PCA vinculados
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchProductos} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={() => handleOpenForm()} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Producto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código, editorial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={selectedGrado}
              onChange={(e) => setSelectedGrado(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Todos los grados</option>
              {filtros.grados.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Todas las materias</option>
              {filtros.materias.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{productos.length}</div>
            <p className="text-xs text-muted-foreground">Total productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{productos.filter(p => p.activo !== false).length}</div>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filtros.grados.length}</div>
            <p className="text-xs text-muted-foreground">Grados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filtros.materias.length}</div>
            <p className="text-xs text-muted-foreground">Materias</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProductos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay productos en el catálogo privado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Usa la pestaña "Demo" para generar datos de prueba o agrega productos manualmente
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Editorial</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((p) => (
                    <TableRow key={p.libro_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{p.nombre}</p>
                            {p.isbn && <p className="text-xs text-muted-foreground">ISBN: {p.isbn}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.grado}</Badge>
                      </TableCell>
                      <TableCell>{p.materia}</TableCell>
                      <TableCell>{p.editorial}</TableCell>
                      <TableCell className="text-right">
                        {p.precio_oferta ? (
                          <div>
                            <span className="text-green-600 font-medium">${p.precio_oferta.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">${p.precio?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">${p.precio?.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.activo !== false ? "default" : "secondary"}>
                          {p.activo !== false ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenForm(p)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(p.libro_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica los datos del producto' : 'Agrega un nuevo libro al catálogo privado'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Matemáticas 5to Grado - Pearson"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: MAT-5-2026"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">ISBN</label>
                <Input
                  value={formData.isbn}
                  onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  placeholder="Ej: 978-607-32-4583-2"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Grado *</label>
                <select
                  value={formData.grado}
                  onChange={(e) => setFormData({...formData, grado: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar grado</option>
                  {GRADOS_OPCIONES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Materia</label>
                <select
                  value={formData.materia}
                  onChange={(e) => setFormData({...formData, materia: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar materia</option>
                  {MATERIAS_OPCIONES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Editorial</label>
                <Input
                  value={formData.editorial}
                  onChange={(e) => setFormData({...formData, editorial: e.target.value})}
                  placeholder="Ej: Pearson, SM, Norma..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Precio *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Precio Oferta</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio_oferta}
                  onChange={(e) => setFormData({...formData, precio_oferta: e.target.value})}
                  placeholder="Dejar vacío si no hay oferta"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">URL de Imagen</label>
                <Input
                  value={formData.imagen_url}
                  onChange={(e) => setFormData({...formData, imagen_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción breve del producto"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.destacado}
                    onChange={(e) => setFormData({...formData, destacado: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Destacado</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de acceso rápido a Monday.com (redirige a Integraciones)
// ============== DATOS DEMO TAB ==============
function DemoDatosTab({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const handleGenerateData = async () => {
    setGenerating(true);
    setLastResult(null);
    
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-data`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLastResult(data.data);
        toast.success('¡Datos de demo generados exitosamente!');
        fetchStats();
      } else {
        toast.error(data.detail || 'Error al generar datos');
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
      toast.error('Error al generar datos de demo');
    } finally {
      setGenerating(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setShowClearDialog(false);
    
    try {
      const response = await fetch(`${API}/api/admin/unatienda/demo-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Datos de demo eliminados');
        setLastResult(null);
        fetchStats();
      } else {
        toast.error('Error al eliminar datos');
      }
    } catch (error) {
      console.error('Error clearing demo data:', error);
      toast.error('Error al eliminar datos de demo');
    } finally {
      setClearing(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, demoValue, color }) => (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {demoValue > 0 && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {demoValue} demo
          </Badge>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Datos de Demostración - Unatienda</CardTitle>
                <CardDescription>
                  Genera datos ficticios para probar el catálogo privado de libros escolares
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleGenerateData}
              disabled={generating || clearing}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando datos...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generar Datos Demo
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              disabled={generating || clearing || !stats?.productos}
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar Datos Demo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Datos creados exitosamente:</span>
          </div>
          <ul className="mt-2 text-sm text-green-600 dark:text-green-400 space-y-1">
            <li>• {lastResult.productos} libros de texto para todos los grados</li>
            <li>• {lastResult.estudiantes} estudiantes distribuidos por grado</li>
            <li>• {lastResult.pedidos} pedidos de ejemplo para probar el flujo</li>
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          icon={BookOpen} 
          title="Productos" 
          value={stats?.productos_total || 0}
          demoValue={stats?.productos || 0}
          color="bg-blue-500"
        />
        <StatCard 
          icon={Users} 
          title="Estudiantes" 
          value={stats?.estudiantes_total || 0}
          demoValue={stats?.estudiantes || 0}
          color="bg-green-500"
        />
        <StatCard 
          icon={ShoppingCart} 
          title="Pedidos" 
          value={stats?.pedidos_total || 0}
          demoValue={stats?.pedidos || 0}
          color="bg-purple-500"
        />
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            ¿Qué datos se generan?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>~60-80 libros</strong> de texto para Pre-Kinder hasta 12vo grado</p>
          <p>• <strong>5-10 estudiantes</strong> por grado con datos completos</p>
          <p>• <strong>10 pedidos</strong> de ejemplo con múltiples libros cada uno</p>
          <p>• Los datos incluyen editoriales, precios, materias y códigos realistas</p>
          <p className="text-orange-600 dark:text-orange-400 font-medium">
            ⚠️ Los pedidos generados pueden sincronizarse con Monday.com si está configurado
          </p>
        </CardContent>
      </Card>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar todos los datos de demostración de Unatienda?
              Esta acción eliminará {stats?.productos || 0} libros, {stats?.estudiantes || 0} estudiantes y {stats?.pedidos || 0} pedidos marcados como demo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearData}>
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function MondayQuickAccess({ navigate }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Configuración de Monday.com
          </CardTitle>
          <CardDescription>
            La configuración de Monday.com ahora está centralizada en el módulo de Integraciones.
            Esto permite gestionar múltiples workspaces y configuraciones desde un solo lugar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Desde Integraciones → Monday.com puedes:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Agregar y gestionar múltiples workspaces con diferentes API Keys</li>
              <li>Configurar el board específico para pedidos de libros</li>
              <li>Mapear columnas de Monday.com con los campos de pedidos</li>
              <li>Sincronizar todos los pedidos pendientes</li>
              <li>Ver el estado de conexión en tiempo real</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => navigate('/admin/integraciones')} className="gap-2">
              <Settings className="h-4 w-4" />
              Ir a Integraciones
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://monday.com', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Monday.com
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Info de ayuda */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Acceso rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300">
          <p>
            También puedes acceder directamente desde el menú lateral: 
            <strong> Admin → Integraciones → Monday.com</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente Principal
export default function BookOrdersAdmin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('estudiantes');
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header con navegación */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Panel Admin
          </Button>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          Gestión de Libros Escolares
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra estudiantes, libros, vinculaciones y pedidos de textos escolares
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8 mb-6">
          <TabsTrigger value="catalogo" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="estudiantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Estudiantes</span>
          </TabsTrigger>
          <TabsTrigger value="import-estudiantes" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import Est.</span>
          </TabsTrigger>
          <TabsTrigger value="import-libros" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Import Lib.</span>
          </TabsTrigger>
          <TabsTrigger value="vinculaciones" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Vincul.</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" />
            <span className="hidden sm:inline">Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Demo</span>
          </TabsTrigger>
          <TabsTrigger value="monday" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Monday</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo">
          <CatalogoPrivadoTab token={token} />
        </TabsContent>

        <TabsContent value="estudiantes">
          <EstudiantesTab token={token} />
        </TabsContent>

        <TabsContent value="import-estudiantes">
          <ImportStudentsTab token={token} />
        </TabsContent>

        <TabsContent value="import-libros">
          <ImportBooksTab token={token} />
        </TabsContent>

        <TabsContent value="vinculaciones">
          <VinculacionesTab token={token} />
        </TabsContent>

        <TabsContent value="pedidos">
          <PedidosAdminTab token={token} />
        </TabsContent>

        <TabsContent value="demo">
          <DemoDatosTab token={token} />
        </TabsContent>

        <TabsContent value="monday">
          <MondayQuickAccess navigate={navigate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
