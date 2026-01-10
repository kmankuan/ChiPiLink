/**
 * ProviderConfig - Configuración de proveedores de notificaciones (Admin)
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Cloud, RefreshCw, Check, X, Key, AlertCircle, Server } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProviderConfig({ token }) {
  const { i18n } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const lang = i18n.language || 'es';

  const texts = {
    es: {
      title: 'Proveedores de Push',
      subtitle: 'Configura FCM y OneSignal para enviar notificaciones',
      fcm: 'Firebase Cloud Messaging',
      fcmDesc: 'Proveedor de Google para Android/iOS/Web',
      onesignal: 'OneSignal',
      onesignalDesc: 'Plataforma cross-platform de notificaciones',
      enabled: 'Habilitado',
      apiKey: 'API Key',
      appId: 'App ID',
      projectId: 'Project ID',
      weight: 'Peso de balanceo',
      rateLimit: 'Límite por minuto',
      status: 'Estado',
      active: 'Activo',
      inactive: 'Inactivo',
      error: 'Error',
      save: 'Guardar',
      saving: 'Guardando...',
      saved: 'Configuración guardada',
      loadBalancing: 'Balanceo de Carga',
      weighted: 'Por peso',
      roundRobin: 'Round Robin',
      leastLoaded: 'Menor carga',
      failover: 'Failover automático',
      failoverDesc: 'Cambiar proveedor si hay errores',
      defaultProvider: 'Proveedor por defecto',
      auto: 'Automático',
      mockWarning: 'Sin proveedores configurados. Usando modo simulado.'
    },
    en: {
      title: 'Push Providers',
      subtitle: 'Configure FCM and OneSignal to send notifications',
      fcm: 'Firebase Cloud Messaging',
      fcmDesc: 'Google provider for Android/iOS/Web',
      onesignal: 'OneSignal',
      onesignalDesc: 'Cross-platform notification platform',
      enabled: 'Enabled',
      apiKey: 'API Key',
      appId: 'App ID',
      projectId: 'Project ID',
      weight: 'Load weight',
      rateLimit: 'Rate limit per minute',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      error: 'Error',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Configuration saved',
      loadBalancing: 'Load Balancing',
      weighted: 'Weighted',
      roundRobin: 'Round Robin',
      leastLoaded: 'Least Loaded',
      failover: 'Automatic Failover',
      failoverDesc: 'Switch provider on errors',
      defaultProvider: 'Default Provider',
      auto: 'Automatic',
      mockWarning: 'No providers configured. Using mock mode.'
    },
    zh: {
      title: '推送服务提供商',
      subtitle: '配置FCM和OneSignal以发送通知',
      fcm: 'Firebase Cloud Messaging',
      fcmDesc: 'Google的Android/iOS/Web提供商',
      onesignal: 'OneSignal',
      onesignalDesc: '跨平台通知平台',
      enabled: '启用',
      apiKey: 'API密钥',
      appId: '应用ID',
      projectId: '项目ID',
      weight: '负载权重',
      rateLimit: '每分钟限制',
      status: '状态',
      active: '活跃',
      inactive: '非活跃',
      error: '错误',
      save: '保存',
      saving: '保存中...',
      saved: '配置已保存',
      loadBalancing: '负载均衡',
      weighted: '按权重',
      roundRobin: '轮询',
      leastLoaded: '最小负载',
      failover: '自动故障转移',
      failoverDesc: '出错时切换提供商',
      defaultProvider: '默认提供商',
      auto: '自动',
      mockWarning: '未配置提供商。使用模拟模式。'
    }
  };

  const txt = texts[lang] || texts.es;

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/admin/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (provider, updates) => {
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`${API_URL}/api/notifications/admin/config/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        setConfig(prev => ({
          ...prev,
          [provider]: { ...prev[provider], ...updates }
        }));
        toast.success(txt.saved);
      }
    } catch (error) {
      toast.error('Error updating provider');
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const getStatusBadge = (provider) => {
    const status = config?.[provider]?.status;
    const enabled = config?.[provider]?.enabled;
    
    if (!enabled) return <Badge variant="secondary">{txt.inactive}</Badge>;
    if (status === 'error') return <Badge variant="destructive">{txt.error}</Badge>;
    if (status === 'active') return <Badge variant="default" className="bg-green-500">{txt.active}</Badge>;
    return <Badge variant="outline">{txt.inactive}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const noProvidersConfigured = !config?.fcm?.enabled && !config?.onesignal?.enabled;

  return (
    <div className="space-y-6" data-testid="provider-config">
      {/* Warning if no providers */}
      {noProvidersConfigured && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800 dark:text-amber-200">{txt.mockWarning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FCM Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Cloud className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{txt.fcm}</CardTitle>
                <CardDescription>{txt.fcmDesc}</CardDescription>
              </div>
            </div>
            {getStatusBadge('fcm')}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <Label>{txt.enabled}</Label>
            <Switch
              checked={config?.fcm?.enabled ?? false}
              onCheckedChange={(v) => updateProvider('fcm', { enabled: v })}
              data-testid="fcm-enable-toggle"
            />
          </div>

          <Separator />

          {/* API Key */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {txt.apiKey}
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="AIza..."
                defaultValue={config?.fcm?.api_key === '***hidden***' ? '' : config?.fcm?.api_key}
                onBlur={(e) => e.target.value && updateProvider('fcm', { api_key: e.target.value })}
                data-testid="fcm-api-key"
              />
            </div>
          </div>

          {/* Project ID */}
          <div className="space-y-2">
            <Label>{txt.projectId}</Label>
            <Input
              placeholder="my-project-123"
              defaultValue={config?.fcm?.project_id || ''}
              onBlur={(e) => updateProvider('fcm', { project_id: e.target.value })}
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label>{txt.weight}: {config?.fcm?.weight || 50}%</Label>
            <Slider
              value={[config?.fcm?.weight || 50]}
              onValueCommit={(v) => updateProvider('fcm', { weight: v[0] })}
              max={100}
              step={5}
            />
          </div>

          {/* Rate Limit */}
          <div className="space-y-2">
            <Label>{txt.rateLimit}</Label>
            <Input
              type="number"
              placeholder="1000"
              defaultValue={config?.fcm?.rate_limit || 1000}
              onBlur={(e) => updateProvider('fcm', { rate_limit: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* OneSignal Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <Server className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{txt.onesignal}</CardTitle>
                <CardDescription>{txt.onesignalDesc}</CardDescription>
              </div>
            </div>
            {getStatusBadge('onesignal')}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <Label>{txt.enabled}</Label>
            <Switch
              checked={config?.onesignal?.enabled ?? false}
              onCheckedChange={(v) => updateProvider('onesignal', { enabled: v })}
              data-testid="onesignal-enable-toggle"
            />
          </div>

          <Separator />

          {/* App ID */}
          <div className="space-y-2">
            <Label>{txt.appId}</Label>
            <Input
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              defaultValue={config?.onesignal?.app_id || ''}
              onBlur={(e) => updateProvider('onesignal', { app_id: e.target.value })}
              data-testid="onesignal-app-id"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {txt.apiKey}
            </Label>
            <Input
              type="password"
              placeholder="REST API Key"
              defaultValue={config?.onesignal?.api_key === '***hidden***' ? '' : config?.onesignal?.api_key}
              onBlur={(e) => e.target.value && updateProvider('onesignal', { api_key: e.target.value })}
              data-testid="onesignal-api-key"
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label>{txt.weight}: {config?.onesignal?.weight || 50}%</Label>
            <Slider
              value={[config?.onesignal?.weight || 50]}
              onValueCommit={(v) => updateProvider('onesignal', { weight: v[0] })}
              max={100}
              step={5}
            />
          </div>

          {/* Rate Limit */}
          <div className="space-y-2">
            <Label>{txt.rateLimit}</Label>
            <Input
              type="number"
              placeholder="1000"
              defaultValue={config?.onesignal?.rate_limit || 1000}
              onBlur={(e) => updateProvider('onesignal', { rate_limit: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {txt.loadBalancing}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Load Balancing Strategy */}
          <div className="space-y-2">
            <Label>{txt.loadBalancing}</Label>
            <Select 
              value={config?.load_balancing || 'weighted'}
              onValueChange={(v) => setConfig(prev => ({ ...prev, load_balancing: v }))}
            >
              <SelectTrigger data-testid="load-balancing-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted">{txt.weighted}</SelectItem>
                <SelectItem value="round_robin">{txt.roundRobin}</SelectItem>
                <SelectItem value="least_loaded">{txt.leastLoaded}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Failover Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>{txt.failover}</Label>
              <p className="text-sm text-muted-foreground">{txt.failoverDesc}</p>
            </div>
            <Switch
              checked={config?.failover_enabled ?? true}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, failover_enabled: v }))}
              data-testid="failover-toggle"
            />
          </div>

          {/* Default Provider */}
          <div className="space-y-2">
            <Label>{txt.defaultProvider}</Label>
            <Select 
              value={config?.default_provider || 'auto'}
              onValueChange={(v) => setConfig(prev => ({ ...prev, default_provider: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{txt.auto}</SelectItem>
                <SelectItem value="fcm">FCM</SelectItem>
                <SelectItem value="onesignal">OneSignal</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
