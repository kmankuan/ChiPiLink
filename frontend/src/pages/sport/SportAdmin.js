import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Palette, Tv, Target, Radio, Users } from 'lucide-react';

export default function SportAdmin() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    // TV Display settings
    player_a_color: '#3B82F6',
    player_b_color: '#EF4444',
    center_icon_url: '',
    hp_bar_style: 'classic',
    show_elo: true,
    show_emotions: true,
    win_message_en: 'VICTORY!',
    win_message_es: 'VICTORIA!',
    win_message_zh: '胜利!',
    
    // Emotion settings
    streak_3_enabled: true,
    streak_5_enabled: true,
    streak_break_enabled: true,
    deuce_enabled: true,
    match_point_enabled: true,
    
    // Match settings
    default_sets_to_win: 3,
    default_points_to_win: 11,
    elo_k_factor: 32,
    
    // Live settings
    auto_switch_serve: true,
    emotion_duration: 3000,
    websocket_enabled: true
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            {t('admin')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure sport engine settings
          </p>
        </div>
        
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
          {saving ? 'Saving...' : t('save')}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="tv-display" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="emotions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">{t('emotions')}</span>
          </TabsTrigger>
          <TabsTrigger value="tv-display" className="flex items-center gap-2">
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">TV Display</span>
          </TabsTrigger>
          <TabsTrigger value="match" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Match</span>
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Live</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Players</span>
          </TabsTrigger>
        </TabsList>

        {/* Emotions Tab */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Emotion Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="streak-3">3-Point Streak</Label>
                    <Switch 
                      id="streak-3"
                      checked={settings.streak_3_enabled}
                      onCheckedChange={(checked) => updateSetting('streak_3_enabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="streak-5">5-Point Streak</Label>
                    <Switch 
                      id="streak-5"
                      checked={settings.streak_5_enabled}
                      onCheckedChange={(checked) => updateSetting('streak_5_enabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="streak-break">Streak Break</Label>
                    <Switch 
                      id="streak-break"
                      checked={settings.streak_break_enabled}
                      onCheckedChange={(checked) => updateSetting('streak_break_enabled', checked)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deuce">Deuce Alert</Label>
                    <Switch 
                      id="deuce"
                      checked={settings.deuce_enabled}
                      onCheckedChange={(checked) => updateSetting('deuce_enabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="match-point">Match Point</Label>
                    <Switch 
                      id="match-point"
                      checked={settings.match_point_enabled}
                      onCheckedChange={(checked) => updateSetting('match_point_enabled', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TV Display Tab */}
        <TabsContent value="tv-display">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                TV Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="player-a-color">Player A Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="player-a-color"
                        type="color"
                        value={settings.player_a_color}
                        onChange={(e) => updateSetting('player_a_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={settings.player_a_color}
                        onChange={(e) => updateSetting('player_a_color', e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="player-b-color">Player B Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="player-b-color"
                        type="color"
                        value={settings.player_b_color}
                        onChange={(e) => updateSetting('player_b_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={settings.player_b_color}
                        onChange={(e) => updateSetting('player_b_color', e.target.value)}
                        placeholder="#EF4444"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="center-icon">Center Icon URL</Label>
                    <Input
                      id="center-icon"
                      value={settings.center_icon_url}
                      onChange={(e) => updateSetting('center_icon_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-elo">Show ELO on TV</Label>
                    <Switch 
                      id="show-elo"
                      checked={settings.show_elo}
                      onCheckedChange={(checked) => updateSetting('show_elo', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-emotions">Show Emotions</Label>
                    <Switch 
                      id="show-emotions"
                      checked={settings.show_emotions}
                      onCheckedChange={(checked) => updateSetting('show_emotions', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Match Settings Tab */}
        <TabsContent value="match">
          <Card>
            <CardHeader>
              <CardTitle>Default Match Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sets-to-win">Sets to Win</Label>
                  <Input
                    id="sets-to-win"
                    type="number"
                    value={settings.default_sets_to_win}
                    onChange={(e) => updateSetting('default_sets_to_win', parseInt(e.target.value))}
                    min="1"
                    max="7"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="points-to-win">Points per Set</Label>
                  <Input
                    id="points-to-win"
                    type="number"
                    value={settings.default_points_to_win}
                    onChange={(e) => updateSetting('default_points_to_win', parseInt(e.target.value))}
                    min="7"
                    max="50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="k-factor">ELO K-Factor</Label>
                  <Input
                    id="k-factor"
                    type="number"
                    value={settings.elo_k_factor}
                    onChange={(e) => updateSetting('elo_k_factor', parseInt(e.target.value))}
                    min="10"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Settings Tab */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Live Session Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-switch">Auto Switch Serve</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Automatically switch serve every 2 points
                    </p>
                  </div>
                  <Switch 
                    id="auto-switch"
                    checked={settings.auto_switch_serve}
                    onCheckedChange={(checked) => updateSetting('auto_switch_serve', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emotion-duration">Emotion Duration (ms)</Label>
                  <Input
                    id="emotion-duration"
                    type="number"
                    value={settings.emotion_duration}
                    onChange={(e) => updateSetting('emotion_duration', parseInt(e.target.value))}
                    min="1000"
                    max="10000"
                    step="500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="websocket">WebSocket Updates</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Enable real-time updates via WebSocket
                    </p>
                  </div>
                  <Switch 
                    id="websocket"
                    checked={settings.websocket_enabled}
                    onCheckedChange={(checked) => updateSetting('websocket_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Player management features coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}