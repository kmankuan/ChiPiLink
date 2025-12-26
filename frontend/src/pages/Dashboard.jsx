import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  Package,
  GraduationCap,
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, api } = useAuth();
  
  const [estudiantes, setEstudiantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    grado: '',
    escuela: '',
    notas: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [estudiantesRes, pedidosRes, gradosRes] = await Promise.all([
        api.get('/estudiantes'),
        api.get('/pedidos'),
        api.get('/grados')
      ]);
      
      setEstudiantes(estudiantesRes.data);
      setPedidos(pedidosRes.data);
      setGrados(gradosRes.data.grados);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingStudent) {
        await api.put(`/estudiantes/${editingStudent.estudiante_id}`, formData);
        toast.success('Estudiante actualizado');
      } else {
        await api.post('/estudiantes', formData);
        toast.success('Estudiante agregado');
      }
      
      setDialogOpen(false);
      setEditingStudent(null);
      setFormData({ nombre: '', grado: '', escuela: '', notas: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al guardar estudiante');
    }
  };

  const handleEdit = (estudiante) => {
    setEditingStudent(estudiante);
    setFormData({
      nombre: estudiante.nombre,
      grado: estudiante.grado,
      escuela: estudiante.escuela || '',
      notas: estudiante.notas || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (estudianteId) => {
    if (!confirm(t('student.confirmDelete'))) return;
    
    try {
      await api.delete(`/estudiantes/${estudianteId}`);
      toast.success('Estudiante eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar estudiante');
    }
  };

  const openNewStudentDialog = () => {
    setEditingStudent(null);
    setFormData({ nombre: '', grado: '', escuela: '', notas: '' });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl" data-testid="parent-dashboard">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          {t('dashboard.welcome')}, {user?.nombre?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Administre sus estudiantes y realice pedidos de libros
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-6 soft-shadow" data-testid="students-stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{estudiantes.length}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.myStudents')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-6 soft-shadow" data-testid="orders-stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <Package className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pedidos.length}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.myOrders')}</p>
            </div>
          </div>
        </div>
        
        <Link to="/orden" className="block" data-testid="order-cta-card">
          <div className="bg-primary text-primary-foreground rounded-xl p-6 soft-shadow h-full flex items-center justify-between group cursor-pointer hover:bg-primary/90 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <p className="font-medium">{t('dashboard.orderTextbooks')}</p>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Students Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold">{t('dashboard.myStudents')}</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewStudentDialog} className="rounded-full" data-testid="add-student-button">
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.addStudent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {editingStudent ? t('student.editStudent') : t('student.addStudent')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">{t('student.name')} *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del estudiante"
                    required
                    data-testid="student-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="grado">{t('student.grade')} *</Label>
                  <Select 
                    value={formData.grado} 
                    onValueChange={(value) => setFormData({ ...formData, grado: value })}
                    required
                  >
                    <SelectTrigger data-testid="student-grade-select">
                      <SelectValue placeholder="Seleccione un grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {grados.map((grado) => (
                        <SelectItem key={grado.id} value={grado.id}>
                          {grado.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="escuela">{t('student.school')}</Label>
                  <Input
                    id="escuela"
                    value={formData.escuela}
                    onChange={(e) => setFormData({ ...formData, escuela: e.target.value })}
                    placeholder="Nombre de la escuela"
                    data-testid="student-school-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notas">{t('student.notes')}</Label>
                  <Input
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Notas adicionales"
                    data-testid="student-notes-input"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" data-testid="save-student-button">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {estudiantes.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border" data-testid="no-students-message">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{t('dashboard.noStudents')}</p>
            <Button onClick={openNewStudentDialog} variant="outline" className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.addStudent')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estudiantes.map((estudiante) => (
              <div 
                key={estudiante.estudiante_id}
                className="bg-card rounded-xl border border-border p-6 soft-shadow group"
                data-testid={`student-card-${estudiante.estudiante_id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{estudiante.nombre}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`grades.${estudiante.grado}`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(estudiante)}
                      data-testid={`edit-student-${estudiante.estudiante_id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(estudiante.estudiante_id)}
                      data-testid={`delete-student-${estudiante.estudiante_id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {estudiante.escuela && (
                  <p className="text-sm text-muted-foreground mb-2">
                    📍 {estudiante.escuela}
                  </p>
                )}
                
                <Link to={`/orden?estudiante=${estudiante.estudiante_id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2 rounded-full" data-testid={`order-for-${estudiante.estudiante_id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Ordenar libros
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold">{t('dashboard.recentOrders')}</h2>
          <Link to="/pedidos">
            <Button variant="ghost" className="rounded-full">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {pedidos.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border" data-testid="no-orders-message">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dashboard.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.slice(0, 5).map((pedido) => (
              <div 
                key={pedido.pedido_id}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                data-testid={`order-row-${pedido.pedido_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pedido.estado === 'entregado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    pedido.estado === 'confirmado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    pedido.estado === 'cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {t(`status.${pedido.estado}`)}
                  </div>
                  <div>
                    <p className="font-medium">{pedido.pedido_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.estudiante_nombre} • {pedido.items?.length || 0} libros
                    </p>
                  </div>
                </div>
                <p className="font-bold text-lg">${pedido.total?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
