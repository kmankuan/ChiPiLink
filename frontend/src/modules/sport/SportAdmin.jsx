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
import { ArrowLeft, Settings, Palette, Save, RotateCcw, Users, Trash2 } from 'lucide-react';
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
          <TabsList className="w-full mb-3">
            <TabsTrigger value="emotions" className="flex-1 text-xs gap-1"><Palette className="h-3 w-3" /> Emotions</TabsTrigger>
            <TabsTrigger value="match" className="flex-1 text-xs gap-1"><Settings className="h-3 w-3" /> Match</TabsTrigger>
            <TabsTrigger value="players" className="flex-1 text-xs gap-1"><Users className="h-3 w-3" /> Players ({players.length})</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
