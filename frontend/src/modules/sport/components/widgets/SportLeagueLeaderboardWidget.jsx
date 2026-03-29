import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

export default function SportLeagueLeaderboardWidget({ config }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  
  // Use config values safely with defaults
  const leagueId = config?.league_id || '';
  const limit = config?.limit || 10;
  
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const title = typeof config?.title === 'object' ? (config.title[currentLang] || config.title.en || 'League Leaderboard') : (config?.title || 'League Leaderboard');

  useEffect(() => {
    if (!leagueId) return;
    fetch(`${API}/api/sport/leagues/${leagueId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setLeague)
      .catch(() => {});
      
    fetch(`${API}/api/sport/leagues/${leagueId}/standings?limit=${limit}`)
      .then(r => r.ok ? r.json() : [])
      .then(setStandings)
      .catch(() => {});
  }, [leagueId, limit]);

  if (!leagueId) {
    return (
      <Card className="border-dashed border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-amber-700">Please configure a League ID for this widget.</p>
        </CardContent>
      </Card>
    );
  }

  const posLabels = league?.position_labels || [];
  const getPosLabel = (i) => {
    if (posLabels[i]) return posLabels[i];
    const medals = ['🥇', '🥈', '🥉'];
    return i < 3 ? medals[i] : String(i + 1);
  };

  return (
    <Card className="border-amber-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1">
            <Trophy className="h-4 w-4 text-amber-500" /> {title}
          </h3>
          <button 
            className="text-xs text-muted-foreground hover:text-amber-700 flex items-center"
            onClick={() => navigate(`/sport/league/${leagueId}`)}
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        
        {standings.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-4">No rankings yet</p>
        ) : (
          <div className="space-y-1">
            {standings.map((p, i) => (
              <div key={p.player_id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${i < 3 ? 'bg-amber-50/50' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold min-w-[24px] text-center ${i < 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {getPosLabel(i)}
                  </span>
                  <span className="text-sm font-medium">{p.nickname}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                  {config?.show_points !== false && <span>{p.points}pts</span>}
                  {config?.show_elo !== false && <span className="font-bold text-foreground">{p.elo} ELO</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
