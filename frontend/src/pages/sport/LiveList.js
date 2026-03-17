import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, Plus } from 'lucide-react';

export default function LiveList() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportApi.getLiveSessions()
      .then(res => setSessions(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="live-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="text-red-500" /> {t('live')}
        </h1>
        <Link to="/sport/live/new">
          <Button data-testid="btn-new-live" size="sm" className="bg-red-600 hover:bg-red-700">
            <Plus size={16} className="mr-1" /> {t('start_live')}
          </Button>
        </Link>
      </div>
      {sessions.length === 0 ? (
        <Card><CardContent className="text-center py-12"><p className="text-gray-400">{t('noData')}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.session_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                    <span className="font-semibold">{s.player_a?.nickname}</span>
                    <span className="text-xl font-bold">{s.score?.a || 0} - {s.score?.b || 0}</span>
                    <span className="font-semibold">{s.player_b?.nickname}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/sport/live/${s.session_id}`}>
                      <Button size="sm" variant="outline">Watch</Button>
                    </Link>
                    <Link to={`/sport/live/${s.session_id}/referee`}>
                      <Button size="sm" variant="default">Referee</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
