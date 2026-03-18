/**
 * Start Live Match — Enter names + settings before starting live scoring
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Radio, Play } from 'lucide-react';
import PlayerPicker from './components/PlayerPicker';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function StartLive() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [leagues, setLeagues] = useState([]);
  const isStream = new URLSearchParams(window.location.search).get('stream') === '1';
  const [showStream, setShowStream] = useState(isStream);
  const [form, setForm] = useState({
    player_a_name: '', player_b_name: '', referee_name: '',
    sets_to_win: 2, points_to_win: 11, league_id: '', stream_url: '',
    player_a_photo: '', player_b_photo: '', referee_photo: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/sport/leagues`).then(r => r.ok ? r.json() : []).then(setLeagues).catch(() => {});
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleStart = async () => {
    if (!form.player_a_name || !form.player_b_name || !form.referee_name) { toast.error('Enter all names'); return; }
    setSubmitting(true);
    try {
      // Send photos as small thumbnails (max 200x200 JPEG) to avoid huge payloads
      // The backend stores player photos separately — we only need small refs for the session
      const payload = {
        ...form,
        player_a_photo: form.player_a_photo && form.player_a_photo.startsWith('data:') && form.player_a_photo.length > 50000
          ? form.player_a_photo.substring(0, 50000) // truncate if somehow still huge
          : form.player_a_photo,
        player_b_photo: form.player_b_photo && form.player_b_photo.startsWith('data:') && form.player_b_photo.length > 50000
          ? form.player_b_photo.substring(0, 50000)
          : form.player_b_photo,
        referee_photo: form.referee_photo && form.referee_photo.startsWith('data:') && form.referee_photo.length > 50000
          ? form.referee_photo.substring(0, 50000)
          : form.referee_photo,
      };
      const res = await fetch(`${API}/api/sport/live`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const session = await res.json();
        navigate(`/sport/live/${session.session_id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to start match');
      }
    } catch (e) { toast.error('Network error — check connection'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: showStream ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' : 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
          {showStream ? <Radio className="h-5 w-5 text-red-400" /> : <Play className="h-5 w-5 text-yellow-400" />}
          <h1 className="text-base font-bold text-white">{showStream ? 'Live Stream Match' : 'Referee Match'}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <PlayerPicker label={t('sport.playerA')} value={form.player_a_name} photoValue={form.player_a_photo}
                onChange={v => set('player_a_name', v)} onPhotoChange={v => set('player_a_photo', v)} testId="live-pa" />
              <PlayerPicker label={t('sport.playerB')} value={form.player_b_name} photoValue={form.player_b_photo}
                onChange={v => set('player_b_name', v)} onPhotoChange={v => set('player_b_photo', v)} testId="live-pb" />
            </div>

            <PlayerPicker label={t('sport.referee')} value={form.referee_name} photoValue={form.referee_photo} filterRole="referee"
              onChange={v => set('referee_name', v)} onPhotoChange={v => set('referee_photo', v)} testId="live-ref" placeholder="Referee..." />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Best of</Label>
                <Select value={String(form.sets_to_win)} onValueChange={v => set('sets_to_win', parseInt(v))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 set</SelectItem>
                    <SelectItem value="2">Best of 3</SelectItem>
                    <SelectItem value="3">Best of 5</SelectItem>
                    <SelectItem value="4">Best of 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Points to win</Label>
                <Select value={String(form.points_to_win)} onValueChange={v => set('points_to_win', parseInt(v))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11">11 points</SelectItem>
                    <SelectItem value="21">21 points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {leagues.length > 0 && (
              <div>
                <Label className="text-xs">{t('sport.leagues')} (optional)</Label>
                <Select value={form.league_id || 'none'} onValueChange={v => set('league_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="No league" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No league</SelectItem>
                    {leagues.filter(l => l.status === 'active').map(l => <SelectItem key={l.league_id} value={l.league_id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stream URL — only shown when streaming mode */}
            {showStream ? (
              <div>
                <Label className="text-xs">Stream URL (Telegram/YouTube live link)</Label>
                <Input value={form.stream_url} onChange={e => set('stream_url', e.target.value)} placeholder="https://t.me/..." className="h-10" />
              </div>
            ) : (
              <button className="text-xs text-muted-foreground hover:underline" onClick={() => setShowStream(true)}>
                + Add live stream URL (optional)
              </button>
            )}

            <Button className="w-full h-14 text-lg font-bold text-white" style={{ background: showStream ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'linear-gradient(135deg, #2d2217, #4a3728)' }}
              onClick={handleStart} disabled={submitting}>
              <Play className="h-6 w-6 mr-2" /> {submitting ? '...' : showStream ? 'START LIVE STREAM' : 'START REFEREE'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
