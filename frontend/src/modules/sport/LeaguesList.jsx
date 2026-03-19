/**
 * Leagues List — Shows all leagues + create/edit for admins
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, Medal, Users, Calendar, Trophy, Plus, Settings, Pencil } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LeaguesList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.is_admin;
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', season: '', rating_system: 'elo' });
  const token = localStorage.getItem('auth_token');

  const loadLeagues = () => {
    fetch(`${API}/api/sport/leagues`)
      .then(r => r.ok ? r.json() : [])
      .then(setLeagues)
      .catch(() => [])
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLeagues(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/sport/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('League created!');
        setShowCreate(false);
        setForm({ name: '', description: '', season: '', rating_system: 'elo' });
        loadLeagues();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to create');
      }
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const statusBadge = (status) => {
    const cfg = {
      active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
      completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };
    const c = cfg[status] || cfg.draft;
    return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sport')} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Medal className="h-5 w-5 text-purple-600" /> Leagues</h1>
            <p className="text-sm text-muted-foreground">{leagues.length} league{leagues.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New League
          </Button>
        )}
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Medal className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No leagues yet</p>
            {isAdmin && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create First League
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leagues.map(league => (
            <Card
              key={league.league_id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/sport/league/${league.league_id}`)}
              data-testid={`league-card-${league.league_id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-base truncate">{league.name}</p>
                      {statusBadge(league.status)}
                    </div>
                    {league.description && <p className="text-xs text-muted-foreground mb-1">{league.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {league.season && <span>{league.season}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{league.players?.length || league.total_players || 0} players</span>
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{league.matches_played || league.total_matches || 0} matches</span>
                      {league.rating_system && <span className="text-[9px] uppercase">{league.rating_system}</span>}
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create League Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><Medal className="h-4 w-4" /> New League</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Spring 2026" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Season description..." className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Season</Label>
              <Input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="2026" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Rating System</Label>
              <Select value={form.rating_system} onValueChange={v => setForm(f => ({ ...f, rating_system: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elo">ELO</SelectItem>
                  <SelectItem value="simple">Simple Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create League
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
