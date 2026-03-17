/**
 * Leagues List — Shows all leagues with status and navigation
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Medal, Users, Calendar, Trophy } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function LeaguesList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/sport/leagues`)
      .then(r => r.ok ? r.json() : [])
      .then(setLeagues)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sport')} className="shrink-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Medal className="h-5 w-5 text-purple-600" /> Leagues</h1>
          <p className="text-sm text-muted-foreground">{leagues.length} league{leagues.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Medal className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No leagues yet</p>
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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{league.players?.length || 0} players</span>
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{league.matches_played || 0} matches</span>
                      {league.created_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(league.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
