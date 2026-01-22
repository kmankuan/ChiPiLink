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
import { ScrollArea } from '@/components/ui/scroll-area';
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
];

// Generate available years (current year and next)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [
    { value: String(currentYear), label: `${currentYear} (Año actual)` },
    { value: String(currentYear + 1), label: String(currentYear + 1) }
  ];
};

// Generate grades
const GRADOS = [
  { value: 'PK', label: 'Pre-Kinder' },
  { value: 'K', label: 'Kinder' },
  { value: '1', label: '1° Grado' },
  { value: '2', label: '2° Grado' },
  { value: '3', label: '3° Grado' },
  { value: '4', label: '4° Grado' },
  { value: '5', label: '5° Grado' },
  { value: '6', label: '6° Grado' },
  { value: '7', label: '7° Grado' },
  { value: '8', label: '8° Grado' },
  { value: '9', label: '9° Grado' },
  { value: '10', label: '10° Grado' },
  { value: '11', label: '11° Grado' },
  { value: '12', label: '12° Grado' }
];

export default function CompraExclusiva() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [selectedPrograma, setSelectedPrograma] = useState(null);
  const [activeTab, setActiveTab] = useState('programas');
  
  // Form configuration from API
  const [formConfig, setFormConfig] = useState({ fields: [] });
  
  // Schools list
  const [schools, setSchools] = useState([]);
  
  // Form state for single edit
  const [formData, setFormData] = useState({
    nombre_estudiante: '',
    school_id: '',
    numero_estudiante: '',
    anio: String(new Date().getFullYear()),
    grado: '',
    relacion: '',
    relacion_otro: '',
    notas: ''
  });
  const [editingId, setEditingId] = useState(null);
  
  // Multiple students state for new entries
  const [multipleStudents, setMultipleStudents] = useState([]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch both estudiantes and form config
      const [estudiantesRes, configRes] = await Promise.all([
        fetch(`${API_URL}/api/store/vinculacion/mis-estudiantes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/store/form-config/textbook_access`)
      ]);
      
      if (estudiantesRes.ok) {
        const data = await estudiantesRes.json();
        setEstudiantes(data.estudiantes || data || []);
      }
      
      if (configRes.ok) {
        const config = await configRes.json();
        setFormConfig(config);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a field is active in config
  const isFieldActive = (fieldKey) => {
    const field = formConfig.fields?.find(f => f.field_key === fieldKey);
    return field ? field.is_active !== false : false;
  };

  // Helper to check if a field is required
  const isFieldRequired = (fieldKey) => {
    const field = formConfig.fields?.find(f => f.field_key === fieldKey);
    return field ? field.is_required === true : false;
  };

  // Get relation options from config
  const getRelationOptions = () => {
    const field = formConfig.fields?.find(f => f.field_key === 'relationship');
    return field?.options || [
      { value: 'parent', label_es: 'Padre/Madre' },
      { value: 'guardian', label_es: 'Tutor Legal' },
      { value: 'grandparent', label_es: 'Abuelo/a' },
      { value: 'representative', label_es: 'Representante' },
      { value: 'other', label_es: 'Otro' }
    ];
  };

  // Create empty student object
  const createEmptyStudent = () => ({
    id: Date.now(),
    nombre_estudiante: '',
    numero_estudiante: '',
    anio: String(new Date().getFullYear()),
    grado: '',
    relacion: '',
    relacion_otro: '',
    notas: ''
  });

  const handleOpenVincular = async (programa) => {
    setSelectedPrograma(programa);
    const currentYear = String(new Date().getFullYear());
    setFormData({
      nombre_estudiante: '',
      numero_estudiante: '',
      anio: currentYear,
      grado: '',
      relacion: '',
      relacion_otro: '',
      notas: ''
    });
    setEditingId(null);
    // Initialize with one empty student for multi-add
    setMultipleStudents([createEmptyStudent()]);
    
    // Refresh form config to get latest field settings
    try {
      const configRes = await fetch(`${API_URL}/api/store/form-config/textbook_access`);
      if (configRes.ok) {
        const config = await configRes.json();
        setFormConfig(config);
      }
    } catch (error) {
      console.error('Error refreshing form config:', error);
    }
    
    setShowVincularDialog(true);
  };

  const handleEditEstudiante = (estudiante) => {
    setFormData({
      nombre_estudiante: estudiante.nombre || '',
      numero_estudiante: estudiante.numero_estudiante || estudiante.sync_id || '',
      anio: estudiante.anio || String(new Date().getFullYear()),
      grado: estudiante.grado || '',
      relacion: estudiante.relacion || '',
      relacion_otro: estudiante.relacion_otro || '',
      notas: estudiante.notas || ''
    });
    setEditingId(estudiante.sync_id || estudiante.vinculacion_id);
    setSelectedPrograma(PROGRAMAS_EXCLUSIVOS[0]); // PCA por defecto
    setMultipleStudents([]); // Clear multiple students when editing
    setShowVincularDialog(true);
  };

  // Functions for multiple students
  const addStudentRow = () => {
    setMultipleStudents(prev => [...prev, createEmptyStudent()]);
  };

  const removeStudentRow = (id) => {
    if (multipleStudents.length > 1) {
      setMultipleStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateStudentRow = (id, field, value) => {
    setMultipleStudents(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmitVinculacion = async () => {
    // If editing, use single form data
    if (editingId) {
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
      if (formData.relacion === 'other' && !formData.relacion_otro?.trim()) {
        toast.error('Por favor especifica la relación');
        return;
      }

      try {
        setSaving(true);
        
        const payload = {
          sync_id: isFieldActive('student_id_number') ? formData.numero_estudiante?.trim() : undefined,
          nombre: formData.nombre_estudiante.trim(),
          anio: formData.anio,
          grado: formData.grado || 'Por verificar',
          relacion: formData.relacion === 'other' ? formData.relacion_otro : formData.relacion,
          notas: isFieldActive('notes') ? formData.notas : undefined,
          programa: selectedPrograma?.id || 'pca'
        };

        const response = await fetch(`${API_URL}/api/store/vinculacion/actualizar/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Estudiante actualizado');
          setShowVincularDialog(false);
          fetchData();
        } else {
          toast.error(data.detail || 'Error al procesar solicitud');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al procesar solicitud');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Creating multiple students
    const validStudents = multipleStudents.filter(s => s.nombre_estudiante.trim());
    
    if (validStudents.length === 0) {
      toast.error('Por favor ingresa al menos un nombre de estudiante');
      return;
    }

    // Validate all students
    for (let i = 0; i < validStudents.length; i++) {
      const s = validStudents[i];
      const num = i + 1;
      if (isFieldActive('student_id_number') && isFieldRequired('student_id_number') && !s.numero_estudiante?.trim()) {
        toast.error(`Estudiante ${num}: Por favor ingresa el número de estudiante`);
        return;
      }
      if (!s.anio) {
        toast.error(`Estudiante ${num}: Por favor selecciona el año`);
        return;
      }
      if (!s.grado) {
        toast.error(`Estudiante ${num}: Por favor selecciona el grado`);
        return;
      }
      if (!s.relacion) {
        toast.error(`Estudiante ${num}: Por favor selecciona la relación`);
        return;
      }
      if (s.relacion === 'other' && !s.relacion_otro?.trim()) {
        toast.error(`Estudiante ${num}: Por favor especifica la relación`);
        return;
      }
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const student of validStudents) {
        try {
          const payload = {
            sync_id: isFieldActive('student_id_number') ? student.numero_estudiante?.trim() : undefined,
            nombre: student.nombre_estudiante.trim(),
            anio: student.anio,
            grado: student.grado || 'Por verificar',
            relacion: student.relacion === 'other' ? student.relacion_otro : student.relacion,
            notas: isFieldActive('notes') ? student.notas : undefined,
            programa: selectedPrograma?.id || 'pca'
          };

          const response = await fetch(`${API_URL}/api/store/vinculacion/solicitar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} estudiante${successCount > 1 ? 's' : ''} vinculado${successCount > 1 ? 's' : ''} exitosamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} estudiante${errorCount > 1 ? 's' : ''} no se pudo${errorCount > 1 ? 'ieron' : ''} vincular`);
      }
      
      setShowVincularDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar solicitudes');
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
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {editingId ? 'Editar Estudiante' : 'Vincular Estudiantes'}
            </DialogTitle>
            <DialogDescription>
              {selectedPrograma?.nombre || 'Programa Exclusivo'} - {editingId ? 'Edita la información del estudiante' : 'Puedes agregar uno o más estudiantes a la vez'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] pr-4">
            {editingId ? (
              /* Single student edit form */
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

                {/* Número de estudiante - only if active */}
                {isFieldActive('student_id_number') && (
                  <div className="space-y-2">
                    <Label htmlFor="numero_estudiante">
                      Número de Estudiante {isFieldRequired('student_id_number') && <span className="text-destructive">*</span>}
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
                )}

                {/* Año */}
                <div className="space-y-2">
                  <Label>Año Escolar <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.anio}
                    onValueChange={(value) => setFormData({ ...formData, anio: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el año" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grado - dropdown */}
                <div className="space-y-2">
                  <Label>Grado <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.grado}
                    onValueChange={(value) => setFormData({ ...formData, grado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADOS.map((grado) => (
                        <SelectItem key={grado.value} value={grado.value}>
                          {grado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Relación con el estudiante */}
                <div className="space-y-2">
                  <Label>
                    Relación con el Estudiante <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.relacion}
                    onValueChange={(value) => setFormData({ ...formData, relacion: value, relacion_otro: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu relación" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRelationOptions().map((rel) => (
                        <SelectItem key={rel.value} value={rel.value}>
                          {rel.label_es || rel.label_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo "Otro" - solo si seleccionó "other" */}
                {formData.relacion === 'other' && (
                  <div className="space-y-2">
                    <Label>Especifica la relación <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.relacion_otro}
                      onChange={(e) => setFormData({ ...formData, relacion_otro: e.target.value })}
                      placeholder="Ej: Tío, Padrino, etc."
                    />
                  </div>
                )}

                {/* Notas adicionales - only if active */}
                {isFieldActive('notes') && (
                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas Adicionales (opcional)</Label>
                    <Input
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Información adicional si es necesario"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Multiple students form */
              <div className="space-y-4 py-4">
                {/* Nombre del acudiente (auto-filled) */}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Acudiente</Label>
                  <p className="font-medium">{user?.nombre || user?.email}</p>
                </div>

                {multipleStudents.map((student, index) => (
                  <Card key={student.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-purple-600" />
                          Estudiante {index + 1}
                        </CardTitle>
                        {multipleStudents.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStudentRow(student.id)}
                            className="text-destructive hover:text-destructive h-8"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Quitar
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Row 1: Name */}
                      <div className="space-y-2">
                        <Label>Nombre Completo <span className="text-destructive">*</span></Label>
                        <Input
                          value={student.nombre_estudiante}
                          onChange={(e) => updateStudentRow(student.id, 'nombre_estudiante', e.target.value)}
                          placeholder="Ej: Juan Carlos Pérez"
                        />
                      </div>

                      {/* Student Number - only if active */}
                      {isFieldActive('student_id_number') && (
                        <div className="space-y-2">
                          <Label>
                            Número de Estudiante {isFieldRequired('student_id_number') && <span className="text-destructive">*</span>}
                          </Label>
                          <Input
                            value={student.numero_estudiante}
                            onChange={(e) => updateStudentRow(student.id, 'numero_estudiante', e.target.value)}
                            placeholder="Ej: STU-2024-001"
                          />
                        </div>
                      )}
                      
                      {/* Row 2: Year and Grade */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Año Escolar <span className="text-destructive">*</span></Label>
                          <Select
                            value={student.anio}
                            onValueChange={(v) => updateStudentRow(student.id, 'anio', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableYears().map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                  {year.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Grado <span className="text-destructive">*</span></Label>
                          <Select
                            value={student.grado}
                            onValueChange={(v) => updateStudentRow(student.id, 'grado', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADOS.map((grado) => (
                                <SelectItem key={grado.value} value={grado.value}>
                                  {grado.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Relation */}
                      <div className="space-y-2">
                        <Label>Relación <span className="text-destructive">*</span></Label>
                        <Select
                          value={student.relacion}
                          onValueChange={(v) => updateStudentRow(student.id, 'relacion', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            {getRelationOptions().map((rel) => (
                              <SelectItem key={rel.value} value={rel.value}>
                                {rel.label_es || rel.label_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campo "Otro" - solo si seleccionó "other" */}
                      {student.relacion === 'other' && (
                        <div className="space-y-2">
                          <Label>Especifica la relación <span className="text-destructive">*</span></Label>
                          <Input
                            value={student.relacion_otro}
                            onChange={(e) => updateStudentRow(student.id, 'relacion_otro', e.target.value)}
                            placeholder="Ej: Tío, Padrino, etc."
                          />
                        </div>
                      )}
                      
                      {/* Notas (optional) - only if active */}
                      {isFieldActive('notes') && (
                        <div className="space-y-2">
                          <Label>Notas Adicionales (opcional)</Label>
                          <Input
                            value={student.notas}
                            onChange={(e) => updateStudentRow(student.id, 'notas', e.target.value)}
                            placeholder="Información adicional si es necesario"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Add Another Button - Only show when creating new students */}
            {!editingId && (
              <Button
                variant="outline"
                onClick={addStudentRow}
                className="w-full sm:w-auto sm:mr-auto"
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Otro Estudiante
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setShowVincularDialog(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button onClick={handleSubmitVinculacion} disabled={saving} className="flex-1 sm:flex-none">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? 'Guardar Cambios' : (multipleStudents.length > 1 ? 'Enviar Todas' : 'Enviar Solicitud')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
