import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Users,
  GraduationCap,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Settings,
  Link2,
  Settings2,
  School,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import AdminUsuariosConexiones from '@/modules/users/components/AdminUsuariosConexiones';
import FormFieldsConfigTab from './components/FormFieldsConfigTab';
import SchoolsManagementTab from './components/SchoolsManagementTab';
import StudentRequestsTab from './components/StudentRequestsTab';
import AllStudentsTab from './components/AllStudentsTab';

export default function CustomersModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matriculas, setMatriculas] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchMatriculas();
  }, []);

  const fetchMatriculas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/matriculas');
      setMatriculas(res.data);
    } catch (error) {
      toast.error('Error al cargar matrículas');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatriculas = matriculas.filter(m => {
    const matchesFilter = filter === 'all' || m.estado_matricula === filter;
    const matchesSearch = 
      m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cliente_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (estado) => {
    const variants = {
      encontrado: { variant: 'default', label: 'Verificado', icon: CheckCircle, color: 'text-green-600' },
      no_encontrado: { variant: 'destructive', label: 'No Encontrado', icon: XCircle, color: 'text-red-600' },
      pendiente: { variant: 'secondary', label: 'Pendiente', icon: Clock, color: 'text-yellow-600' }
    };
    const config = variants[estado] || variants.pendiente;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const verifyMatricula = async (clienteId, estudianteId) => {
    try {
      setVerifying(true);
      // This would need a proper endpoint
      toast.success('Verificación iniciada');
      fetchMatriculas();
    } catch (error) {
      toast.error('Error al verificar');
    } finally {
      setVerifying(false);
    }
  };

  // Group by client for unique customers count
  const uniqueClients = [...new Set(matriculas.map(m => m.cliente_id))];
  const verifiedCount = matriculas.filter(m => m.estado_matricula === 'encontrado').length;
  const pendingCount = matriculas.filter(m => m.estado_matricula === 'no_encontrado').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="conexiones">
        <TabsList>
          <TabsTrigger value="conexiones" className="gap-2">
            <Link2 className="h-4 w-4" />
            Conexiones y Capacidades
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Estudiantes / Matrículas
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="form-config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Config. Formularios
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" />
            Escuelas
          </TabsTrigger>
        </TabsList>

        {/* Sistema de Conexiones y Capacidades */}
        <TabsContent value="conexiones" className="space-y-4">
          <AdminUsuariosConexiones token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Form Configuration Tab */}
        <TabsContent value="form-config" className="space-y-4">
          <FormFieldsConfigTab token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Schools Management Tab */}
        <TabsContent value="schools" className="space-y-4">
          <SchoolsManagementTab token={localStorage.getItem('auth_token')} />
        </TabsContent>

        {/* Students/Enrollments Tab */}
        <TabsContent value="students" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{matriculas.length}</p>
                <p className="text-sm text-muted-foreground">Total Estudiantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">Verificados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">No Encontrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-blue-600">{uniqueClients.length}</p>
                <p className="text-sm text-muted-foreground">Familias</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="encontrado">Verificados</SelectItem>
                  <SelectItem value="no_encontrado">No Encontrados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchMatriculas} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-3">
            {filteredMatriculas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay estudiantes registrados</p>
                </CardContent>
              </Card>
            ) : (
              filteredMatriculas.map((matricula, index) => (
                <Card key={`${matricula.estudiante_id}-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {matricula.nombre} {matricula.apellido}
                          </p>
                          {getStatusBadge(matricula.estado_matricula)}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Grado: {matricula.grado}</span>
                          {matricula.escuela && <span>Escuela: {matricula.escuela}</span>}
                        </div>
                        {matricula.similitud_matricula && (
                          <p className="text-xs text-green-600 mt-1">
                            Similitud: {matricula.similitud_matricula}%
                          </p>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {matricula.cliente_email}
                        </div>
                        {matricula.cliente_telefono && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {matricula.cliente_telefono}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedMatricula(matricula);
                            setDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Registrados</CardTitle>
              <CardDescription>
                Total de {uniqueClients.length} familias con {matriculas.length} estudiantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Group matriculas by client */}
              {uniqueClients.map((clienteId) => {
                const clientMatriculas = matriculas.filter(m => m.cliente_id === clienteId);
                const firstMatricula = clientMatriculas[0];
                
                return (
                  <div key={clienteId} className="p-4 border rounded-lg mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{firstMatricula?.cliente_nombre || 'Cliente'}</p>
                        <p className="text-sm text-muted-foreground">{firstMatricula?.cliente_email}</p>
                      </div>
                      <Badge>{clientMatriculas.length} estudiantes</Badge>
                    </div>
                    <div className="space-y-1">
                      {clientMatriculas.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-3 w-3" />
                          {m.nombre} {m.apellido} - {m.grado}
                          {getStatusBadge(m.estado_matricula)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Estudiante</DialogTitle>
          </DialogHeader>
          {selectedMatricula && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedMatricula.nombre} {selectedMatricula.apellido}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedMatricula.estado_matricula)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grado</p>
                  <p>{selectedMatricula.grado}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Escuela</p>
                  <p>{selectedMatricula.escuela || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Año Escolar</p>
                  <p>{selectedMatricula.ano_escolar}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p>{selectedMatricula.es_nuevo ? 'Nuevo ingreso' : 'Continuación'}</p>
                </div>
              </div>
              
              {selectedMatricula.nombre_matricula && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Encontrado como:</strong> {selectedMatricula.nombre_matricula}
                  </p>
                  <p className="text-sm text-green-600">
                    Similitud: {selectedMatricula.similitud_matricula}%
                  </p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Datos del Cliente</p>
                <p><strong>Nombre:</strong> {selectedMatricula.cliente_nombre}</p>
                <p><strong>Email:</strong> {selectedMatricula.cliente_email}</p>
                {selectedMatricula.cliente_telefono && (
                  <p><strong>Teléfono:</strong> {selectedMatricula.cliente_telefono}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
