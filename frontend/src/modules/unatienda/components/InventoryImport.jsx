/**
 * Inventory Import Component
 * CSV-based inventory import with preview and duplicate handling options
 */
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, 
  Plus, RefreshCw, ArrowRight, Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InventoryImport({ token, onImportComplete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [duplicateMode, setDuplicateMode] = useState('add');
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API}/api/store/inventory-import/template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error downloading template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template descargado');
    } catch (error) {
      toast.error('Error al descargar template');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Solo se permiten archivos CSV');
        return;
      }
      setSelectedFile(file);
      setPreviewData(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicate_mode', duplicateMode);

      const response = await fetch(`${API}/api/store/inventory-import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error en preview');
      }

      setPreviewData(data);
    } catch (error) {
      toast.error(error.message || 'Error al previsualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('duplicate_mode', duplicateMode);

      const response = await fetch(`${API}/api/store/inventory-import/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error en importación');
      }

      toast.success(data.message);
      setShowDialog(false);
      setPreviewData(null);
      setSelectedFile(null);
      onImportComplete?.();
    } catch (error) {
      toast.error(error.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setPreviewData(null);
    setSelectedFile(null);
    setDuplicateMode('add');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-500">Nuevo</Badge>;
      case 'update_add':
        return <Badge className="bg-blue-500">Agregar</Badge>;
      case 'update_replace':
        return <Badge className="bg-orange-500">Reemplazar</Badge>;
      case 'skip':
        return <Badge variant="secondary">Omitir</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button 
        variant="outline" 
        onClick={() => { resetDialog(); setShowDialog(true); }}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Importar CSV
      </Button>

      {/* Import Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Inventario desde CSV
            </DialogTitle>
            <DialogDescription>
              Descarga el template, completa la información y sube el archivo para agregar productos al inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Step 1: Download Template */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Descargar Template
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar Template CSV
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  El template incluye las columnas: codigo, nombre, grado, cantidad, precio, materia, editorial, isbn, descripcion
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Select Duplicate Mode */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  ¿Qué hacer con códigos existentes?
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup value={duplicateMode} onValueChange={setDuplicateMode} className="space-y-2">
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="flex-1 cursor-pointer">
                      <span className="font-medium">Agregar cantidad</span>
                      <p className="text-xs text-muted-foreground">Suma la cantidad del CSV a la existente. Ej: 10 existentes + 5 del CSV = 15</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="flex-1 cursor-pointer">
                      <span className="font-medium">Reemplazar cantidad</span>
                      <p className="text-xs text-muted-foreground">Sobrescribe la cantidad existente con la del CSV. Ej: 10 existentes → 5 del CSV = 5</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="flex-1 cursor-pointer">
                      <span className="font-medium">Omitir existentes</span>
                      <p className="text-xs text-muted-foreground">Solo importa productos nuevos, ignora los que ya existen</p>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Step 3: Upload File */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Subir Archivo CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <Button 
                    onClick={handlePreview} 
                    disabled={!selectedFile || loading}
                    className="gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Previsualizar
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Preview Results */}
            {previewData && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                    Previsualización
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{previewData.actions?.create || 0}</p>
                      <p className="text-xs text-muted-foreground">Nuevos</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {(previewData.actions?.update_add || 0) + (previewData.actions?.update_replace || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Actualizar</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-600">{previewData.actions?.skip || 0}</p>
                      <p className="text-xs text-muted-foreground">Omitir</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{previewData.error_rows || 0}</p>
                      <p className="text-xs text-muted-foreground">Errores</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {previewData.errors?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {previewData.errors.length} error(es) encontrado(s):
                        <ul className="list-disc list-inside mt-1">
                          {previewData.errors.slice(0, 5).map((err, i) => (
                            <li key={i} className="text-xs">Fila {err.row}: {err.error}</li>
                          ))}
                          {previewData.errors.length > 5 && (
                            <li className="text-xs">... y {previewData.errors.length - 5} más</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Items Table */}
                  {previewData.items?.length > 0 && (
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[80px]">Grado</TableHead>
                            <TableHead className="w-[100px] text-right">Cantidad</TableHead>
                            <TableHead className="w-[100px]">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{item.nombre}</TableCell>
                              <TableCell>{item.grado}</TableCell>
                              <TableCell className="text-right">
                                {item.existing_quantity !== null ? (
                                  <span className="text-xs">
                                    {item.existing_quantity} → {item.new_quantity}
                                  </span>
                                ) : (
                                  item.cantidad_csv
                                )}
                              </TableCell>
                              <TableCell>{getActionBadge(item.action)}</TableCell>
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

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!previewData || importing || previewData.valid_rows === 0}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Importar {previewData?.valid_rows || 0} productos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
