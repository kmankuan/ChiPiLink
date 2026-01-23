/**
 * MisAcudidos - Componente para gestionar usuarios acudidos (dependientes)
 * Permite crear, ver y gestionar cuentas de menores/dependientes
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  UserPlus,
  Wallet,
  Send,
  Loader2,
  Calendar,
  CreditCard,
  History
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MisAcudidos({ token, onTransfer }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [acudidos, setAcudidos] = useState([]);
  
  // Estado para crear acudido
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    fecha_nacimiento: '',
    genero: '',
    notas: ''
  });

  useEffect(() => {
    loadAcudidos();
  }, []);

  const loadAcudidos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/conexiones/mis-acudidos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAcudidos(data.acudidos || []);
      }
    } catch (err) {
      console.error('Error loading acudidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/conexiones/crear-acudido`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim() || null,
          email: formData.email.trim() || null,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          genero: formData.genero || null,
          notas: formData.notas.trim() || null
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      
      toast.success(t('acudidos.created'));
      setShowCreateDialog(false);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        fecha_nacimiento: '',
        genero: '',
        notas: ''
      });
      loadAcudidos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t('acudidos.title')}
          </h2>
          <p className="text-muted-foreground">{t('acudidos.subtitle')}</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('acudidos.addAcudido')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('acudidos.createAccount')}</DialogTitle>
              <DialogDescription>
                Crea una cuenta para tu dependiente (hijo, familiar a cargo, etc.)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('acudidos.name')} *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('acudidos.lastName')}</Label>
                  <Input
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Correo (opcional)</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="correo@ejemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Se usará cuando el acudido active su cuenta
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('acudidos.birthDate')}</Label>
                  <Input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('acudidos.gender')}</Label>
                  <Select 
                    value={formData.genero} 
                    onValueChange={(v) => setFormData({...formData, genero: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('acudidos.genderOptions.male')}</SelectItem>
                      <SelectItem value="female">{t('acudidos.genderOptions.female')}</SelectItem>
                      <SelectItem value="other">{t('acudidos.genderOptions.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t('acudidos.notes')}</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={handleCreate} 
                disabled={creating || !formData.nombre.trim()}
                className="w-full"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Crear cuenta acudida
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {acudidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('acudidos.noAcudidos')}</p>
            <Button 
              variant="link" 
              onClick={() => setShowCreateDialog(true)}
              className="mt-2"
            >
              {t('acudidos.addAcudido')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {acudidos.map((acudido) => {
            const age = calculateAge(acudido.fecha_nacimiento);
            
            return (
              <Card key={acudido.user_id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={acudido.usuario_avatar} />
                      <AvatarFallback className="text-lg">
                        {acudido.usuario_nombre?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {acudido.usuario_nombre}
                        <Badge variant="secondary" className="text-xs font-normal">
                          {t('acudidos.accountStatus.acudido')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {age !== null && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>{age} años</span>
                          </>
                        )}
                        {acudido.etiqueta && (
                          <>
                            <span>•</span>
                            <span>{acudido.etiqueta}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Wallet del acudido */}
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t('acudidos.wallet')}</span>
                      </div>
                      <span className="text-2xl font-bold">
                        ${acudido.wallet?.USD?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onTransfer && onTransfer(acudido)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('acudidos.transfer')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // TODO: Mostrar historial de transacciones
                        toast.info('Historial próximamente');
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      {t('acudidos.viewHistory')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
