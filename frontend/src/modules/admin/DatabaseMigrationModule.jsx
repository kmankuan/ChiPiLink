/**
 * Database Migration Module
 * Admin interface for running database migrations
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Database,
  Play,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DatabaseMigrationModule() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const token = localStorage.getItem('auth_token');

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await axios.get(`${API_URL}/api/migrations/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
      setMigrationResult(null);
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Error checking migration status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const runMigration = async (dryRun = true) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/migrations/spanish-to-english?dry_run=${dryRun}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMigrationResult(response.data);
      
      if (!dryRun && response.data.success) {
        toast.success('Migration completed successfully!');
        // Refresh status after actual migration
        await checkStatus();
      }
    } catch (error) {
      console.error('Error running migration:', error);
      toast.error(error.response?.data?.detail || 'Error running migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Migration
          </CardTitle>
          <CardDescription>
            Convert Spanish field names to English in the database for codebase consistency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={checkStatus}
              disabled={checkingStatus}
              data-testid="check-migration-status"
            >
              {checkingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Status
            </Button>
            
            <Button
              variant="outline"
              onClick={() => runMigration(true)}
              disabled={loading}
              data-testid="preview-migration"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Changes
            </Button>
            
            <Button
              onClick={() => runMigration(false)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
              data-testid="run-migration"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Migration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {status.needs_migration ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Migration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={status.needs_migration ? "warning" : "default"}>
              <AlertTitle>
                {status.needs_migration ? 'Migration Needed' : 'All Good!'}
              </AlertTitle>
              <AlertDescription>
                {status.recommendation}
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(status.collections).map(([name, data]) => (
                <Card key={name} className="border">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm truncate">{name}</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spanish:</span>
                        <Badge variant={data.spanish_fields > 0 ? "destructive" : "secondary"}>
                          {data.spanish_fields}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">English:</span>
                        <Badge variant="outline">{data.english_fields}</Badge>
                      </div>
                    </div>
                    {data.needs_migration && (
                      <Badge className="mt-2 w-full justify-center bg-amber-100 text-amber-800">
                        Needs Migration
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Result */}
      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {migrationResult.dry_run ? 'Preview Result' : 'Migration Result'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={migrationResult.success ? "default" : "destructive"}>
              <AlertTitle className="flex items-center gap-2">
                {migrationResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {migrationResult.message}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Duration: {migrationResult.duration_seconds}s</p>
                  <p>Total documents migrated: <strong>{migrationResult.total_documents_migrated}</strong></p>
                </div>
              </AlertDescription>
            </Alert>

            {migrationResult.dry_run && migrationResult.total_documents_migrated > 0 && (
              <Alert>
                <AlertTitle>Next Step</AlertTitle>
                <AlertDescription className="flex items-center gap-2">
                  Click "Run Migration" to apply these changes
                  <ArrowRight className="h-4 w-4" />
                </AlertDescription>
              </Alert>
            )}

            {/* Collection Details */}
            <div className="space-y-3">
              <h4 className="font-medium">Collection Details:</h4>
              {migrationResult.collections.map((col) => (
                <Card key={col.collection} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{col.collection}</h5>
                      <Badge variant={
                        col.status === 'completed' ? 'default' :
                        col.status === 'preview' ? 'secondary' :
                        'outline'
                      }>
                        {col.status}
                      </Badge>
                    </div>
                    
                    {col.message ? (
                      <p className="text-sm text-muted-foreground">{col.message}</p>
                    ) : (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Migrated:</span>{' '}
                        <strong>{col.migrated}</strong> / {col.total} documents
                      </p>
                    )}

                    {col.sample_changes && col.sample_changes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Sample changes:</p>
                        <div className="space-y-1">
                          {col.sample_changes.map((change, idx) => (
                            <code key={idx} className="block text-xs bg-muted px-2 py-1 rounded">
                              {change.field}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Errors */}
            {migrationResult.errors && migrationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {migrationResult.errors.map((err, idx) => (
                      <li key={idx}>{err.collection}: {err.error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!status && !migrationResult && (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Click "Check Status" to see if your database needs migration
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>1.</strong> Check Status - See which collections have Spanish field names</p>
              <p><strong>2.</strong> Preview Changes - See what will be migrated (dry run)</p>
              <p><strong>3.</strong> Run Migration - Apply the changes to your database</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
