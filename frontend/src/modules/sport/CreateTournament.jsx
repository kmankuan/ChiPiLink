/**
 * Create Tournament page
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
import { ArrowLeft, Swords } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;
const FORMATS = [
  { value: 'single_elimination', label: 'Single Elimination', desc: 'Lose once, you\'re out' },
  { value: 'double_elimination', label: 'Double Elimination', desc: 'Losers get a second chance' },
  { value: 'round_robin', label: 'Round Robin', desc: 'Everyone plays everyone' },
  { value: 'swiss', label: 'Swiss System', desc: 'Paired by record each round' },
];

export default function CreateTournament() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');
  const [form, setForm] = useState({ name: '', format: 'single_elimination', max_participants: 8, sets_to_win: 2, points_to_win: 11, third_place_match: true, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/sport/tournaments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        const data = await r.json();
        toast.success('Tournament created!');
        navigate(`/sport/tournament/${data.tournament_id}`);
      } else { const e = await r.json(); toast.error(e.detail || 'Error'); }
    } catch { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
          <Swords className="h-5 w-5 text-white" />
          <h1 className="text-base font-bold text-white">Create Tournament</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div><Label className="text-xs">Tournament Name</Label><Input value={form.name} onChange={e => set('name', e.target.value)} className="h-10" placeholder="March Madness 2026" /></div>
            
            <div>
              <Label className="text-xs">Format</Label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {FORMATS.map(f => (
                  <button key={f.value} className={`text-left p-3 rounded-lg border transition-all ${
                    form.format === f.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'}`}
                    onClick={() => set('format', f.value)}>
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground block">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Max Players</Label>
                <Select value={String(form.max_participants)} onValueChange={v => set('max_participants', parseInt(v))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{[4,8,16,32].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Best of</Label>
                <Select value={String(form.sets_to_win)} onValueChange={v => set('sets_to_win', parseInt(v))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 set</SelectItem>
                    <SelectItem value="2">Bo3</SelectItem>
                    <SelectItem value="3">Bo5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full h-12 text-base font-bold text-white" style={{ background: '#7c3aed' }}
              onClick={handleSubmit} disabled={submitting}>
              <Swords className="h-5 w-5 mr-2" /> {submitting ? '...' : 'Create Tournament'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
