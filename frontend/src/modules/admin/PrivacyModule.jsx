/**
 * Privacy Module - Admin panel for search engine indexing control
 * Manages robots.txt directives and meta tags for SEO control
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Shield,
  ShieldOff,
  Globe,
  Bot,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function PrivacyModule() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    block_search_engines: true,
    custom_rules: [],
    sitemap_enabled: false,
    custom_robots_txt: null
  });
  const [newRule, setNewRule] = useState({ path: '', action: 'disallow' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewRobots, setPreviewRobots] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    generateRobotsPreview();
  }, [settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/privacy');
      if (res.data) {
        setSettings({
          block_search_engines: res.data.block_search_engines ?? true,
          custom_rules: res.data.custom_rules || [],
          sitemap_enabled: res.data.sitemap_enabled ?? false,
          custom_robots_txt: res.data.custom_robots_txt || null
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const generateRobotsPreview = () => {
    if (settings.custom_robots_txt) {
      setPreviewRobots(settings.custom_robots_txt);
      return;
    }

    let lines = ['# Generated robots.txt preview', ''];

    if (settings.block_search_engines) {
      lines.push('User-agent: *');
      lines.push('Disallow: /');
      lines.push('');
      lines.push('# Search engines are blocked');
    } else {
      lines.push('User-agent: *');
      
      if (settings.custom_rules?.length > 0) {
        settings.custom_rules.forEach(rule => {
          const action = rule.action === 'disallow' ? 'Disallow' : 'Allow';
          lines.push(`${action}: ${rule.path}`);
        });
      } else {
        lines.push('Allow: /');
      }
      
      lines.push('');
      
      if (settings.sitemap_enabled) {
        lines.push('Sitemap: /sitemap.xml');
      }
    }

    setPreviewRobots(lines.join('\n'));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/admin/privacy', settings);
      toast.success('Privacy settings saved successfully');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSaving(true);
      await api.post('/admin/privacy/reset');
      await fetchSettings();
      toast.success('Privacy settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!newRule.path.trim()) {
      toast.error('Please enter a path');
      return;
    }
    
    // Ensure path starts with /
    const path = newRule.path.startsWith('/') ? newRule.path : `/${newRule.path}`;
    
    // Check for duplicates
    if (settings.custom_rules.some(r => r.path === path)) {
      toast.error('This path already has a rule');
      return;
    }

    setSettings({
      ...settings,
      custom_rules: [...settings.custom_rules, { path, action: newRule.action }]
    });
    setNewRule({ path: '', action: 'disallow' });
    toast.success('Rule added');
  };

  const removeRule = (index) => {
    const updated = settings.custom_rules.filter((_, i) => i !== index);
    setSettings({ ...settings, custom_rules: updated });
    toast.success('Rule removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="privacy-module">
      {/* Status Banner */}
      <Card className={settings.block_search_engines 
        ? 'border-green-500/50 bg-green-500/5' 
        : 'border-yellow-500/50 bg-yellow-500/5'
      }>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {settings.block_search_engines ? (
              <>
                <div className="p-3 rounded-full bg-green-500/20">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Site is Private
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Search engines cannot index your site. Only members with direct access can view content.
                  </p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hidden from Search
                </Badge>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Globe className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                    Site is Public
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Search engines can index your site. Content may appear in Google and other search results.
                  </p>
                </div>
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Eye className="h-3 w-3 mr-1" />
                  Visible to Search
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Search Engine Indexing
          </CardTitle>
          <CardDescription>
            Control whether search engines like Google, Bing, and others can find and index your site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="block-toggle" className="text-base font-medium">
                Block Search Engines
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, search engines will be instructed not to index any pages on your site.
              </p>
            </div>
            <Switch
              id="block-toggle"
              checked={settings.block_search_engines}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, block_search_engines: checked })
              }
              data-testid="block-search-engines-toggle"
            />
          </div>

          {!settings.block_search_engines && (
            <div className="p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Public Mode Active
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your site content may be indexed by search engines. Use the custom rules below 
                    to control which specific paths should be allowed or blocked.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Rules - Only show when not fully blocked */}
      {!settings.block_search_engines && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Custom Path Rules
            </CardTitle>
            <CardDescription>
              Define specific rules for different sections of your site. 
              These rules only apply when search engines are not fully blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new rule */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="/path/to/page"
                  value={newRule.path}
                  onChange={(e) => setNewRule({ ...newRule, path: e.target.value })}
                  data-testid="new-rule-path"
                />
              </div>
              <Select
                value={newRule.action}
                onValueChange={(value) => setNewRule({ ...newRule, action: value })}
              >
                <SelectTrigger className="w-[140px]" data-testid="new-rule-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disallow">Disallow</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addRule} variant="outline" data-testid="add-rule-btn">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Rules table */}
            {settings.custom_rules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.custom_rules.map((rule, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{rule.path}</TableCell>
                      <TableCell>
                        <Badge variant={rule.action === 'disallow' ? 'destructive' : 'default'}>
                          {rule.action === 'disallow' ? (
                            <><EyeOff className="h-3 w-3 mr-1" /> Disallow</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-1" /> Allow</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`remove-rule-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No custom rules defined</p>
                <p className="text-sm">All paths will be allowed by default</p>
              </div>
            )}

            <Separator />

            {/* Sitemap toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sitemap-toggle" className="text-sm font-medium">
                  Include Sitemap Reference
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add a sitemap.xml reference to robots.txt for better SEO
                </p>
              </div>
              <Switch
                id="sitemap-toggle"
                checked={settings.sitemap_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, sitemap_enabled: checked })
                }
                data-testid="sitemap-toggle"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced: Custom robots.txt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Advanced: Custom robots.txt
              </CardTitle>
              <CardDescription>
                Override all settings with a custom robots.txt file content
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="p-3 border border-blue-500/30 rounded-lg bg-blue-500/5">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  If you provide custom content below, it will completely override the automatic 
                  robots.txt generation. Leave empty to use automatic generation.
                </p>
              </div>
            </div>
            
            <div>
              <Label>Custom robots.txt Content</Label>
              <Textarea
                value={settings.custom_robots_txt || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  custom_robots_txt: e.target.value || null 
                })}
                placeholder="User-agent: *\nDisallow: /"
                rows={8}
                className="font-mono text-sm mt-2"
                data-testid="custom-robots-txt"
              />
            </div>

            {settings.custom_robots_txt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettings({ ...settings, custom_robots_txt: null })}
              >
                Clear Custom Content
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            robots.txt Preview
          </CardTitle>
          <CardDescription>
            This is what search engines will see when they visit your site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
            {previewRobots}
          </pre>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={saveSettings} 
          disabled={saving} 
          className="flex-1 gap-2"
          data-testid="save-privacy-settings"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Privacy Settings
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Privacy Settings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all privacy settings to their defaults (search engines blocked, 
                private site mode). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetSettings}>
                Reset Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
