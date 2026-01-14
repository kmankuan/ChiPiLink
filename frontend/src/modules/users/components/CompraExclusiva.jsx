/**
 * Compra Exclusiva - Componente para gestionar acceso a catálogos exclusivos
 * Permite vincular estudiantes para acceder a libros de texto escolares
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import {
  GraduationCap,
  Plus,
  Lock,
  ShoppingBag,
  User,
  Users,
  BookOpen,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Relaciones disponibles con el estudiante
const RELACIONES = [
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'acudiente', label: 'Acudiente/Tutor' },
  { value: 'abuelo', label: 'Abuelo/a' },
  { value: 'tio', label: 'Tío/a' },
  { value: 'hermano', label: 'Hermano/a Mayor' },
  { value: 'estudiante', label: 'Soy el Estudiante' },
  { value: 'otro', label: 'Otro' }
];

// Programas exclusivos disponibles
const PROGRAMAS_EXCLUSIVOS = [
  {
    id: 'pca',
    nombre: 'Textos de PCA',
    descripcion: 'Accede al catálogo exclusivo de libros de texto de Panama Christian Academy',
    icono: GraduationCap,
    color: 'purple',
    requiere_vinculacion: true
  }
  // En el futuro se pueden agregar más programas aquí
];

export default function CompraExclusiva() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [selectedPrograma, setSelectedPrograma] = useState(null);
  const [activeTab, setActiveTab] = useState('programas');
  
  // Form state
  const [formData, setFormData] = useState({
    nombre_estudiante: '',
    numero_estudiante: '',
    grado: '',
    relacion: '',
    notas: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchEstudiantes();
  }, [token]);

  const fetchEstudiantes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/store/vinculacion/mis-estudiantes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEstudiantes(data.estudiantes || data || []);
      }
    } catch (error) {
      console.error('Error fetching estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVincular = (programa) => {
    setSelectedPrograma(programa);
    setFormData({
      nombre_estudiante: '',
      numero_estudiante: '',
      grado: '',
      relacion: '',
      notas: ''
    });
    setEditingId(null);
    setShowVincularDialog(true);
  };

  const handleEditEstudiante = (estudiante) => {
    setFormData({
      nombre_estudiante: estudiante.nombre || '',
      numero_estudiante: estudiante.numero_estudiante || estudiante.sync_id || '',
      grado: estudiante.grado || '',
      relacion: estudiante.relacion || '',
      notas: estudiante.notas || ''
    });
    setEditingId(estudiante.sync_id || estudiante.vinculacion_id);
    setSelectedPrograma(PROGRAMAS_EXCLUSIVOS[0]); // PCA por defecto
    setShowVincularDialog(true);
  };

  const handleSubmitVinculacion = async () => {
    // Validación
    if (!formData.nombre_estudiante.trim()) {
      toast.error('Por favor ingresa el nombre del estudiante');
      return;
    }
    if (!formData.numero_estudiante.trim()) {
      toast.error('Por favor ingresa el número de estudiante');
      return;
    }
    if (!formData.relacion) {
      toast.error('Por favor selecciona tu relación con el estudiante');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        sync_id: formData.numero_estudiante.trim(),
        nombre: formData.nombre_estudiante.trim(),
        grado: formData.grado || 'Por verificar',
        relacion: formData.relacion,
        notas: formData.notas,
        programa: selectedPrograma?.id || 'pca'
      };

      const url = editingId 
        ? `${API_URL}/api/store/vinculacion/actualizar/${editingId}`
        : `${API_URL}/api/store/vinculacion/solicitar`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingId ? 'Estudiante actualizado' : 'Solicitud enviada correctamente');
        setShowVincularDialog(false);
        fetchEstudiantes();
      } else {
        toast.error(data.detail || 'Error al procesar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar solicitud');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEstudiante = async (vinculacionId) => {
    if (!confirm('¿Estás seguro de eliminar este estudiante vinculado?')) return;

    try {
      const response = await fetch(`${API_URL}/api/store/vinculacion/eliminar/${vinculacionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Estudiante eliminado');
        fetchEstudiantes();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getStatusBadge = (estudiante) => {
    const status = estudiante.estado || estudiante.status || 'pendiente';
    
    switch (status) {
      case 'aprobado':
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'pendiente':
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'rechazado':
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Compra Exclusiva
        </h2>
        <p className="text-muted-foreground mt-1">
          Accede a catálogos y productos exclusivos vinculando tu información
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programas" className="gap-2">
            <Lock className="h-4 w-4" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="estudiantes" className="gap-2">
            <Users className="h-4 w-4" />
            Mis Estudiantes
            {estudiantes.length > 0 && (
              <Badge variant="secondary" className="ml-1">{estudiantes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Programas Tab */}
        <TabsContent value="programas" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {PROGRAMAS_EXCLUSIVOS.map((programa) => {
              const Icon = programa.icono;
              const hasAccess = estudiantes.some(e => 
                (e.estado === 'aprobado' || e.status === 'verified') && 
                (e.programa === programa.id || !e.programa)
              );

              return (
                <Card 
                  key={programa.id}
                  className={`transition-all hover:shadow-md ${
                    hasAccess 
                      ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' 
                      : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-${programa.color}-100 dark:bg-${programa.color}-900/30`}>
                        <Icon className={`h-6 w-6 text-${programa.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{programa.nombre}</h3>
                          {hasAccess && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acceso Activo
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">
                          {programa.descripcion}
                        </p>
                        <div className="flex gap-2">
                          {hasAccess ? (
                            <Button 
                              onClick={() => window.location.href = '/unatienda'}
                              className="gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              Ir a la Tienda
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleOpenVincular(programa)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Vincular Estudiante
                            </Button>
                          )}
                          {estudiantes.length > 0 && !hasAccess && (
                            <Button 
                              variant="outline"
                              onClick={() => setActiveTab('estudiantes')}
                            >
                              Ver Solicitudes
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">¿Cómo funciona?</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Selecciona el programa al que deseas acceder</li>
                    <li>Completa el formulario de vinculación con los datos del estudiante</li>
                    <li>Un administrador verificará tu solicitud</li>
                    <li>Una vez aprobado, tendrás acceso al catálogo exclusivo</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estudiantes Tab */}
        <TabsContent value="estudiantes" className="space-y-4 mt-4">
          {estudiantes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No tienes estudiantes vinculados</h3>
                <p className="text-muted-foreground mb-4">
                  Vincula un estudiante para acceder a catálogos exclusivos
                </p>
                <Button onClick={() => handleOpenVincular(PROGRAMAS_EXCLUSIVOS[0])}>
                  <Plus className="h-4 w-4 mr-2" />
                  Vincular Primer Estudiante
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''} vinculado{estudiantes.length !== 1 ? 's' : ''}
                </p>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenVincular(PROGRAMAS_EXCLUSIVOS[0])}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Estudiante
                </Button>
              </div>

              <div className="grid gap-3">
                {estudiantes.map((estudiante) => (
                  <Card key={estudiante.sync_id || estudiante.vinculacion_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{estudiante.nombre}</h4>
                              {getStatusBadge(estudiante)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>ID: {estudiante.sync_id || estudiante.numero_estudiante}</span>
                              {estudiante.grado && (
                                <>
                                  <span>•</span>
                                  <span>{estudiante.grado}</span>
                                </>
                              )}
                              {estudiante.relacion && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{estudiante.relacion}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEstudiante(estudiante)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEstudiante(estudiante.sync_id || estudiante.vinculacion_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para vincular estudiante */}
      <Dialog open={showVincularDialog} onOpenChange={setShowVincularDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {editingId ? 'Editar Estudiante' : 'Vincular Estudiante'}
            </DialogTitle>
            <DialogDescription>
              {selectedPrograma?.nombre || 'Programa Exclusivo'} - Completa la información del estudiante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre del acudiente (auto-filled) */}
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Acudiente</Label>
              <p className="font-medium">{user?.nombre || user?.email}</p>
            </div>

            {/* Nombre del estudiante */}
            <div className="space-y-2">
              <Label htmlFor="nombre_estudiante">
                Nombre Completo del Estudiante <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre_estudiante"
                value={formData.nombre_estudiante}
                onChange={(e) => setFormData({ ...formData, nombre_estudiante: e.target.value })}
                placeholder="Ej: Juan Carlos Pérez González"
              />
            </div>

            {/* Número de estudiante */}
            <div className="space-y-2">
              <Label htmlFor="numero_estudiante">
                Número de Estudiante <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_estudiante"
                value={formData.numero_estudiante}
                onChange={(e) => setFormData({ ...formData, numero_estudiante: e.target.value })}
                placeholder="Ej: STU-2024-001"
              />
              <p className="text-xs text-muted-foreground">
                Este número lo encuentra en la credencial del estudiante o documentos escolares
              </p>
            </div>

            {/* Grado (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="grado">Grado Actual</Label>
              <Input
                id="grado"
                value={formData.grado}
                onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                placeholder="Ej: 5to Grado, 9no Grado"
              />
            </div>

            {/* Relación con el estudiante */}
            <div className="space-y-2">
              <Label>
                Relación con el Estudiante <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.relacion}
                onValueChange={(value) => setFormData({ ...formData, relacion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu relación" />
                </SelectTrigger>
                <SelectContent>
                  {RELACIONES.map((rel) => (
                    <SelectItem key={rel.value} value={rel.value}>
                      {rel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales (opcional)</Label>
              <Input
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Información adicional si es necesario"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVincularDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitVinculacion} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Guardar Cambios' : 'Enviar Solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
