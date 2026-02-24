/**
 * PinPan Arena - Public Tournament Page
 * Shareable, no-auth-required view of a tournament
 * With social sharing capabilities
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
import RESOLVED_API_URL from '@/config/apiUrl';
  Trophy, Users, Swords, Zap, Grid3X3, Crown, Share2,
  CheckCircle, Clock, Medal, Award, Loader2, Copy, ExternalLink,
  Wifi, WifiOff
} from 'lucide-react';

const API_URL = RESOLVED_API_URL;
const WS_URL = API_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const FORMAT_ICONS = { single_elimination: Swords, round_robin: Grid3X3, group_knockout: Crown, rapidpin: Zap };
const FORMAT_LABELS = {
  single_elimination: 'Single Elimination', round_robin: 'Round Robin',
  group_knockout: 'Group + Knockout', rapidpin: 'RapidPin Mode',
};
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600', registration_open: 'bg-green-100 text-green-700',
  registration_closed: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-600',
};

export default function ArenaPublic() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/pinpanclub/arena/tournaments/${tournamentId}`),
        fetch(`${API_URL}/api/pinpanclub/arena/tournaments/${tournamentId}/matches`),
      ]);
      if (tRes.ok) setTournament(await tRes.json());
      if (mRes.ok) setMatches(await mRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // WebSocket for live updates
  const connectWS = useCallback(() => {
    if (!tournamentId || !WS_URL) return;
    try {
      const url = `${WS_URL}/api/pinpanclub/ws/live?type=spectator&tournament_id=${tournamentId}`;
      wsRef.current = new WebSocket(url);
      wsRef.current.onopen = () => setWsConnected(true);
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'arena_update') {
            if (data.tournament) setTournament(data.tournament);
            if (data.matches) setMatches(data.matches);
          } else if (data.type === 'ping') {
            wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (e) { /* ignore */ }
      };
      wsRef.current.onclose = () => {
        setWsConnected(false);
        reconnectRef.current = setTimeout(connectWS, 5000);
      };
    } catch { /* fallback to polling */ }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
    connectWS();
    // Polling fallback every 10s
    const poll = setInterval(fetchData, 10000);
    return () => {
      clearInterval(poll);
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [fetchData, connectWS]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async (platform) => {
    const text = tournament ? `${tournament.name} - PinPan Arena Tournament` : 'PinPan Arena Tournament';

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + shareUrl)}`, '_blank');
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
      } catch {
        toast.error('Could not copy link');
      }
    } else if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({ title: text, url: shareUrl });
      } catch { /* user cancelled */ }
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!tournament) return <div className="text-center py-12 text-muted-foreground">Tournament not found</div>;

  const FormatIcon = FORMAT_ICONS[tournament.format] || Swords;
  const isCompleted = tournament.status === 'completed';
  const isInProgress = tournament.status === 'in_progress';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white" data-testid="public-tournament-header">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <FormatIcon className="h-5 w-5" />
                </div>
                <Badge className={`${STATUS_COLORS[tournament.status]} text-xs`} variant="outline">
                  {tournament.status?.replace(/_/g, ' ')}
                </Badge>
                {(isInProgress || isCompleted) && (
                  <span className="flex items-center gap-1 text-xs text-white/70">
                    {wsConnected ? <Wifi className="h-3 w-3 text-green-300" /> : <WifiOff className="h-3 w-3 text-amber-300" />}
                    {wsConnected ? 'Live' : 'Auto-refresh'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" data-testid="public-tournament-name">{tournament.name}</h1>
              {tournament.description && <p className="text-white/70 mt-1 text-sm">{tournament.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {tournament.total_participants} players</span>
                <span>{FORMAT_LABELS[tournament.format]}</span>
                {tournament.best_of && <span>Best of {tournament.best_of}</span>}
              </div>
            </div>
            {/* Share Buttons */}
            <div className="flex gap-2 shrink-0" data-testid="share-buttons">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => handleShare('whatsapp')} data-testid="share-whatsapp">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => handleShare('copy')} data-testid="share-copy">
                <Copy className="h-4 w-4 mr-1" /> Copy Link
              </Button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => handleShare('native')} data-testid="share-native">
                  <Share2 className="h-4 w-4 mr-1" /> Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Champion Banner */}
        {isCompleted && tournament.champion_id && (
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="public-champion-banner">
            <CardContent className="p-4 text-center">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-amber-500" />
              <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Champion</p>
              <p className="text-xl font-bold text-amber-700">
                {tournament.participants?.find(p => p.player_id === tournament.champion_id)?.player_name || 'Unknown'}
              </p>
              <div className="flex justify-center gap-6 mt-2 text-sm text-muted-foreground">
                {tournament.runner_up_id && (
                  <span className="flex items-center gap-1">
                    <Medal className="h-4 w-4 text-gray-400" />
                    {tournament.participants?.find(p => p.player_id === tournament.runner_up_id)?.player_name}
                  </span>
                )}
                {tournament.third_place_id && (
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-orange-400" />
                    {tournament.participants?.find(p => p.player_id === tournament.third_place_id)?.player_name}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        <Card data-testid="public-participants-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Participants ({tournament.total_participants})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.participants?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tournament.participants.map((p) => (
                  <div key={p.player_id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm" data-testid={`public-participant-${p.player_id}`}>
                    {p.seed && <span className="text-xs font-bold text-indigo-500">#{p.seed}</span>}
                    {p.group && <span className="text-xs font-semibold text-purple-500">[{p.group}]</span>}
                    <span>{p.player_name || p.player_id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No participants yet</p>
            )}
          </CardContent>
        </Card>

        {/* Standings */}
        {(tournament.format === 'round_robin' || tournament.format === 'rapidpin') &&
          tournament.group_standings?.__rr__?.length > 0 && (
          <Card data-testid="public-rr-standings">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">#</th><th className="p-2 text-left">Player</th>
                  <th className="p-2 text-center">P</th><th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">L</th><th className="p-2 text-center font-bold">Pts</th>
                </tr></thead>
                <tbody>
                  {tournament.group_standings.__rr__.map((s, i) => (
                    <tr key={s.player_id} className="border-b last:border-0">
                      <td className="p-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{s.player_name || s.player_id}</td>
                      <td className="p-2 text-center">{s.played}</td>
                      <td className="p-2 text-center text-green-600">{s.won}</td>
                      <td className="p-2 text-center text-red-500">{s.lost}</td>
                      <td className="p-2 text-center font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Group Standings */}
        {tournament.format === 'group_knockout' && Object.keys(tournament.group_standings || {}).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2" data-testid="public-group-standings">
            {Object.entries(tournament.group_standings).map(([group, standings]) => (
              <Card key={group}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Group {group}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Player</th><th className="p-2 text-center">P</th>
                      <th className="p-2 text-center">W</th><th className="p-2 text-center">L</th>
                      <th className="p-2 text-center font-bold">Pts</th>
                    </tr></thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.player_id} className={`border-b last:border-0 ${i < (tournament.players_per_group_advance || 2) ? 'bg-green-50 dark:bg-green-950/10' : ''}`}>
                          <td className="p-2 font-medium truncate max-w-[120px]">{s.player_name || s.player_id}</td>
                          <td className="p-2 text-center">{s.played}</td>
                          <td className="p-2 text-center text-green-600">{s.won}</td>
                          <td className="p-2 text-center text-red-500">{s.lost}</td>
                          <td className="p-2 text-center font-bold">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Matches / Bracket */}
        {matches.length > 0 && (
          <Card data-testid="public-matches-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Swords className="h-4 w-4" /> Bracket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.brackets?.map((bracket, bi) => {
                const roundMatches = matches.filter(m => {
                  if (bracket.name === 'Third Place') return m.group === '__third_place__';
                  if (m.group === '__third_place__') return false;
                  return m.round_num === bracket.round;
                });
                if (roundMatches.length === 0) return null;
                return (
                  <div key={bi}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{bracket.name}</h3>
                    <div className="space-y-2">
                      {roundMatches.map(m => {
                        const isDone = m.status === 'completed' || m.status === 'bye';
                        return (
                          <div key={m.match_id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${isDone ? 'bg-muted/30' : 'bg-background'}`} data-testid={`public-match-${m.match_id}`}>
                            <div className={`flex-1 text-right truncate ${m.winner_id === m.player_a_id ? 'font-bold text-green-600' : ''}`}>
                              {m.player_a_name || 'TBD'}
                            </div>
                            <div className="shrink-0 w-20 text-center">
                              {isDone ? (
                                <span className="font-mono font-bold text-xs">{m.score_a} - {m.score_b}{m.status === 'bye' && ' (bye)'}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">{m.player_a_id && m.player_b_id ? 'vs' : 'TBD'}</span>
                              )}
                            </div>
                            <div className={`flex-1 truncate ${m.winner_id === m.player_b_id ? 'font-bold text-green-600' : ''}`}>
                              {m.player_b_name || 'TBD'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground mb-2">Powered by PinPan Arena</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/pinpanclub/arena')} data-testid="public-view-all-btn">
            <ExternalLink className="h-3 w-3 mr-1" /> View All Tournaments
          </Button>
        </div>
      </div>
    </div>
  );
}
