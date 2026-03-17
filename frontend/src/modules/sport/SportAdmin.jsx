/**
 * Sport Admin — Settings, emotion customization, player management
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Settings, Palette, Save, RotateCcw, Users, Trash2, Tv, Radio, Eye, EyeOff, MessageSquare } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

const EMOTION_KEYS = [
  { id: 'streak_3', label: 'On Fire (3-streak)', emoji: '🔥' },
  { id: 'streak_5', label: 'Dragon Mode (5-streak)', emoji: '🐉' },
  { id: 'streak_break', label: 'Streak Broken', emoji: '💥' },
  { id: 'deuce', label: 'Deuce', emoji: '⚡' },
  { id: 'match_point', label: 'Match Point', emoji: '🏮' },
  { id: 'winner', label: 'Winner', emoji: '🏆' },
  { id: 'comeback', label: 'Comeback', emoji: '🌊' },
  { id: 'perfect_set', label: 'Perfect Set', emoji: '🏯' },
  { id: 'upset', label: 'Upset', emoji: '😱' },
];

export default function SportAdmin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [settings, setSettings] = useState(null);
  const [players, setPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('emotions');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/sport/settings`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/sport/players?limit=100`).then(r => r.ok ? r.json() : []),
    ]).then(([s, p]) => { setSettings(s); setPlayers(p); }).catch(() => {});
  }, []);

  const saveSection = async (section, data) => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/sport/settings/${section}`, {
        method: 'PUT', headers, body: JSON.stringify(data),
      });
      if (r.ok) toast.success('Settings saved');
      else toast.error('Save failed');
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  const updateEmotionGif = (emotionId, url) => {
    setSettings(prev => ({
      ...prev,
      emotions: {
        ...prev.emotions,
        [emotionId]: { ...(prev.emotions?.[emotionId] || {}), gif_url: url },
      }
    }));
  };

  const deletePlayer = async (pid) => {
    if (!confirm('Deactivate this player?')) return;
    await fetch(`${API}/api/sport/players/${pid}`, { method: 'DELETE', headers });
    setPlayers(prev => prev.filter(p => p.player_id !== pid));
    toast.success('Player deactivated');
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><span className="text-muted-foreground">Loading...</span></div>;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
          <Settings className="h-5 w-5 text-white/60" />
          <h1 className="text-base font-bold text-white">{t('sport.admin')} {t('sport.settings')}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3 flex-wrap h-auto gap-1">
            <TabsTrigger value="emotions" className="flex-1 text-xs gap-1"><Palette className="h-3 w-3" /> Emotions</TabsTrigger>
            <TabsTrigger value="tv" className="flex-1 text-xs gap-1"><Tv className="h-3 w-3" /> TV Display</TabsTrigger>
            <TabsTrigger value="match" className="flex-1 text-xs gap-1"><Settings className="h-3 w-3" /> Match</TabsTrigger>
            <TabsTrigger value="live" className="flex-1 text-xs gap-1"><Radio className="h-3 w-3" /> Live</TabsTrigger>
            <TabsTrigger value="players" className="flex-1 text-xs gap-1"><Users className="h-3 w-3" /> Players</TabsTrigger>
          </TabsList>

          {/* Emotions Tab */}
          <TabsContent value="emotions">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Emotion Stickers</CardTitle>
                <CardDescription className="text-xs">Customize GIF/sticker URL for each game emotion. Leave empty for default Lottie animation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {EMOTION_KEYS.map(emo => (
                  <div key={emo.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <span className="text-2xl shrink-0">{emo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{emo.label}</p>
                      <Input
                        value={settings.emotions?.[emo.id]?.gif_url || ''}
                        onChange={e => updateEmotionGif(emo.id, e.target.value)}
                        placeholder="Custom GIF/sticker URL (optional)"
                        className="h-7 text-[10px] mt-1"
                      />
                    </div>
                    {settings.emotions?.[emo.id]?.gif_url && (
                      <img src={settings.emotions[emo.id].gif_url} className="w-10 h-10 object-contain rounded" alt="" />
                    )}
                  </div>
                ))}
                <Button size="sm" className="w-full" onClick={() => saveSection('emotions', settings.emotions)} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save Emotion Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match Settings Tab */}
          <TabsContent value="match">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Match Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Default ELO K-Factor</Label>
                    <Input type="number" value={settings.rating?.elo_k_factor || 32}
                      onChange={e => setSettings(prev => ({ ...prev, rating: { ...prev.rating, elo_k_factor: parseInt(e.target.value) } }))}
                      className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Initial ELO</Label>
                    <Input type="number" value={settings.rating?.initial_elo || 1000}
                      onChange={e => setSettings(prev => ({ ...prev, rating: { ...prev.rating, initial_elo: parseInt(e.target.value) } }))}
                      className="h-8" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Win Points</Label>
                    <Input type="number" value={settings.rating?.simple_points?.win || 3}
                      onChange={e => setSettings(prev => ({ ...prev, rating: { ...prev.rating, simple_points: { ...prev.rating?.simple_points, win: parseInt(e.target.value) } } }))}
                      className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Loss Points</Label>
                    <Input type="number" value={settings.rating?.simple_points?.loss || 1}
                      onChange={e => setSettings(prev => ({ ...prev, rating: { ...prev.rating, simple_points: { ...prev.rating?.simple_points, loss: parseInt(e.target.value) } } }))}
                      className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Trusted Ref</Label>
                    <Input type="number" value={settings.referee?.trusted_threshold || 20}
                      onChange={e => setSettings(prev => ({ ...prev, referee: { ...prev.referee, trusted_threshold: parseInt(e.target.value) } }))}
                      className="h-8" />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => { saveSection('rating', settings.rating); saveSection('referee', settings.referee); }} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Match Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players">
            {/* Pending Link Requests */}
            {players.filter(p => p.link_request).length > 0 && (
              <Card className="mb-3 border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-700">Pending Link Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {players.filter(p => p.link_request).map(p => (
                    <div key={p.player_id} className="flex items-center justify-between p-2 rounded-lg border border-amber-100 bg-amber-50/50">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{p.nickname}</p>
                        <p className="text-[9px] text-muted-foreground">Requested by: {p.link_request.user_name || p.link_request.user_id}</p>
                      </div>
                      <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700" onClick={async () => {
                        try {
                          const r = await fetch(`${API}/api/sport/players/${p.player_id}/link-approve`, { method: 'POST', headers });
                          if (r.ok) { toast.success(`${p.nickname} linked!`); window.location.reload(); }
                          else { const e = await r.json(); toast.error(e.detail || 'Error'); }
                        } catch { toast.error('Error'); }
                      }}>Approve</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Players ({players.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {players.map(p => (
                  <div key={p.player_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">{(p.nickname || '?')[0]}</div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-medium truncate block">{p.nickname}</span>
                        <span className="text-[9px] text-muted-foreground">{p.elo} ELO · {p.stats?.matches || 0}M · {p.stats?.matches_refereed || 0}R</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(p.roles || []).map(r => <Badge key={r} variant="outline" className="text-[8px] h-4">{r}</Badge>)}
                      {p.link_request && <Badge className="bg-amber-100 text-amber-700 text-[8px] h-4">pending link</Badge>}
                      {p.linked_user_id && <Badge className="bg-green-100 text-green-700 text-[8px] h-4">linked</Badge>}
                      <button className="text-red-400 hover:text-red-600 p-1" onClick={() => deletePlayer(p.player_id)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TV Display Settings Tab ═══ */}
          <TabsContent value="tv">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">TV Broadcast Display</CardTitle>
                <CardDescription className="text-xs">Configure colors, icons, messages and layout for the TV screen at /sport/tv</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player Colors */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Player Colors</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Player A (Left)</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={settings.tv?.accent_a || '#ef4444'}
                          onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, accent_a: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer border-0" />
                        <Input value={settings.tv?.accent_a || '#ef4444'}
                          onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, accent_a: e.target.value } }))}
                          className="h-7 text-[10px] font-mono flex-1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Player B (Right)</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={settings.tv?.accent_b || '#3b82f6'}
                          onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, accent_b: e.target.value } }))}
                          className="w-8 h-8 rounded cursor-pointer border-0" />
                        <Input value={settings.tv?.accent_b || '#3b82f6'}
                          onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, accent_b: e.target.value } }))}
                          className="h-7 text-[10px] font-mono flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Icon / Trophy */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Center Icon / Trophy URL</Label>
                  <p className="text-[10px] text-muted-foreground">GIF or image URL for the center icon above the battle bar. Leave empty for default emoji.</p>
                  <div className="flex gap-2 items-center">
                    <Input value={settings.tv?.center_icon_url || ''}
                      onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, center_icon_url: e.target.value } }))}
                      placeholder="https://example.com/trophy.gif"
                      className="h-8 text-[10px] flex-1" />
                    {settings.tv?.center_icon_url && (
                      <img src={settings.tv.center_icon_url} className="w-10 h-10 rounded-full object-contain border" alt="" />
                    )}
                  </div>
                </div>

                {/* Background */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Background CSS</Label>
                  <Input value={settings.tv?.background || ''}
                    onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, background: e.target.value } }))}
                    placeholder="linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)"
                    className="h-8 text-[10px] font-mono" />
                </div>

                {/* Bar Style */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Battle Bar Style</Label>
                  <div className="flex gap-1 flex-wrap">
                    {['totem', 'chevron', 'gradient'].map(style => (
                      <button key={style}
                        onClick={() => setSettings(prev => ({ ...prev, tv: { ...prev.tv, hp_bar_style: style } }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                          (settings.tv?.hp_bar_style || 'chevron') === style
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-card text-muted-foreground border-border hover:border-purple-300'
                        }`}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Display Options</Label>
                  {[
                    { key: 'show_chat', label: 'Show Chat Sidebar' },
                    { key: 'show_elo', label: 'Show ELO Ratings' },
                    { key: 'show_photos', label: 'Show Player Photos' },
                    { key: 'show_set_history', label: 'Show Set History' },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between py-1 px-2 rounded border bg-card">
                      <span className="text-xs">{opt.label}</span>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, tv: { ...prev.tv, [opt.key]: !(prev.tv?.[opt.key] !== false) } }))}
                        className={`px-3 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                          settings.tv?.[opt.key] !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                        {settings.tv?.[opt.key] !== false ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Win Messages */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Set Win Message</Label>
                  <p className="text-[10px] text-muted-foreground">Use {'{winner}'} as placeholder for the winner name</p>
                  {['en', 'es', 'zh'].map(lang => (
                    <div key={lang} className="flex gap-2 items-center">
                      <Badge variant="outline" className="text-[8px] shrink-0 w-6 justify-center">{lang}</Badge>
                      <Input value={settings.tv?.set_win_messages?.[lang] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, set_win_messages: { ...(prev.tv?.set_win_messages || {}), [lang]: e.target.value } } }))}
                        className="h-7 text-[10px] flex-1" />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Match Win Message</Label>
                  {['en', 'es', 'zh'].map(lang => (
                    <div key={lang} className="flex gap-2 items-center">
                      <Badge variant="outline" className="text-[8px] shrink-0 w-6 justify-center">{lang}</Badge>
                      <Input value={settings.tv?.match_win_messages?.[lang] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, tv: { ...prev.tv, match_win_messages: { ...(prev.tv?.match_win_messages || {}), [lang]: e.target.value } } }))}
                        className="h-7 text-[10px] flex-1" />
                    </div>
                  ))}
                </div>

                <Button size="sm" className="w-full" onClick={() => saveSection('tv', settings.tv)} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save TV Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Live Scoring Settings Tab ═══ */}
          <TabsContent value="live">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Scoring</CardTitle>
                <CardDescription className="text-xs">Configure live match behavior, service tracking, and features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'auto_service_tracking', label: 'Auto Service Tracking', desc: 'Automatically switch server every 2 points' },
                  { key: 'technique_tagging', label: 'Technique Tagging', desc: 'Allow referees to tag point techniques (forehand, smash, etc.)' },
                  { key: 'spectator_reactions', label: 'Spectator Reactions', desc: 'Allow spectators to send reactions during live matches' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[9px] text-muted-foreground">{opt.desc}</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, live: { ...prev.live, [opt.key]: !(prev.live?.[opt.key]) } }))}
                      className={`px-3 py-0.5 rounded-full text-[10px] font-bold transition-colors shrink-0 ${
                        settings.live?.[opt.key] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                      {settings.live?.[opt.key] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Service Change Every (pts)</Label>
                    <Input type="number" value={settings.live?.service_change_every || 2}
                      onChange={e => setSettings(prev => ({ ...prev, live: { ...prev.live, service_change_every: parseInt(e.target.value) || 2 } }))}
                      className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Timeouts Per Player</Label>
                    <Input type="number" value={settings.live?.timeout_per_player || 1}
                      onChange={e => setSettings(prev => ({ ...prev, live: { ...prev.live, timeout_per_player: parseInt(e.target.value) || 1 } }))}
                      className="h-8" />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => saveSection('live', settings.live)} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save Live Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
