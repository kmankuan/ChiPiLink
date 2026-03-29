import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportTopPlayersWidget({ config }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [players, setPlayers] = useState([]);
  
  const limit = config?.limit || 5;
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const title = typeof config?.title === 'object' ? (config.title[currentLang] || config.title.en || 'Top Players') : (config?.title || 'Top Players');

  useEffect(() => {
    fetch(`${API}/api/sport/players?limit=${limit}`)
      .then(r => r.ok ? r.json() : [])
      .then(setPlayers)
      .catch(() => {});
  }, [limit]);

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1">
            <Trophy className="h-4 w-4 text-amber-500" /> {title}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-2 hover:bg-amber-50 text-amber-700" onClick={() => navigate('/sport/rankings')}>
            View all <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {players.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-4">No players yet</p>
        ) : (
          <div className="space-y-1">
            {players.map((p, i) => (
              <div key={p.player_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <span className="text-sm font-medium">{p.nickname}</span>
                  {p.stats?.current_streak >= 3 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded" title="Win Streak">🔥{p.stats.current_streak}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono font-bold text-foreground">{p.elo}</span>
                  <span>{p.stats?.wins || 0}W/{p.stats?.losses || 0}L</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
