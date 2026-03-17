import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Medal, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LeaguesList() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getLeagues()
      .then(res => setLeagues(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6" data-testid="leagues-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Medal className="text-amber-500" /> {t('leagues')}
        </h1>
      </div>
      {leagues.length === 0 ? (
        <Card><CardContent className="text-center py-12"><p className="text-gray-400">{t('noData')}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leagues.map(l => (
            <Link key={l.league_id} to={`/sport/league/${l.league_id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-sm text-gray-500">{l.season || 'No season'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === 'active' ? 'default' : 'secondary'}>{l.status}</Badge>
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
