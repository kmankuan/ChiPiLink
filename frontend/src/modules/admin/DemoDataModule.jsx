import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Database, 
  Play, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Trophy,
  Wallet,
  Bell,
  Loader2,
  Gamepad2,
  Target,
  Medal
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL || '';

export default function DemoDataModule() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/seed/demo-stats`);
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
  }, []);

  const handleSeedData = async () => {
    setSeeding(true);
    setLastResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/seed/demo-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastResult(data.results);
        toast.success('¡Datos demo creados exitosamente!');
        fetchStats();
      } else {
        toast.error('Error al crear datos demo');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Error de conexión');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setShowClearDialog(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/seed/demo-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Datos demo eliminados');
        setLastResult(null);
        fetchStats();
      } else {
        toast.error('Error al eliminar datos');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Error de conexión');
    } finally {
      setClearing(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
    <div className="space-y-6" data-testid="demo-data-module">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Datos de Demostración</CardTitle>
                <CardDescription>
                  Genera datos ficticios para probar y demostrar la aplicación
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
              onClick={handleSeedData}
              disabled={seeding || clearing}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid="seed-demo-btn"
            >
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando datos...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Crear Datos Demo
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              disabled={seeding || clearing}
              data-testid="clear-demo-btn"
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
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>Datos creados:</strong>{' '}
            {lastResult.pinpanclub?.players_created || 0} jugadores, {' '}
            {(lastResult.pinpanclub?.superpin_matches_created || 0) + (lastResult.pinpanclub?.rapidpin_matches_created || 0)} partidos, {' '}
            {lastResult.users_wallets?.users_created || 0} usuarios demo
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PinPanClub Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">PinPanClub</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={Users} 
                title="Jugadores" 
                value={stats?.pinpanclub?.players || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Gamepad2} 
                title="Super Pin" 
                value={stats?.pinpanclub?.superpin_matches || 0}
                color="bg-green-500"
                subtitle="partidos"
              />
              <StatCard 
                icon={Gamepad2} 
                title="Rapid Pin" 
                value={stats?.pinpanclub?.rapidpin_matches || 0}
                color="bg-yellow-500"
                subtitle="partidos"
              />
              <StatCard 
                icon={Target} 
                title="Retos" 
                value={stats?.pinpanclub?.challenges || 0}
                color="bg-purple-500"
              />
              <StatCard 
                icon={Medal} 
                title="Logros" 
                value={stats?.pinpanclub?.achievements || 0}
                color="bg-pink-500"
              />
              <StatCard 
                icon={Trophy} 
                title="Torneos" 
                value={stats?.pinpanclub?.tournaments || 0}
                color="bg-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users & Wallets Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Usuarios & Wallets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon={Users} 
                title="Perfiles" 
                value={stats?.users_wallets?.profiles || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Wallet} 
                title="Wallets" 
                value={stats?.users_wallets?.wallets || 0}
                color="bg-green-500"
              />
              <StatCard 
                icon={RefreshCw} 
                title="Transacciones" 
                value={stats?.users_wallets?.transactions || 0}
                color="bg-purple-500"
              />
              <StatCard 
                icon={Bell} 
                title="Posts" 
                value={stats?.notifications?.posts || 0}
                color="bg-orange-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Memberships Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Membresías</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <StatCard 
                icon={FileText} 
                title="Planes" 
                value={stats?.memberships?.plans || 0}
                color="bg-blue-500"
              />
              <StatCard 
                icon={Users} 
                title="Membresías" 
                value={stats?.memberships?.memberships || 0}
                color="bg-green-500"
              />
              <StatCard 
                icon={CheckCircle2} 
                title="Visitas" 
                value={stats?.memberships?.visits || 0}
                color="bg-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              ¿Qué incluyen los datos demo?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>12 jugadores</strong> con apodos creativos (El Rayo, La Tigresa, Dragon...)</p>
            <p>• <strong>50 partidos</strong> con resultados realistas</p>
            <p>• <strong>Rankings y clasificaciones</strong> generados</p>
            <p>• <strong>Retos y logros</strong> activos</p>
            <p>• <strong>1 torneo</strong> con inscripciones abiertas</p>
            <p>• <strong>3 usuarios demo</strong> con wallets y transacciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar todos los datos de demostración?
              Esta acción eliminará jugadores demo, partidos ficticios y usuarios de prueba.
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

// Missing import fix
import { FileText } from 'lucide-react';
