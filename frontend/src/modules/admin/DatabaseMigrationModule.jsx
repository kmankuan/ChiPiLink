/**
 * Database Migration Component
 * Allows admin to run database migrations with one click
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DatabaseMigrationModule() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const runMigration = async () => {
    if (!window.confirm('¿Estás seguro de ejecutar la migración de base de datos?\n\nEsto renombrará las colecciones a los nuevos nombres.\nSe crearán backups automáticamente.')) {
      return;
    }

    setMigrating(true);
    setResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API}/api/admin/migrate-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Read response text first
      const text = await response.text();
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server response: ${text.substring(0, 200)}`);
      }

      if (response.ok) {
        setResult({ success: true, data });
        toast.success('Migración completada exitosamente');
      } else {
        setResult({ success: false, error: data.detail || 'Error en la migración' });
        toast.error(data.detail || 'Error en la migración');
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error('Error: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migración de Base de Datos
          </CardTitle>
          <CardDescription>
            Ejecuta la migración para actualizar los nombres de las colecciones al nuevo estándar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>
              Esta migración renombrará las siguientes colecciones:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>schools</code> → <code>store_schools</code></li>
                <li><code>textbook_access_students</code> → <code>store_students</code></li>
                <li><code>form_field_configs</code> → <code>store_form_configs</code></li>
                <li><code>users_profiles</code> → <code>user_profiles</code></li>
              </ul>
              <p className="mt-2 text-sm">Se crearán backups automáticamente antes de cada cambio.</p>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={runMigration} 
            disabled={migrating}
            size="lg"
            className="w-full"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ejecutando migración...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Ejecutar Migración
              </>
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? 'Migración Exitosa' : 'Error'}</AlertTitle>
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2 mt-2">
                    <p><strong>Colecciones renombradas:</strong> {result.data.renamed?.length || 0}</p>
                    <p><strong>Colecciones eliminadas:</strong> {result.data.deleted?.length || 0}</p>
                    {result.data.renamed?.length > 0 && (
                      <ul className="list-disc list-inside text-sm">
                        {result.data.renamed.map((r, i) => (
                          <li key={i}>{r.from} → {r.to}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-sm mt-2">Los backups se crearon con prefijo <code>_backup_</code></p>
                  </div>
                ) : (
                  result.error
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
