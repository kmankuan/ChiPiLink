import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Search, Loader2, RefreshCw, Upload, GraduationCap } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function EstudiantesTab({ token }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  const fetchEstudiantes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/store/students/sincronizados`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setEstudiantes(data.estudiantes || []);
    } catch (error) {
      console.error('Error fetching estudiantes:', error);
      toast.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredEstudiantes = estudiantes.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.nombre_completo?.toLowerCase().includes(term) ||
      e.numero_estudiante?.toLowerCase().includes(term) ||
      e.grado?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Estudiantes PCA</CardTitle>
                <CardDescription>
                  Estudiantes de Panama Christian Academy sincronizados en el sistema
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchEstudiantes}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/book-orders'}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, número o grado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{estudiantes.length}</div>
            <p className="text-xs text-muted-foreground">Total Estudiantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {[...new Set(estudiantes.map(e => e.grado).filter(Boolean))].length}
            </div>
            <p className="text-xs text-muted-foreground">Grados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {estudiantes.filter(e => e.has_access).length}
            </div>
            <p className="text-xs text-muted-foreground">Con Acceso Aprobado</p>
          </CardContent>
        </Card>
      </div>

      {filteredEstudiantes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay estudiantes registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Sección</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstudiantes.map((e) => (
                    <TableRow key={e.sync_id}>
                      <TableCell className="font-mono">{e.numero_estudiante}</TableCell>
                      <TableCell className="font-medium">{e.nombre_completo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.grado}</Badge>
                      </TableCell>
                      <TableCell>{e.seccion || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={e.has_access ? 'default' : 'outline'}>
                          {e.has_access ? 'Con Acceso' : 'Sin Acceso'}
                        </Badge>
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
