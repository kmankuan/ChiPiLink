import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Store, CreditCard, Loader2, Save, ExternalLink, Plug } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ConfiguracionTab({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState('general');
  
  // General config
  const [generalConfig, setGeneralConfig] = useState({
    nombre_tienda: 'Unatienda',
    descripcion: '',
    horario_atencion: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  // Yappy config
  const [yappyConfig, setYappyConfig] = useState({
    enabled: false,
    merchant_id: '',
    secret_key: '',
    sandbox_mode: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      // Fetch general config
      const generalRes = await fetch(`${API}/api/admin/site-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (generalRes.ok) {
        const data = await generalRes.json();
        if (data.unatienda) {
          setGeneralConfig(prev => ({ ...prev, ...data.unatienda }));
        }
      }

      // Fetch Yappy config
      const yappyRes = await fetch(`${API}/api/payments/yappy/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (yappyRes.ok) {
        const data = await yappyRes.json();
        setYappyConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/admin/site-config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ unatienda: generalConfig })
      });
      if (response.ok) {
        toast.success('Configuration saved');
      } else {
        toast.error('Error saving');
      }
    } catch (error) {
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveYappyConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/payments/yappy/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(yappyConfig)
      });
      if (response.ok) {
        toast.success('Yappy configuration saved');
      } else {
        toast.error('Error saving');
      }
    } catch (error) {
      toast.error('Error saving Yappy configuration');
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500 to-slate-600">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Unatienda Configuration</CardTitle>
              <CardDescription>
                Configure general information and payment methods for the store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Store className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="yappy" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Yappy Commercial
          </TabsTrigger>
          <TabsTrigger value="monday" className="gap-2">
            <Plug className="h-4 w-4" />
            Monday.com
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Information</CardTitle>
              <CardDescription>Basic Unatienda data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Store Name</Label>
                  <Input
                    value={generalConfig.nombre_tienda}
                    onChange={(e) => setGeneralConfig({...generalConfig, nombre_tienda: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={generalConfig.email}
                    onChange={(e) => setGeneralConfig({...generalConfig, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={generalConfig.telefono}
                    onChange={(e) => setGeneralConfig({...generalConfig, telefono: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Business Hours</Label>
                  <Input
                    value={generalConfig.horario_atencion}
                    onChange={(e) => setGeneralConfig({...generalConfig, horario_atencion: e.target.value})}
                    placeholder="Ex: Monday to Friday 8am - 4pm"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={generalConfig.direccion}
                    onChange={(e) => setGeneralConfig({...generalConfig, direccion: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={generalConfig.descripcion}
                    onChange={(e) => setGeneralConfig({...generalConfig, descripcion: e.target.value})}
                    placeholder="Brief store description"
                  />
                </div>
              </div>
              <Button onClick={saveGeneralConfig} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yappy Tab */}
        <TabsContent value="yappy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Yappy Commercial
              </CardTitle>
              <CardDescription>
                Configure Yappy integration to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base">Enable Yappy</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to pay with Yappy
                  </p>
                </div>
                <Switch
                  checked={yappyConfig.enabled}
                  onCheckedChange={(v) => setYappyConfig({...yappyConfig, enabled: v})}
                />
              </div>

              {yappyConfig.enabled && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label>Merchant ID</Label>
                    <Input
                      value={yappyConfig.merchant_id}
                      onChange={(e) => setYappyConfig({...yappyConfig, merchant_id: e.target.value})}
                      placeholder="Your Yappy merchant ID"
                    />
                  </div>
                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      value={yappyConfig.secret_key}
                      onChange={(e) => setYappyConfig({...yappyConfig, secret_key: e.target.value})}
                      placeholder="Your Yappy secret key"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <div>
                      <Label className="text-base">Sandbox Mode (Testing)</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to test without real payments
                      </p>
                    </div>
                    <Switch
                      checked={yappyConfig.sandbox_mode}
                      onCheckedChange={(v) => setYappyConfig({...yappyConfig, sandbox_mode: v})}
                    />
                  </div>
                </div>
              )}

              <Button onClick={saveYappyConfig} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Yappy Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monday Tab */}
        <TabsContent value="monday" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Monday.com
              </CardTitle>
              <CardDescription>
                Sync textbook orders with Monday.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <p className="text-sm text-muted-foreground">
                  Monday.com configuration for order synchronization is located in the Integrations module.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/admin#integrations'}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Integrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
