/**
 * PinPan Arena - Create Tournament
 * Form for admins/moderators to create a new tournament
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Swords, Grid3X3, Crown, Zap, Trophy, Save
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import RESOLVED_API_URL from '@/config/apiUrl';

const API_URL = RESOLVED_API_URL;

const FORMATS = [
  { value: 'single_elimination', label: 'Single Elimination', icon: Swords, desc: 'Classic bracket — lose once, you\'re out' },
  { value: 'round_robin', label: 'Round Robin', icon: Grid3X3, desc: 'Everyone plays everyone' },
  { value: 'group_knockout', label: 'Group + Knockout', icon: Crown, desc: 'Group stage then elimination bracket' },
  { value: 'rapidpin', label: 'RapidPin Mode', icon: Zap, desc: 'Spontaneous matches within a deadline' },
];

const SEEDING_OPTIONS = [
  { value: 'none', label: 'Random (No Seeding)' },
  { value: 'elo', label: 'By ELO Rating' },
  { value: 'superpin', label: 'From SuperPin League' },
  { value: 'rapidpin', label: 'From RapidPin Season' },
  { value: 'manual', label: 'Manual Seeding' },
];

export default function ArenaCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    format: 'single_elimination',
    max_players: 16,
    best_of: 3,
    points_per_set: 11,
    third_place_match: true,
    start_date: '',
    end_date: '',
    registration_deadline: '',
    seeding_source: 'none',
    num_groups: 4,
    players_per_group_advance: 2,
    rapidpin_deadline_hours: 72,
    points_win: 3,
    points_loss: 1,
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const selectedFormat = FORMATS.find(f => f.value === form.format);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Tournament name is required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const body = { ...form };
      if (!body.start_date) delete body.start_date;
      if (!body.end_date) delete body.end_date;
      if (!body.registration_deadline) delete body.registration_deadline;

      const res = await fetch(`${API_URL}/api/pinpanclub/arena/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Tournament created!');
        navigate(`/pinpanclub/arena/${data.tournament_id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to create tournament');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pinpanclub/arena')} data-testid="create-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-bold text-lg">Create Tournament</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Tournament Name *</Label>
              <Input
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. Spring Championship 2026"
                data-testid="tournament-name-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Brief description..."
                rows={2}
                data-testid="tournament-desc-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Format */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tournament Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2" data-testid="format-selector">
              {FORMATS.map(f => {
                const Icon = f.icon;
                const selected = form.format === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => update('format', f.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-border hover:border-indigo-300'
                    }`}
                    data-testid={`format-${f.value}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${selected ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-indigo-600' : ''}`}>{f.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Match Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Match Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Players</Label>
                <Input
                  type="number"
                  value={form.max_players}
                  onChange={e => update('max_players', parseInt(e.target.value) || 8)}
                  min={2}
                  max={128}
                  data-testid="max-players-input"
                />
              </div>
              <div>
                <Label>Best Of</Label>
                <Select value={String(form.best_of)} onValueChange={v => update('best_of', parseInt(v))}>
                  <SelectTrigger data-testid="best-of-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Best of 1</SelectItem>
                    <SelectItem value="3">Best of 3</SelectItem>
                    <SelectItem value="5">Best of 5</SelectItem>
                    <SelectItem value="7">Best of 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.format === 'single_elimination' && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.third_place_match}
                  onCheckedChange={v => update('third_place_match', v)}
                  data-testid="third-place-switch"
                />
                <Label>Third Place Match</Label>
              </div>
            )}
            {form.format === 'group_knockout' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Number of Groups</Label>
                  <Input
                    type="number"
                    value={form.num_groups}
                    onChange={e => update('num_groups', parseInt(e.target.value) || 2)}
                    min={2}
                    max={16}
                    data-testid="num-groups-input"
                  />
                </div>
                <div>
                  <Label>Advance Per Group</Label>
                  <Input
                    type="number"
                    value={form.players_per_group_advance}
                    onChange={e => update('players_per_group_advance', parseInt(e.target.value) || 1)}
                    min={1}
                    max={8}
                    data-testid="advance-per-group-input"
                  />
                </div>
              </div>
            )}
            {form.format === 'rapidpin' && (
              <div>
                <Label>Deadline (hours)</Label>
                <Input
                  type="number"
                  value={form.rapidpin_deadline_hours}
                  onChange={e => update('rapidpin_deadline_hours', parseInt(e.target.value) || 48)}
                  min={1}
                  data-testid="deadline-hours-input"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seeding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seeding</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={form.seeding_source} onValueChange={v => update('seeding_source', v)}>
              <SelectTrigger data-testid="seeding-source-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEEDING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Registration Deadline</Label>
              <Input type="datetime-local" value={form.registration_deadline} onChange={e => update('registration_deadline', e.target.value)} data-testid="reg-deadline-input" />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="datetime-local" value={form.start_date} onChange={e => update('start_date', e.target.value)} data-testid="start-date-input" />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="datetime-local" value={form.end_date} onChange={e => update('end_date', e.target.value)} data-testid="end-date-input" />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2 pb-20">
          <Button variant="outline" onClick={() => navigate('/pinpanclub/arena')} className="flex-1" data-testid="cancel-btn">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            data-testid="save-tournament-btn"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </div>
    </div>
  );
}
