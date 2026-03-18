/**
 * Integration Hub Dashboard
 * Admin UI for managing the Integration Hub — jobs, integrations, connections, logs
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle,
  Activity, Cpu, HardDrive, Clock, Play, RotateCcw, Trash2,
  Plug, Wifi, WifiOff, Send, Mail, Bell, Database, Users,
  ClipboardList
} from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const INTEGRATION_ICONS = {
  monday: ClipboardList, telegram: Send, gmail: Mail,
  onesignal: Bell, laopan: Users, fusebase: Database,
};

const STATUS_STYLES = {
  connected: 'bg-green-100 text-green-700',
  not_configured: 'bg-gray-100 text-gray-500',
  auth_failed: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  planned: 'bg-blue-100 text-blue-600',
};

const JOB_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function HubDashboardModule() {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);
  const [hubStatus, setHubStatus] = useState(null);
  const [hubDown, setHubDown] = useState(false);
  const [jobs, setJobs] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [connections, setConnections] = useState(null);
  const [testing, setTesting] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setHubDown(false);
    try {
      const [statusRes, jobsRes, intRes] = await Promise.all([
        fetch(`${API}/api/hub/status`, { headers }),
        fetch(`${API}/api/hub/jobs?limit=20`, { headers }),
        fetch(`${API}/api/hub/integrations`, { headers }),
      ]);

      if (statusRes.status === 503) {
        setHubDown(true);
        setLoading(false);
        return;
      }

      if (statusRes.ok) setHubStatus(await statusRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (intRes.ok) setIntegrations(await intRes.json());
    } catch (err) {
      setHubDown(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const testConnection = async (id) => {
    setTesting(id);
    try {
      const res = await fetch(`${API}/api/hub/integrations/${id}/test`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${id}: Connected (${data.latency_ms?.toFixed(0)}ms)`);
      } else {
        toast.error(`${id}: ${data.error}`);
      }
      fetchAll();
    } catch { toast.error('Test failed'); }
    finally { setTesting(null); }
  };

  const retryJob = async (jobId) => {
    setRetrying(jobId);
    try {
      await fetch(`${API}/api/hub/jobs/${jobId}/retry`, { method: 'POST', headers });
      toast.success('Job queued for retry');
      fetchAll();
    } catch { toast.error('Retry failed'); }
    finally { setRetrying(null); }
  };

  const retryAllFailed = async () => {
    try {
      const res = await fetch(`${API}/api/hub/jobs/retry-all-failed`, { method: 'POST', headers });
      const data = await res.json();
      toast.success(`Retrying ${data.retried} failed jobs`);
      fetchAll();
    } catch { toast.error('Retry failed'); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (hubDown) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" /> Integration Hub
        </h2>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-8 text-center">
            <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Hub Not Reachable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              The Integration Hub (port 8002) is not responding. It may not be running on this deployment.
            </p>
            <Button onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sys = hubStatus?.system || {};
  const jobCounts = hubStatus?.jobs || {};

  return (
    <div className="space-y-4" data-testid="hub-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Integration Hub
          </h2>
          <p className="text-sm text-muted-foreground">Background jobs, integrations, and system health</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Wifi className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-bold text-green-600">Online</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <HardDrive className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Memory</div>
            <div className="text-sm font-bold">{sys.memory_mb || 0} MB</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Cpu className="h-4 w-4 text-purple-500 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">CPU</div>
            <div className="text-sm font-bold">{sys.cpu_percent || 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Uptime</div>
            <div className="text-sm font-bold">{sys.uptime_hours || 0}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Processed</div>
            <div className="text-sm font-bold">{jobCounts.total_processed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-3">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="jobs">
            Jobs
            {(jobCounts.pending > 0 || jobCounts.failed > 0) && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] h-4 px-1">
                {(jobCounts.pending || 0) + (jobCounts.failed || 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Integrations</CardTitle>
              <CardDescription>Connected services and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {(integrations?.integrations || []).map((int_) => {
                  const Icon = INTEGRATION_ICONS[int_.id] || Plug;
                  return (
                    <div key={int_.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{int_.name}</p>
                          <Badge className={`text-[10px] ${STATUS_STYLES[int_.status] || 'bg-gray-100'}`}>
                            {int_.status}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => testConnection(int_.id)}
                        disabled={testing === int_.id || int_.status === 'planned'}
                      >
                        {testing === int_.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3 mr-1" />}
                        Test
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Job Queue</CardTitle>
                  <CardDescription>
                    {jobCounts.pending || 0} pending · {jobCounts.running || 0} running · {jobCounts.done_today || 0} done today · {jobCounts.failed || 0} failed
                  </CardDescription>
                </div>
                {(jobCounts.failed || 0) > 0 && (
                  <Button size="sm" variant="outline" onClick={retryAllFailed} className="text-xs h-7">
                    <RotateCcw className="h-3 w-3 mr-1" /> Retry All Failed
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(jobs?.jobs || []).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No jobs yet</TableCell></TableRow>
                    )}
                    {(jobs?.jobs || []).map((job) => (
                      <TableRow key={job.job_id}>
                        <TableCell className="font-mono text-xs">{job.job_id}</TableCell>
                        <TableCell className="text-xs">{job.type}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${JOB_STATUS_STYLES[job.status] || ''}`}>{job.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{job.source}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {job.created_at ? new Date(job.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell>
                          {job.status === 'failed' && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs"
                              onClick={() => retryJob(job.job_id)}
                              disabled={retrying === job.job_id}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
