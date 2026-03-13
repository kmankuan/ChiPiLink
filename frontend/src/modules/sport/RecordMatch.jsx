/**
 * Record Match — Type 3 names, pick winner, enter scores
 * Auto-creates players. Autocomplete from existing.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Check, Trophy } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function RecordMatch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({ player_a_name: '', player_b_name: '', referee_name: '', winner_name: '', score_winner: 11, score_loser: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/sport/players`).then(r => r.ok ? r.json() : []).then(setPlayers).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.player_a_name || !form.player_b_name || !form.referee_name) { toast.error(t('sport.allDifferent')); return; }
    if (!form.winner_name) { toast.error(t('sport.winnerMustBePlayer')); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/sport/matches`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const match = await res.json();
        toast.success(t('sport.matchRecorded'));
        navigate('/sport');
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error');
      }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-bold text-white">{t('sport.recordMatch')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <datalist id="sport-players">
              {players.map(p => <option key={p.player_id} value={p.nickname} />)}
            </datalist>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('sport.playerA')}</Label>
                <Input value={form.player_a_name} onChange={e => set('player_a_name', e.target.value)} placeholder="Name..." list="sport-players" className="h-10" data-testid="match-pa" />
              </div>
              <div>
                <Label className="text-xs">{t('sport.playerB')}</Label>
                <Input value={form.player_b_name} onChange={e => set('player_b_name', e.target.value)} placeholder="Name..." list="sport-players" className="h-10" data-testid="match-pb" />
              </div>
            </div>

            <div>
              <Label className="text-xs">{t('sport.referee')}</Label>
              <Input value={form.referee_name} onChange={e => set('referee_name', e.target.value)} placeholder="Referee..." list="sport-players" className="h-10" data-testid="match-ref" />
            </div>

            <div>
              <Label className="text-xs">{t('sport.winner')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {form.player_a_name && (
                  <Button type="button" variant={form.winner_name === form.player_a_name ? 'default' : 'outline'}
                    className={`h-12 text-sm font-bold ${form.winner_name === form.player_a_name ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    onClick={() => set('winner_name', form.player_a_name)}>
                    <Trophy className="h-4 w-4 mr-1" /> {form.player_a_name}
                  </Button>
                )}
                {form.player_b_name && (
                  <Button type="button" variant={form.winner_name === form.player_b_name ? 'default' : 'outline'}
                    className={`h-12 text-sm font-bold ${form.winner_name === form.player_b_name ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    onClick={() => set('winner_name', form.player_b_name)}>
                    <Trophy className="h-4 w-4 mr-1" /> {form.player_b_name}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('sport.scoreWinner')}</Label>
                <Input type="number" value={form.score_winner} onChange={e => set('score_winner', parseInt(e.target.value) || 0)} className="h-10 text-center text-lg font-bold" />
              </div>
              <div>
                <Label className="text-xs">{t('sport.scoreLoser')}</Label>
                <Input type="number" value={form.score_loser} onChange={e => set('score_loser', parseInt(e.target.value) || 0)} className="h-10 text-center text-lg font-bold" />
              </div>
            </div>

            <Button className="w-full h-12 text-base font-bold text-white" style={{ background: '#C8102E' }}
              onClick={handleSubmit} disabled={submitting} data-testid="submit-match">
              {submitting ? '...' : <><Check className="h-5 w-5 mr-2" /> {t('sport.submit')}</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
