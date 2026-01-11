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
  XCircle
} from 'lucide-react';
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
                value={columnMapping.editorial?.toString() ?? ''} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, editorial: v ? parseInt(v) : null}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No incluido</SelectItem>
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
                value={columnMapping.isbn?.toString() ?? ''} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, isbn: v ? parseInt(v) : null}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No incluido</SelectItem>
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
                value={columnMapping.grado?.toString() ?? ''} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, grado: v ? parseInt(v) : null}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No incluido</SelectItem>
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
                value={columnMapping.materia?.toString() ?? ''} 
                onValueChange={(v) => setColumnMapping(prev => ({...prev, materia: v ? parseInt(v) : null}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No incluido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No incluido</SelectItem>
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
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadGrados();
    loadStats();
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

  const loadStats = async () => {
    try {
      // Using the google sheets service stats endpoint
      const res = await fetch(`${API}/api/store/bulk-import/history?tipo=estudiantes&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Count total estudiantes
      const countRes = await fetch(`${API}/api/store/bulk-import/grados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const countData = await countRes.json();
      setStats({ total_grados: countData.grados?.length || 0, ultima_importacion: data[0]?.fecha });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadEstudiantes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('buscar', search);
      if (gradeFilter) params.append('grado', gradeFilter);
      params.append('limit', '100');
      
      // We need to add this endpoint - for now use a workaround
      // This will be a direct DB query
      const url = `${API}/api/store/bulk-import/estudiantes/preview`;
      // For now, show message that estudiantes are loaded via import
      setEstudiantes([]);
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
                <p className="text-2xl font-bold">-</p>
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
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los grados</SelectItem>
                {grados.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Importa estudiantes desde la pestaña "Importar Estudiantes"</p>
            <p className="text-sm">Los datos se cargarán desde tu Google Sheet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente Principal
export default function BookOrdersAdmin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('estudiantes');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          Gestión de Libros Escolares
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra estudiantes, libros y vinculaciones para pedidos de textos escolares
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="estudiantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Estudiantes</span>
          </TabsTrigger>
          <TabsTrigger value="import-estudiantes" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Estudiantes</span>
          </TabsTrigger>
          <TabsTrigger value="import-libros" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Libros</span>
          </TabsTrigger>
          <TabsTrigger value="vinculaciones" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Vinculaciones</span>
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
