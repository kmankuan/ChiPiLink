import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Radio } from 'lucide-react';

export default function StartLive() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    player_a_id: '', player_b_id: '', referee_id: '',
    settings: { sets_to_win: 2, points_to_win: 11, auto_service: true }
  });

  useEffect(() => {
    sportApi.getPlayers({ active_only: true }).then(res => setPlayers(res.data || []));
  }, []);

  const start = async () => {
    if (!form.player_a_id || !form.player_b_id) {
      toast.error('Select both players'); return;
    }
    setLoading(true);
    try {
      const res = await sportApi.createLiveSession(form);
      toast.success('Live session started!');
      navigate(`/sport/live/${res.data.session_id}/referee`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6" data-testid="start-live">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Radio className="text-red-500" /> {t('start_live')}
      </h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>{t('player_a')}</Label>
            <Select value={form.player_a_id} onValueChange={v => setForm(f => ({ ...f, player_a_id: v }))}>
              <SelectTrigger data-testid="live-select-a"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname} ({p.elo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('player_b')}</Label>
            <Select value={form.player_b_id} onValueChange={v => setForm(f => ({ ...f, player_b_id: v }))}>
              <SelectTrigger data-testid="live-select-b"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {players.filter(p => p.player_id !== form.player_a_id).map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname} ({p.elo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('referee')}</Label>
            <Select value={form.referee_id} onValueChange={v => setForm(f => ({ ...f, referee_id: v }))}>
              <SelectTrigger data-testid="live-select-ref"><SelectValue placeholder="Optional..." /></SelectTrigger>
              <SelectContent>
                {players.filter(p => p.player_id !== form.player_a_id && p.player_id !== form.player_b_id).map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sets to Win</Label>
              <Select value={String(form.settings.sets_to_win)}
                onValueChange={v => setForm(f => ({ ...f, settings: { ...f.settings, sets_to_win: parseInt(v) } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points to Win</Label>
              <Select value={String(form.settings.points_to_win)}
                onValueChange={v => setForm(f => ({ ...f, settings: { ...f.settings, points_to_win: parseInt(v) } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[7,11,15,21].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button data-testid="start-live-btn" onClick={start} disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
            {loading ? t('loading') : `🟢 ${t('start_live')}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
