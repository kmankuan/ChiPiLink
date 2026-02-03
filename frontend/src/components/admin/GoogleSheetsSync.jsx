import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Link as LinkIcon, 
  AlertTriangle, 
  Check, 
  X, 
  Lock, 
  Unlock,
  History,
  FileSpreadsheet,
  Users,
  Columns,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye
} from 'lucide-react';

const MAPEO_CAMPOS = [
  { value: 'nombre', label: 'Nombre del Estudiante' },
  { value: 'apellido', label: 'Apellido del Estudiante' },
  { value: 'grade', label: 'Grado' },
  { value: 'escuela', label: 'Escuela/Colegio' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'nombre_acudiente', label: 'Nombre del Acudiente' },
  { value: 'email_acudiente', label: 'Email del Acudiente' },
  { value: 'telefono_acudiente', label: 'Teléfono del Acudiente' },
  { value: null, label: '-- Sin mapeo --' }
];

export default function GoogleSheetsSync() {
  const { api } = useAuth();
  
  // State
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [cambiosPendientes, setCambiosPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Dialog states
  const [connectDialog, setConnectDialog] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Estudiantes');
  const [connecting, setConnecting] = useState(false);
  
  const [cambioDialog, setCambioDialog] = useState(false);
  const [selectedCambio, setSelectedCambio] = useState(null);
  const [aplicandoCambio, setAplicandoCambio] = useState(false);

  // Fetch all configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Fetch config details when selected
  useEffect(() => {
    if (selectedConfig) {
      fetchConfigDetails(selectedConfig);
      fetchCambiosPendientes(selectedConfig);
      fetchHistorial(selectedConfig);
    }
  }, [selectedConfig]);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/admin/sheets/configs');
      setConfigs(response.data);
      if (response.data.length > 0 && !selectedConfig) {
        setSelectedConfig(response.data[0].config_id);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigDetails = async (configId) => {
    try {
      const response = await api.get(`/admin/sheets/${configId}`);
      setConfigData(response.data);
    } catch (error) {
      console.error('Error fetching config details:', error);
    }
  };

  const fetchCambiosPendientes = async (configId) => {
    try {
      const response = await api.get(`/admin/sheets/${configId}/cambios-pendientes`);
      setCambiosPendientes(response.data);
    } catch (error) {
      console.error('Error fetching pending changes:', error);
    }
  };

  const fetchHistorial = async (configId) => {
    try {
      const response = await api.get(`/admin/sheets/${configId}/historial`);
      setHistorial(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Connect new sheet
  const handleConnect = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Ingrese la URL o ID de la hoja');
      return;
    }
    
    setConnecting(true);
    try {
      const response = await api.post('/admin/sheets/conectar', null, {
        params: {
          url_o_id: sheetUrl,
          nombre: sheetName
        }
      });
      
      toast.success(`¡Hoja conectada! ${response.data.estudiantes_importados} estudiantes importados`);
      setConnectDialog(false);
      setSheetUrl('');
      setSheetName('Estudiantes');
      fetchConfigs();
      setSelectedConfig(response.data.config_id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al conectar la hoja');
    } finally {
      setConnecting(false);
    }
  };

  // Sync with sheet
  const handleSync = async () => {
    if (!selectedConfig) return;
    
    setSyncing(true);
    try {
      const response = await api.post(`/admin/sheets/${selectedConfig}/sincronizar`);
      const { resumen } = response.data;
      
      toast.success(
        `Sincronización completa: ${resumen.nuevos_importados} nuevos, ${resumen.modificaciones_pendientes} modificaciones, ${resumen.eliminaciones_pendientes} eliminaciones pendientes`
      );
      
      fetchConfigDetails(selectedConfig);
      fetchCambiosPendientes(selectedConfig);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Toggle column lock
  const handleToggleLock = async (columnaId, currentLocked) => {
    try {
      await api.put(`/admin/sheets/${selectedConfig}/columnas/${columnaId}/fijar`, null, {
        params: { fijada: !currentLocked }
      });
      fetchConfigDetails(selectedConfig);
      toast.success(currentLocked ? 'Columna desbloqueada' : 'Columna fijada');
    } catch (error) {
      toast.error('Error al actualizar columna');
    }
  };

  // Update column mapping
  const handleUpdateMapeo = async (columnaId, mapeo) => {
    try {
      await api.put(`/admin/sheets/${selectedConfig}/columnas/${columnaId}/mapeo`, null, {
        params: { mapeo_campo: mapeo }
      });
      fetchConfigDetails(selectedConfig);
      toast.success('Mapeo actualizado');
    } catch (error) {
      toast.error('Error al actualizar mapeo');
    }
  };

  // Apply change
  const handleAplicarCambio = async (cambioId) => {
    setAplicandoCambio(true);
    try {
      await api.post(`/admin/sheets/${selectedConfig}/aplicar-cambio/${cambioId}`);
      toast.success('Cambio aplicado');
      setCambioDialog(false);
      fetchCambiosPendientes(selectedConfig);
      fetchConfigDetails(selectedConfig);
      fetchHistorial(selectedConfig);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al aplicar cambio');
    } finally {
      setAplicandoCambio(false);
    }
  };

  // Ignore change
  const handleIgnorarCambio = async (cambioId) => {
    try {
      await api.post(`/admin/sheets/${selectedConfig}/ignorar-cambio/${cambioId}`);
      toast.success('Cambio ignorado');
      setCambioDialog(false);
      fetchCambiosPendientes(selectedConfig);
    } catch (error) {
      toast.error('Error al ignorar cambio');
    }
  };

  // Delete config
  const handleDeleteConfig = async () => {
    if (!confirm('¿Está seguro de eliminar esta conexión? Se perderán todos los datos sincronizados.')) return;
    
    try {
      await api.delete(`/admin/sheets/${selectedConfig}`);
      toast.success('Conexión eliminada');
      setSelectedConfig(null);
      setConfigData(null);
      fetchConfigs();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Get change type badge
  const getCambioBadge = (tipo) => {
    switch (tipo) {
      case 'nuevo':
        return <Badge className="bg-green-100 text-green-800">Nuevo</Badge>;
      case 'modificado':
        return <Badge className="bg-amber-100 text-amber-800">Modificado</Badge>;
      case 'eliminado':
        return <Badge className="bg-red-100 text-red-800">Eliminado</Badge>;
      case 'columna_nueva':
        return <Badge className="bg-blue-100 text-blue-800">Columna Nueva</Badge>;
      case 'columna_eliminada':
        return <Badge className="bg-purple-100 text-purple-800">Columna Eliminada</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            Sincronización con Google Sheets
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte hojas de cálculo para sincronizar estudiantes automáticamente
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedConfig && (
            <>
              <Button 
                variant="outline" 
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Ahora
              </Button>
            </>
          )}
          <Button onClick={() => setConnectDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Conectar Hoja
          </Button>
        </div>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No hay hojas conectadas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Conecte una hoja de Google Sheets pública para comenzar a sincronizar estudiantes
            </p>
            <Button onClick={() => setConnectDialog(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Conectar Primera Hoja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Config List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hojas Conectadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {configs.map((config) => (
                  <button
                    key={config.config_id}
                    onClick={() => setSelectedConfig(config.config_id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConfig === config.config_id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium truncate">{config.nombre}</p>
                    <p className={`text-xs ${selectedConfig === config.config_id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {config.columnas?.length || 0} columnas
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {configData && (
              <Tabs defaultValue="estudiantes" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="estudiantes" className="gap-2">
                      <Users className="h-4 w-4" />
                      Estudiantes
                      <Badge variant="secondary" className="ml-1">{configData.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="columnas" className="gap-2">
                      <Columns className="h-4 w-4" />
                      Columnas
                    </TabsTrigger>
                    <TabsTrigger value="cambios" className="gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Cambios
                      {cambiosPendientes.length > 0 && (
                        <Badge variant="destructive" className="ml-1">{cambiosPendientes.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="gap-2">
                      <History className="h-4 w-4" />
                      Historial
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(configData.config.spreadsheet_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir en Google Sheets</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDeleteConfig}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Estudiantes Tab */}
                <TabsContent value="estudiantes">
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              {configData.config.columnas?.map((col) => (
                                <TableHead key={col.columna_id}>
                                  {col.nombre_display}
                                  {col.mapeo_campo && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {col.mapeo_campo}
                                    </Badge>
                                  )}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {configData.estudiantes?.slice(0, 50).map((est, idx) => (
                              <TableRow key={est.sync_id}>
                                <TableCell className="text-muted-foreground">{est.fila_sheet}</TableCell>
                                {configData.config.columnas?.map((col) => (
                                  <TableCell key={col.columna_id}>
                                    {est.datos[col.nombre_original] || '-'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {configData.total > 50 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t">
                          Mostrando 50 de {configData.total} estudiantes
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Columnas Tab */}
                <TabsContent value="columnas">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuración de Columnas</CardTitle>
                      <CardDescription>
                        Configure cómo se mapean las columnas de la hoja a los campos del sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {configData.config.columnas?.map((col) => (
                          <div
                            key={col.columna_id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleLock(col.columna_id, col.fijada)}
                              >
                                {col.fijada ? (
                                  <Lock className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Unlock className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <div>
                                <p className="font-medium">{col.nombre_original}</p>
                                <p className="text-xs text-muted-foreground">Columna {col.indice + 1}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <Select
                                value={col.mapeo_campo || 'null'}
                                onValueChange={(v) => handleUpdateMapeo(col.columna_id, v === 'null' ? null : v)}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Seleccionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MAPEO_CAMPOS.map((campo) => (
                                    <SelectItem key={campo.value || 'null'} value={campo.value || 'null'}>
                                      {campo.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {col.fijada && (
                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Fijada
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Cambios Pendientes Tab */}
                <TabsContent value="cambios">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Cambios Pendientes de Aprobación
                      </CardTitle>
                      <CardDescription>
                        Revise y apruebe los cambios detectados en la hoja de cálculo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {cambiosPendientes.length === 0 ? (
                        <div className="text-center py-8">
                          <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
                          <p className="text-muted-foreground">No hay cambios pendientes</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cambiosPendientes.map((cambio) => (
                            <div
                              key={cambio.cambio_id}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                setSelectedCambio(cambio);
                                setCambioDialog(true);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {getCambioBadge(cambio.tipo)}
                                <div>
                                  {cambio.tipo === 'columna_nueva' && (
                                    <p>Nueva columna: <strong>{cambio.columna_afectada}</strong></p>
                                  )}
                                  {cambio.tipo === 'columna_eliminada' && (
                                    <p>Columna eliminada: <strong>{cambio.columna_afectada}</strong></p>
                                  )}
                                  {cambio.tipo === 'modificado' && (
                                    <p>Fila modificada (ID: {cambio.fila_id})</p>
                                  )}
                                  {cambio.tipo === 'eliminado' && (
                                    <p>Fila eliminada (ID: {cambio.fila_id})</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(cambio.fecha_deteccion).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Historial Tab */}
                <TabsContent value="historial">
                  <Card>
                    <CardHeader>
                      <CardTitle>Historial de Cambios</CardTitle>
                      <CardDescription>
                        Registro de todos los cambios aplicados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {historial.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No hay historial de cambios</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {historial.map((cambio) => (
                            <div
                              key={cambio.cambio_id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              {getCambioBadge(cambio.tipo)}
                              <div className="flex-1">
                                <p className="text-sm">
                                  {cambio.tipo === 'modificado' && 'Datos actualizados'}
                                  {cambio.tipo === 'eliminado' && 'Registro eliminado'}
                                  {cambio.tipo === 'columna_nueva' && `Columna agregada: ${cambio.columna_afectada}`}
                                  {cambio.tipo === 'columna_eliminada' && `Columna eliminada: ${cambio.columna_afectada}`}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {cambio.fecha_aplicado ? new Date(cambio.fecha_aplicado).toLocaleString() : '-'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}

      {/* Connect Sheet Dialog */}
      <Dialog open={connectDialog} onOpenChange={setConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Conectar Hoja de Google Sheets
            </DialogTitle>
            <DialogDescription>
              Ingrese la URL o ID de una hoja pública de Google Sheets
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL o ID de la Hoja</Label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-muted-foreground">
                La hoja debe estar compartida como "Cualquier persona con el enlace puede ver"
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Nombre para esta conexión</Label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Estudiantes 2024-2025"
              />
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Importante</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Asegúrese de que la primera fila de la hoja contenga los nombres de las columnas (encabezados).
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setConnectDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConnect} disabled={connecting} className="flex-1">
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Detail Dialog */}
      <Dialog open={cambioDialog} onOpenChange={setCambioDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Cambio</DialogTitle>
          </DialogHeader>
          
          {selectedCambio && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getCambioBadge(selectedCambio.tipo)}
                <span className="text-sm text-muted-foreground">
                  Detectado: {new Date(selectedCambio.fecha_deteccion).toLocaleString()}
                </span>
              </div>
              
              {selectedCambio.datos_anteriores && (
                <div>
                  <Label className="text-sm">Datos Anteriores:</Label>
                  <pre className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedCambio.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedCambio.datos_nuevos && (
                <div>
                  <Label className="text-sm">Datos Nuevos:</Label>
                  <pre className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedCambio.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedCambio.columna_afectada && (
                <div>
                  <Label className="text-sm">Columna Afectada:</Label>
                  <p className="mt-1 font-medium">{selectedCambio.columna_afectada}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleIgnorarCambio(selectedCambio.cambio_id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Ignorar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAplicarCambio(selectedCambio.cambio_id)}
                  disabled={aplicandoCambio}
                >
                  {aplicandoCambio ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Aplicar Cambio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
