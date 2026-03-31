import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, Globe, Bot, Database, Zap, BookOpen, Key, Link } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SchoolFeedConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePlatform, setActivePlatform] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/tutor/school-feed-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.platforms) data.platforms = {};
        if (!data.automations) data.automations = { zerowork: { enabled: false } };
        setConfig(data);
        if (Object.keys(data.platforms).length > 0) {
          setActivePlatform(Object.keys(data.platforms)[0]);
        }
      }
    } catch (e) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/tutor/school-feed-config`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('Configuration saved successfully');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [activePlatform]: {
          ...prev.platforms[activePlatform],
          [key]: value
        }
      }
    }));
  };

  const handleSelectorChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [activePlatform]: {
          ...prev.platforms[activePlatform],
          selectors: {
            ...(prev.platforms[activePlatform].selectors || {}),
            [key]: value
          }
        }
      }
    }));
  };

  const addSection = () => {
    const platform = config.platforms[activePlatform];
    const newSections = [...(platform.sections || []), { name: 'new_section', nav: '', prompt: 'Extract information from this section' }];
    handlePlatformChange('sections', newSections);
  };

  const updateSection = (index, field, value) => {
    const platform = config.platforms[activePlatform];
    const newSections = [...platform.sections];
    newSections[index][field] = value;
    handlePlatformChange('sections', newSections);
  };

  const removeSection = (index) => {
    const platform = config.platforms[activePlatform];
    const newSections = platform.sections.filter((_, i) => i !== index);
    handlePlatformChange('sections', newSections);
  };

  const addNewPlatform = () => {
    const id = prompt('Enter a unique ID for this platform (e.g., my_school):');
    if (!id || config.platforms[id]) return;
    
    setConfig(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [id]: {
          name: 'New School Platform',
          login_url: 'https://',
          selectors: { username: '', password: '', submit: '' },
          sections: []
        }
      }
    }));
    setActivePlatform(id);
  };

  if (loading || !config) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Configuration...</div>;
  }

  const platform = config.platforms[activePlatform];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">School Scraping Pipeline</h1>
          <p className="text-muted-foreground">Configure how the AI reads and extracts data from school platforms.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Save Pipeline
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Platforms List */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Platforms</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addNewPlatform}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {Object.entries(config.platforms).map(([id, plat]) => (
              <button
                key={id}
                onClick={() => setActivePlatform(id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activePlatform === id ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'hover:bg-muted bg-card border'}`}
              >
                {plat.name}
              </button>
            ))}
          </div>

          <div className="pt-6">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Global Settings</h3>
            <Button variant="outline" className="w-full justify-start gap-2 mb-2" onClick={() => document.getElementById('tab-zero').click()}>
              <Zap className="h-4 w-4 text-orange-500" /> ZeroWork Engine
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 mb-2" onClick={() => document.getElementById('tab-dest').click()}>
              <Database className="h-4 w-4 text-blue-500" /> Destinations
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          <Tabs defaultValue="auth" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="auth">1. Authentication</TabsTrigger>
              <TabsTrigger value="sources">2. Data Sources</TabsTrigger>
              <TabsTrigger value="zerowork" id="tab-zero" className="hidden">ZeroWork</TabsTrigger>
              <TabsTrigger value="destinations" id="tab-dest" className="hidden">Destinations</TabsTrigger>
            </TabsList>

            {platform && (
              <>
                {/* TAB 1: AUTHENTICATION */}
                <TabsContent value="auth" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5" /> Platform Access</CardTitle>
                      <CardDescription>Tell the scraper how to log into this specific school platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Platform Name</Label>
                        <Input value={platform.name || ''} onChange={(e) => handlePlatformChange('name', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Login URL</Label>
                        <Input value={platform.login_url || ''} onChange={(e) => handlePlatformChange('login_url', e.target.value)} placeholder="https://school.edu/login" />
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                        <h4 className="text-sm font-semibold">CSS Selectors for Login Form</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Username Field</Label>
                            <Input value={platform.selectors?.username || ''} onChange={(e) => handleSelectorChange('username', e.target.value)} placeholder="#user_email" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Password Field</Label>
                            <Input value={platform.selectors?.password || ''} onChange={(e) => handleSelectorChange('password', e.target.value)} placeholder="#user_password" />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label className="text-xs">Submit Button</Label>
                            <Input value={platform.selectors?.submit || ''} onChange={(e) => handleSelectorChange('submit', e.target.value)} placeholder="button[type='submit']" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 2: DATA SOURCES (PAGES TO READ) */}
                <TabsContent value="sources" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5" /> Pages to Read & Analyze</CardTitle>
                        <CardDescription>Add the specific pages the bot should read after logging in.</CardDescription>
                      </div>
                      <Button size="sm" onClick={addSection} className="gap-1"><Plus className="h-4 w-4" /> Add Page</Button>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      {platform.sections?.map((section, idx) => (
                        <div key={idx} className="p-4 border rounded-xl bg-card shadow-sm space-y-4 relative group">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={() => removeSection(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                          <div className="grid grid-cols-2 gap-4 pr-8">
                            <div className="space-y-2">
                              <Label className="text-xs">Section Name</Label>
                              <Input value={section.name} onChange={(e) => updateSection(idx, 'name', e.target.value)} placeholder="e.g. Grades, Homework" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Navigation URL or Click Selector</Label>
                              <Input value={section.nav || ''} onChange={(e) => updateSection(idx, 'nav', e.target.value)} placeholder="e.g. a[href*='grades'] or https://.../grades" />
                              <p className="text-[10px] text-muted-foreground">Leave empty to read the homepage after login.</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1"><Bot className="h-3 w-3 text-purple-500" /> AI Instruction for this page</Label>
                            <Textarea 
                              value={section.prompt} 
                              onChange={(e) => updateSection(idx, 'prompt', e.target.value)}
                              rows={2}
                              className="text-sm bg-purple-50/50 border-purple-100"
                              placeholder="Tell the AI what specifically to extract from this page..."
                            />
                            <p className="text-[10px] text-purple-700">Dynamic variables supported: <code>{`{{student.name}}`}</code>, <code>{`{{student.grade}}`}</code></p>
                          </div>
                        </div>
                      ))}
                      
                      {(!platform.sections || platform.sections.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                          No pages configured. The bot will only read the initial dashboard.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}

            {/* TAB: ZEROWORK ENGINE */}
            <TabsContent value="zerowork" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-orange-500" /> ZeroWork TaskBot Engine</CardTitle>
                  <CardDescription>
                    Bypass internal scraping and use ZeroWork.com for powerful, complex visual automations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold text-orange-900">Enable ZeroWork Execution</Label>
                      <p className="text-xs text-orange-700">When enabled, the backend triggers ZeroWork via API instead of Playwright.</p>
                    </div>
                    <Switch 
                      checked={config.automations?.zerowork?.enabled || false}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, automations: { ...prev.automations, zerowork: { ...prev.automations.zerowork, enabled: v } } }))}
                    />
                  </div>

                  {config.automations?.zerowork?.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>ZeroWork API Key</Label>
                        <Input 
                          type="password"
                          value={config.automations.zerowork.api_key || ''} 
                          onChange={(e) => setConfig(prev => ({ ...prev, automations: { ...prev.automations, zerowork: { ...prev.automations.zerowork, api_key: e.target.value } } }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TaskBot ID</Label>
                        <Input 
                          value={config.automations.zerowork.taskbot_id || ''} 
                          onChange={(e) => setConfig(prev => ({ ...prev, automations: { ...prev.automations, zerowork: { ...prev.automations.zerowork, taskbot_id: e.target.value } } }))} 
                        />
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                        {config.automations.zerowork.instructions}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: DESTINATIONS */}
            <TabsContent value="destinations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5 text-blue-500" /> Data Destinations</CardTitle>
                  <CardDescription>Where should the AI send the extracted data?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Monday.com */}
                  <div className="space-y-4 pb-6 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center font-bold text-blue-600">M</div>
                      <h4 className="font-bold text-base">Monday.com CRM</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 pl-10">
                      <div className="space-y-2">
                        <Label className="text-xs">Board ID for School Feed</Label>
                        <Input 
                          value={config.monday_board?.board_id || ''} 
                          onChange={(e) => setConfig(prev => ({ ...prev, monday_board: { ...prev.monday_board, board_id: e.target.value } }))} 
                          placeholder="e.g. 1234567890" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Group By</Label>
                        <select 
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          value={config.monday_board?.group_by || 'student'}
                          onChange={(e) => setConfig(prev => ({ ...prev, monday_board: { ...prev.monday_board, group_by: e.target.value } }))}
                        >
                          <option value="student">Group by Student</option>
                          <option value="date">Group by Date</option>
                          <option value="type">Group by Type (Homework/Alerts)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* FuseBase */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">F</div>
                      <h4 className="font-bold text-base">FuseBase (Knowledge Base)</h4>
                      <Badge variant="outline" className="ml-2 text-indigo-600 border-indigo-200 bg-indigo-50">Supported</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground pl-10">
                      FuseBase is fully integrated. Extracted text, homework assignments, and generated quizzes will be stored as documents here.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 pl-10">
                      <div className="space-y-2">
                        <Label className="text-xs">FuseBase Workspace ID</Label>
                        <Input 
                          value={config.fusebase?.workspace_id || ''} 
                          onChange={(e) => setConfig(prev => ({ ...prev, fusebase: { ...prev.fusebase, workspace_id: e.target.value } }))} 
                          placeholder="Workspace ID" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">FuseBase API Key</Label>
                        <Input 
                          type="password"
                          value={config.fusebase?.api_key || ''} 
                          onChange={(e) => setConfig(prev => ({ ...prev, fusebase: { ...prev.fusebase, api_key: e.target.value } }))} 
                          placeholder="API Key" 
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
