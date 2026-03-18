/**
 * Rankings Page — ELO leaderboard, Referee rankings, Streaks
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Scale, Zap, ArrowLeft } from 'lucide-react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function PlayerRow({ player, index }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold w-6 text-center ${index < 3 ? '' : 'text-muted-foreground'}`}>
          {index < 3 ? medals[index] : index + 1}
        </span>
        <div>
          <span className="text-sm font-medium">{player.nickname}</span>
          {player.stats?.current_streak >= 3 && <span className="ml-1 text-[10px]">🔥{player.stats.current_streak}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono font-bold text-base">{player.elo}</span>
        <div className="text-right text-muted-foreground">
          <div>{player.stats?.wins || 0}W / {player.stats?.losses || 0}L</div>
          <div className="text-[10px]">{player.stats?.win_rate || 0}%</div>
        </div>
      </div>
    </div>
  );
}

function RefereeRow({ player, index }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold w-6 text-center text-muted-foreground">{index + 1}</span>
        <span className="text-sm font-medium">{player.nickname}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          <Scale className="h-3 w-3 mr-1" />
          {player.stats?.matches_refereed || 0}
        </Badge>
        {(player.stats?.matches_refereed || 0) >= 20 && <Badge className="bg-amber-100 text-amber-700 text-[9px]">Trusted</Badge>}
      </div>
    </div>
  );
}

export default function Rankings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('elo');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/sport/rankings?type=${tab}`)
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      <div style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-bold text-white">{t('sport.rankings')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="elo" className="flex-1 text-xs gap-1"><Trophy className="h-3 w-3" /> ELO</TabsTrigger>
            <TabsTrigger value="referees" className="flex-1 text-xs gap-1"><Scale className="h-3 w-3" /> {t('sport.referees')}</TabsTrigger>
            <TabsTrigger value="streaks" className="flex-1 text-xs gap-1"><Zap className="h-3 w-3" /> {t('sport.streaks')}</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-2">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>
              ) : data.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">{t('sport.noPlayers')}</p>
              ) : (
                <div className="divide-y">
                  {tab === 'referees' 
                    ? data.map((p, i) => <RefereeRow key={p.player_id} player={p} index={i} />)
                    : data.map((p, i) => <PlayerRow key={p.player_id} player={p} index={i} />)
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
