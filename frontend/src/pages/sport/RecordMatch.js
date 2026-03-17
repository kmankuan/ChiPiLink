import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Swords } from 'lucide-react';

export default function RecordMatch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    player_a_id: '', player_b_id: '', referee_id: '',
    winner_id: '', score_winner: 11, score_loser: 0,
    source: 'manual'
  });

  useEffect(() => {
    sportApi.getPlayers({ active_only: true }).then(res => setPlayers(res.data || []));
  }, []);

  const submit = async () => {
    if (!form.player_a_id || !form.player_b_id || !form.winner_id) {
      toast.error('Select all players and winner'); return;
    }
    setLoading(true);
    try {
      await sportApi.createMatch(form);
      toast.success('Match recorded!');
      navigate('/sport/matches');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to record match');
    } finally {
      setLoading(false);
    }
  };

  const availableForB = players.filter(p => p.player_id !== form.player_a_id);
  const availableForRef = players.filter(p => p.player_id !== form.player_a_id && p.player_id !== form.player_b_id);
  const winnerOptions = [form.player_a_id, form.player_b_id].filter(Boolean);

  return (
    <div className="max-w-lg mx-auto space-y-6" data-testid="record-match">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Swords className="text-blue-500" /> {t('record_match')}
      </h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>{t('player_a')}</Label>
            <Select value={form.player_a_id} onValueChange={v => setForm(f => ({ ...f, player_a_id: v, winner_id: '' }))}>
              <SelectTrigger data-testid="select-player-a"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname} ({p.elo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('player_b')}</Label>
            <Select value={form.player_b_id} onValueChange={v => setForm(f => ({ ...f, player_b_id: v, winner_id: '' }))}>
              <SelectTrigger data-testid="select-player-b"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {availableForB.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname} ({p.elo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('referee')}</Label>
            <Select value={form.referee_id} onValueChange={v => setForm(f => ({ ...f, referee_id: v }))}>
              <SelectTrigger data-testid="select-referee"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {availableForRef.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>{p.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('winner')}</Label>
            <Select value={form.winner_id} onValueChange={v => setForm(f => ({ ...f, winner_id: v }))}>
              <SelectTrigger data-testid="select-winner"><SelectValue placeholder="Select winner..." /></SelectTrigger>
              <SelectContent>
                {winnerOptions.map(id => {
                  const p = players.find(pl => pl.player_id === id);
                  return p ? <SelectItem key={id} value={id}>{p.nickname}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Winner Score</Label>
              <Input data-testid="score-winner" type="number" value={form.score_winner}
                onChange={e => setForm(f => ({ ...f, score_winner: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Loser Score</Label>
              <Input data-testid="score-loser" type="number" value={form.score_loser}
                onChange={e => setForm(f => ({ ...f, score_loser: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <Button data-testid="submit-match" onClick={submit} disabled={loading} className="w-full">
            {loading ? t('loading') : t('record_match')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
