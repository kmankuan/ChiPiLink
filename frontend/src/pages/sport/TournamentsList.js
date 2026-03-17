import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

export default function TournamentsList() {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getTournaments()
      .then(res => setTournaments(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6" data-testid="tournaments-list">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="text-amber-500" /> {t('tournaments')}
      </h1>
      {tournaments.length === 0 ? (
        <Card><CardContent className="text-center py-12"><p className="text-gray-400">{t('noData')}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t_item => (
            <Link key={t_item.tournament_id} to={`/sport/tournament/${t_item.tournament_id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{t_item.name}</p>
                      <p className="text-sm text-gray-500">{t_item.format} • {t_item.participants?.length || 0} players</p>
                    </div>
                    <Badge variant={t_item.status === 'in_progress' ? 'default' : t_item.status === 'completed' ? 'secondary' : 'outline'}>
                      {t_item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
