/**
 * ProviderConfig - Admin notification providers configuration
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
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProviderConfig({ token }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/providers/config`, {
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

  const saveProviderConfig = async (provider, updates) => {
    setSaving({ ...saving, [provider]: true });
    try {
      const res = await fetch(`${API_URL}/api/notifications/providers/${provider}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        toast.success(t('notifications.providerConfig.saved'));
        fetchConfig();
      } else {
        toast.error(t('notifications.error'));
      }
    } catch (error) {
      toast.error(t('notifications.error'));
    } finally {
      setSaving({ ...saving, [provider]: false });
    }
  };

  const testConnection = async (provider) => {
    setSaving({ ...saving, [`test_${provider}`]: true });
    try {
      const res = await fetch(`${API_URL}/api/notifications/providers/${provider}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(t('notifications.providerConfig.connectionSuccess'));
      } else {
        toast.error(t('notifications.providerConfig.connectionFailed'));
      }
    } catch (error) {
      toast.error(t('notifications.providerConfig.connectionFailed'));
    } finally {
      setSaving({ ...saving, [`test_${provider}`]: false });
    }
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

  const providers = [
    {
      id: 'onesignal',
      name: t('notifications.providerConfig.onesignal'),
      icon: '📱',
      fields: ['app_id', 'rest_api_key']
    },
    {
      id: 'email',
      name: t('notifications.providerConfig.email'),
      icon: '📧',
      fields: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password']
    }
  ];

  return (
    <div className="space-y-4" data-testid="provider-config">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('notifications.providerConfig.title')}
          </CardTitle>
          <CardDescription>{t('notifications.providerConfig.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map((provider, idx) => {
            const providerConfig = config?.providers?.[provider.id] || {};
            const isConfigured = provider.fields.some(f => providerConfig[f]);

            return (
              <div key={provider.id}>
                {idx > 0 && <Separator className="my-6" />}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        <Badge variant={isConfigured ? 'default' : 'secondary'}>
                          {isConfigured 
                            ? t('notifications.providerConfig.configured')
                            : t('notifications.providerConfig.notConfigured')
                          }
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={providerConfig.enabled}
                      onCheckedChange={(checked) => 
                        saveProviderConfig(provider.id, { enabled: checked })
                      }
                    />
                  </div>

                  {/* Provider fields */}
                  <div className="grid grid-cols-2 gap-4 pl-10">
                    {provider.fields.map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {field.replace(/_/g, ' ').toUpperCase()}
                        </Label>
                        <Input
                          type={field.includes('key') || field.includes('password') ? 'password' : 'text'}
                          value={providerConfig[field] || ''}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              providers: {
                                ...config?.providers,
                                [provider.id]: {
                                  ...providerConfig,
                                  [field]: e.target.value
                                }
                              }
                            });
                          }}
                          placeholder={t('notifications.providerConfig.apiKeyPlaceholder')}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pl-10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(provider.id)}
                      disabled={saving[`test_${provider.id}`]}
                    >
                      {saving[`test_${provider.id}`] ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {t('notifications.providerConfig.testConnection')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveProviderConfig(provider.id, config?.providers?.[provider.id] || {})}
                      disabled={saving[provider.id]}
                    >
                      {saving[provider.id] ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      {t('notifications.providerConfig.save')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mock warning */}
          {!config?.providers?.onesignal?.app_id && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Push Notifications (MOCKED)
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No push provider configured. Configure OneSignal to enable real push notifications.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
