import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Settings, Palette, Tv, Target, Radio, Users, Shield, Sparkles, Save, RefreshCw
} from 'lucide-react';

export default function SportAdmin() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await sportApi.getSettings();
      setSettings(res.data);
      setDirty(false);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        toast.error('Admin login required');
      } else {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await sportApi.updateSettings(settings);
      toast.success('Settings saved!');
      setDirty(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const update = (path, value) => {
    setSettings(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Shield className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-400">Admin login required to view settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="sport-admin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-amber-500" /> {t('admin')} {t('settings')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {settings.module_name_display?.en || 'Sport'} Engine Configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-600 border-amber-300">Unsaved</Badge>}
          <Button data-testid="reload-settings" variant="ghost" size="sm" onClick={loadSettings}>
            <RefreshCw size={16} />
          </Button>
          <Button
            data-testid="save-settings-btn"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : t('save')}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="tv" className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="tv" className="text-xs"><Tv size={14} className="mr-1" /> TV</TabsTrigger>
          <TabsTrigger value="emotions" className="text-xs"><Sparkles size={14} className="mr-1" /> Emotions</TabsTrigger>
          <TabsTrigger value="match" className="text-xs"><Target size={14} className="mr-1" /> Match</TabsTrigger>
          <TabsTrigger value="live" className="text-xs"><Radio size={14} className="mr-1" /> Live</TabsTrigger>
          <TabsTrigger value="display" className="text-xs"><Palette size={14} className="mr-1" /> Display</TabsTrigger>
          <TabsTrigger value="referee" className="text-xs"><Shield size={14} className="mr-1" /> Referee</TabsTrigger>
        </TabsList>

        {/* ── TV Settings ── */}
        <TabsContent value="tv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Tv size={18} /> TV Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <Select value={settings.tv?.theme || 'fighting_game'} onValueChange={v => update('tv.theme', v)}>
                      <SelectTrigger data-testid="tv-theme"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fighting_game">Fighting Game</SelectItem>
                        <SelectItem value="chinese_modern">Chinese Modern</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="neon">Neon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Player A Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={settings.tv?.accent_a || '#ef4444'}
                        onChange={e => update('tv.accent_a', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={settings.tv?.accent_a || '#ef4444'}
                        onChange={e => update('tv.accent_a', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Player B Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={settings.tv?.accent_b || '#3b82f6'}
                        onChange={e => update('tv.accent_b', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={settings.tv?.accent_b || '#3b82f6'}
                        onChange={e => update('tv.accent_b', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label>HP Bar Style</Label>
                    <Select value={settings.tv?.hp_bar_style || 'chevron'} onValueChange={v => update('tv.hp_bar_style', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chevron">Chevron</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Score Size</Label>
                    <Select value={settings.tv?.score_size || 'xl'} onValueChange={v => update('tv.score_size', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                        <SelectItem value="2xl">2X Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    ['tv.show_elo', 'Show ELO'],
                    ['tv.show_photos', 'Show Photos'],
                    ['tv.show_chat', 'Show Chat'],
                    ['tv.show_battle_timeline', 'Show Battle Timeline'],
                    ['tv.show_set_history', 'Show Set History'],
                    ['tv.show_combo_counter', 'Show Combo Counter'],
                  ].map(([path, label]) => (
                    <div key={path} className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Switch
                        checked={path.split('.').reduce((o, k) => o?.[k], settings) ?? true}
                        onCheckedChange={v => update(path, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Messages */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Set Win Messages</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['en', 'es', 'zh'].map(lang => (
                    <div key={lang}>
                      <Label className="text-xs uppercase">{lang}</Label>
                      <Input value={settings.tv?.set_win_messages?.[lang] || ''}
                        onChange={e => update(`tv.set_win_messages.${lang}`, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Match Win Messages</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['en', 'es', 'zh'].map(lang => (
                    <div key={lang}>
                      <Label className="text-xs uppercase">{lang}</Label>
                      <Input value={settings.tv?.match_win_messages?.[lang] || ''}
                        onChange={e => update(`tv.match_win_messages.${lang}`, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Emotions ── */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Sparkles size={18} /> Emotion Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <Label className="font-semibold">Emotions Enabled</Label>
                <Switch checked={settings.emotions?.enabled ?? true}
                  onCheckedChange={v => update('emotions.enabled', v)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['streak_3', 'streak_5', 'streak_break', 'deuce', 'match_point', 'winner', 'comeback', 'perfect_set', 'upset'].map(key => {
                  const em = settings.emotions?.[key] || {};
                  return (
                    <Card key={key} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs font-mono">{key}</Badge>
                        </div>
                        <div>
                          <Label className="text-xs">Label</Label>
                          <Input value={em.label || ''} onChange={e => update(`emotions.${key}.label`, e.target.value)}
                            className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">CSS Class</Label>
                          <Input value={em.css_class || ''} onChange={e => update(`emotions.${key}.css_class`, e.target.value)}
                            className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Duration (ms)</Label>
                          <Input type="number" value={em.duration_ms || 2500}
                            onChange={e => update(`emotions.${key}.duration_ms`, parseInt(e.target.value) || 2500)}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Match Settings ── */}
        <TabsContent value="match">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Target size={18} /> Match Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Points to Win</Label>
                  <Input type="number" value={settings.match?.min_score_to_win || 11}
                    onChange={e => update('match.min_score_to_win', parseInt(e.target.value) || 11)} />
                </div>
                <div>
                  <Label>Min Lead to Win</Label>
                  <Input type="number" value={settings.match?.min_lead_to_win || 2}
                    onChange={e => update('match.min_lead_to_win', parseInt(e.target.value) || 2)} />
                </div>
                <div>
                  <Label>Default Sets to Win</Label>
                  <Input type="number" value={settings.match?.default_sets_to_win || 2}
                    onChange={e => update('match.default_sets_to_win', parseInt(e.target.value) || 2)} />
                </div>
                <div>
                  <Label>Max Sets</Label>
                  <Input type="number" value={settings.match?.max_sets || 7}
                    onChange={e => update('match.max_sets', parseInt(e.target.value) || 7)} />
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                {[
                  ['match.require_referee', 'Require Referee'],
                  ['match.allow_past_matches', 'Allow Past Matches'],
                  ['match.auto_validate', 'Auto Validate Matches'],
                ].map(([path, label]) => (
                  <div key={path} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch checked={path.split('.').reduce((o, k) => o?.[k], settings) ?? false}
                      onCheckedChange={v => update(path, v)} />
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">ELO Rating</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Initial ELO</Label>
                    <Input type="number" value={settings.rating?.initial_elo || 1000}
                      onChange={e => update('rating.initial_elo', parseInt(e.target.value) || 1000)} />
                  </div>
                  <div>
                    <Label>K-Factor</Label>
                    <Input type="number" value={settings.rating?.elo_k_factor || 32}
                      onChange={e => update('rating.elo_k_factor', parseInt(e.target.value) || 32)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Live ── */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Radio size={18} /> Live Session Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['live.enabled', 'Live Sessions Enabled'],
                ['live.auto_service_tracking', 'Auto Service Tracking'],
                ['live.technique_tagging', 'Technique Tagging'],
                ['live.spectator_reactions', 'Spectator Reactions'],
              ].map(([path, label]) => (
                <div key={path} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch checked={path.split('.').reduce((o, k) => o?.[k], settings) ?? false}
                    onCheckedChange={v => update(path, v)} />
                </div>
              ))}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label>Service Change Every (points)</Label>
                  <Input type="number" value={settings.live?.service_change_every || 2}
                    onChange={e => update('live.service_change_every', parseInt(e.target.value) || 2)} />
                </div>
                <div>
                  <Label>Service Change at Deuce</Label>
                  <Input type="number" value={settings.live?.service_change_at_deuce || 1}
                    onChange={e => update('live.service_change_at_deuce', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Timeout per Player</Label>
                  <Input type="number" value={settings.live?.timeout_per_player || 1}
                    onChange={e => update('live.timeout_per_player', parseInt(e.target.value) || 1)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Display ── */}
        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Palette size={18} /> Display Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Theme</Label>
                  <Select value={settings.display?.theme || 'chinese_modern'} onValueChange={v => update('display.theme', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chinese_modern">Chinese Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Battle Goal Icon</Label>
                  <Select value={settings.display?.battle_goal_icon || 'trophy'} onValueChange={v => update('display.battle_goal_icon', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trophy">Trophy</SelectItem>
                      <SelectItem value="star">Star</SelectItem>
                      <SelectItem value="crown">Crown</SelectItem>
                      <SelectItem value="dragon">Dragon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.display?.primary_color || '#C8102E'}
                      onChange={e => update('display.primary_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={settings.display?.primary_color || '#C8102E'}
                      onChange={e => update('display.primary_color', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.display?.accent_color || '#B8860B'}
                      onChange={e => update('display.accent_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={settings.display?.accent_color || '#B8860B'}
                      onChange={e => update('display.accent_color', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                {[
                  ['display.show_elo_on_cards', 'Show ELO on Cards'],
                  ['display.show_streak_counter', 'Show Streak Counter'],
                  ['display.show_battle_path', 'Show Battle Path'],
                ].map(([path, label]) => (
                  <div key={path} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch checked={path.split('.').reduce((o, k) => o?.[k], settings) ?? true}
                      onCheckedChange={v => update(path, v)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Referee ── */}
        <TabsContent value="referee">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Shield size={18} /> Referee Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Trusted Threshold (matches)</Label>
                  <Input type="number" value={settings.referee?.trusted_threshold || 20}
                    onChange={e => update('referee.trusted_threshold', parseInt(e.target.value) || 20)} />
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                {[
                  ['referee.show_referee_rankings', 'Show Referee Rankings'],
                  ['referee.allow_self_referee', 'Allow Self-Refereeing'],
                ].map(([path, label]) => (
                  <div key={path} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch checked={path.split('.').reduce((o, k) => o?.[k], settings) ?? false}
                      onCheckedChange={v => update(path, v)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
