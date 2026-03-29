import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportRecentMatchesWidget({ config }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [matches, setMatches] = useState([]);
  
  const limit = config?.limit || 5;
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const title = typeof config?.title === 'object' ? (config.title[currentLang] || config.title.en || 'Recent Matches') : (config?.title || 'Recent Matches');
  const leagueFilter = config?.league_filter || '';

  useEffect(() => {
    let url = `${API}/api/sport/matches?limit=${limit}`;
    if (leagueFilter) url += `&league_id=${leagueFilter}`;
    
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(setMatches)
      .catch(() => {});
  }, [limit, leagueFilter]);

  return (
    <Card>
      <CardContent className="p-3">
        <h3 className="text-sm font-bold flex items-center gap-1 mb-2">
          <List className="h-4 w-4" /> {title}
        </h3>
        
        {matches.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-6">No recent matches</p>
        ) : (
          <div className="space-y-2">
            {matches.map(m => {
              const pa = m.player_a || {};
              const pb = m.player_b || {};
              const isAWinner = m.winner_id === pa.player_id;
              
              return (
                <div key={m.match_id} 
                     className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors" 
                     onClick={() => navigate(`/sport/match/${m.match_id}`)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm font-medium truncate ${isAWinner ? 'text-green-600' : ''}`}>{pa.nickname}</span>
                    <span className="text-[10px] text-muted-foreground">vs</span>
                    <span className={`text-sm font-medium truncate ${!isAWinner ? 'text-green-600' : ''}`}>{pb.nickname}</span>
                    {m.source === 'challenge' && <span className="text-[10px] text-blue-500" title="Challenge Match">⚔️</span>}
                  </div>
                  
                  {config?.show_scores !== false && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-bold">{m.score_winner}-{m.score_loser}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{m.status === 'validated' ? '✓' : '⏳'}</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
