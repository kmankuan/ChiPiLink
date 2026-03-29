/**
 * League Detail — Standings table, match matrix, match history
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Grid3x3, List, RefreshCw, Sparkles, Settings2, Plus, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function H2HMatrix({ matches, standings }) {
  if (!standings.length) return <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>;

  // Build result map
  const results = {};
  for (const m of matches) {
    const aId = m.player_a?.player_id;
    const bId = m.player_b?.player_id;
    if (!aId || !bId || m.status !== 'validated') continue;
    
    const key = `${aId}_${bId}`;
    if (!results[key]) results[key] = { wins: 0, losses: 0, scores: [] };
    if (m.winner_id === aId) results[key].wins++;
    else results[key].losses++;
    results[key].scores.push(`${m.score_winner}-${m.score_loser}`);
    
    const rev = `${bId}_${aId}`;
    if (!results[rev]) results[rev] = { wins: 0, losses: 0, scores: [] };
    if (m.winner_id === bId) results[rev].wins++;
    else results[rev].losses++;
  }

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="text-[10px] border-collapse min-w-full">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted-foreground sticky left-0 bg-card z-10 min-w-[60px]">vs</th>
            {standings.map(p => (
              <th key={p.player_id} className="p-1 text-center text-muted-foreground min-w-[40px]" title={p.nickname}>
                <div className="truncate w-10">{p.nickname?.substring(0, 4)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map(row => (
            <tr key={row.player_id} className="border-t border-muted/30">
              <td className="p-1 font-medium sticky left-0 bg-card z-10 truncate max-w-[70px]">{row.nickname}</td>
              {standings.map(col => {
                if (row.player_id === col.player_id) {
                  return <td key={col.player_id} className="p-1 text-center bg-muted/20">—</td>;
                }
                const r = results[`${row.player_id}_${col.player_id}`];
                if (!r) return <td key={col.player_id} className="p-1 text-center text-muted-foreground/30">·</td>;
                const won = r.wins > r.losses;
                const tied = r.wins === r.losses && r.wins > 0;
                return (
                  <td key={col.player_id} className={`p-1 text-center font-mono font-bold ${won ? 'text-green-600 bg-green-50/50' : tied ? 'text-yellow-600 bg-yellow-50/50' : 'text-red-500 bg-red-50/30'}`}
                    title={r.scores.join(', ')}>
                    {r.wins}W
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState('standings');
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [showLabelSettings, setShowLabelSettings] = useState(false);
  const [labelDraft, setLabelDraft] = useState([]); // local edits
  const [savingLabels, setSavingLabels] = useState(false);
  const token = localStorage.getItem('auth_token');

  const loadData = useCallback(() => {
    Promise.all([
      fetch(`${API}/api/sport/leagues/${leagueId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/sport/leagues/${leagueId}/standings`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/sport/matches?league_id=${leagueId}&limit=50`).then(r => r.ok ? r.json() : []),
    ]).then(([l, s, m]) => {
      setLeague(l);
      setStandings(s);
      setMatches(m);
      setLabelDraft(l?.position_labels || []);
    }).catch(() => {});
  }, [leagueId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateDemo = async () => {
    if (!confirm('Generate demo round-robin matches for all existing players in this league?')) return;
    setGeneratingDemo(true);
    try {
      const res = await fetch(`${API}/api/sport/leagues/${leagueId}/generate-demo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Done! ${data.generated_new} matches generated, ${data.validated_existing} validated.`);
        loadData();
      } else {
        toast.error('Error generating demo data');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setGeneratingDemo(false);
    }
  };

  const handleSaveLabels = async () => {
    setSavingLabels(true);
    try {
      const clean = labelDraft.map(l => l.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/sport/leagues/${leagueId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_labels: clean }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLeague(updated);
        setLabelDraft(updated.position_labels || []);
        setShowLabelSettings(false);
        toast.success('Position labels saved');
      } else {
        toast.error('Failed to save labels');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSavingLabels(false);
    }
  };

  if (!league) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}><span className="text-muted-foreground">Loading...</span></div>;

  const posLabels = league.position_labels || [];
  // Get the label for position i (0-indexed). Falls back to medal then number.
  const getPosLabel = (i) => {
    if (posLabels[i]) return posLabels[i];
    const medals = ['🥇', '🥈', '🥉'];
    return i < 3 ? medals[i] : String(i + 1);
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/sport')}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white truncate">{league.name}</h1>
              <p className="text-[10px] text-white/50">{league.season} • {league.rating_system}</p>
            </div>
            <Badge className="bg-green-500/20 text-green-300 text-[10px] shrink-0">{league.status}</Badge>
            {token && (
              <>
                <button
                  onClick={() => { setShowLabelSettings(v => !v); setLabelDraft(posLabels.length ? [...posLabels] : []); }}
                  title="Configure position labels"
                  className={`p-1.5 rounded-full transition-colors ${showLabelSettings ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'}`}
                  data-testid="label-settings-btn"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleGenerateDemo}
                  disabled={generatingDemo}
                  title="Generate demo round-robin data"
                  className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-40"
                  data-testid="generate-demo-btn"
                >
                  {generatingDemo ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Position Labels Settings Panel */}
      {showLabelSettings && token && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3" data-testid="label-settings-panel">
          <div className="max-w-lg mx-auto space-y-2">
            <p className="text-xs font-semibold text-amber-800">Custom Position Labels</p>
            <p className="text-[10px] text-amber-600">Assign a custom title to each ranked position (e.g. 老大, 老二, 老三…). Leave empty to use the default medal/number.</p>
            <div className="space-y-1.5">
              {labelDraft.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-amber-700 w-16 shrink-0 font-mono">#{i + 1}</span>
                  <Input
                    value={label}
                    onChange={e => {
                      const next = [...labelDraft];
                      next[i] = e.target.value;
                      setLabelDraft(next);
                    }}
                    placeholder={`Position ${i + 1} title`}
                    className="h-8 text-sm flex-1 border-amber-300"
                    data-testid={`label-input-${i}`}
                  />
                  <button
                    onClick={() => setLabelDraft(labelDraft.filter((_, j) => j !== i))}
                    className="text-amber-400 hover:text-red-500 shrink-0"
                    data-testid={`label-remove-${i}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLabelDraft([...labelDraft, ''])}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
                data-testid="add-label-btn"
              >
                <Plus className="h-3.5 w-3.5" /> Add position
              </button>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLabelSettings(false)}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1" onClick={handleSaveLabels} disabled={savingLabels} data-testid="save-labels-btn">
                  {savingLabels ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="standings" className="flex-1 text-xs gap-1"><Trophy className="h-3 w-3" /> {t('sport.standings')}</TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1 text-xs gap-1"><Grid3x3 className="h-3 w-3" /> {t('sport.matrix')}</TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 text-xs gap-1"><List className="h-3 w-3" /> {t('sport.matchHistory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card>
              <CardContent className="p-2">
                {standings.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">{t('sport.noPlayers')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="py-2 text-left pl-2 w-16">Rank</th>
                          <th className="py-2 text-left">Player</th>
                          <th className="py-2 text-center w-10">{t('sport.points')}</th>
                          <th className="py-2 text-center w-8">{t('sport.winsShort')}</th>
                          <th className="py-2 text-center w-8">{t('sport.lossesShort')}</th>
                          <th className="py-2 text-center w-10">{t('sport.elo')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => {
                          const posLabel = posLabels[i];
                          return (
                            <tr key={s.player_id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 pl-2">
                                {posLabel ? (
                                  <span className="font-bold text-primary text-sm">{posLabel}</span>
                                ) : (
                                  <span className="font-bold">{getPosLabel(i)}</span>
                                )}
                              </td>
                              <td className="py-2 font-medium">{s.nickname}</td>
                              <td className="py-2 text-center font-bold">{s.points}</td>
                              <td className="py-2 text-center text-green-600">{s.wins}</td>
                              <td className="py-2 text-center text-red-500">{s.losses}</td>
                              <td className="py-2 text-center font-mono">{s.elo}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix">
            <Card>
              <CardContent className="p-2">
                <H2HMatrix matches={matches} standings={standings} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardContent className="p-2">
                {matches.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">{t('sport.noMatches')}</p>
                ) : (
                  <div className="space-y-2">
                    {matches.map(m => {
                      const pa = m.player_a || {}; const pb = m.player_b || {};
                      const isAWin = m.winner_id === pa.player_id;
                      return (
                        <div key={m.match_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-medium truncate ${isAWin ? 'text-green-600 font-bold' : ''}`}>{pa.nickname}</span>
                            <span className="text-[9px] text-muted-foreground">vs</span>
                            <span className={`text-xs font-medium truncate ${!isAWin ? 'text-green-600 font-bold' : ''}`}>{pb.nickname}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold">{m.score_winner}-{m.score_loser}</span>
                            <span className={`text-[9px] ${isAWin ? 'text-amber-600' : 'text-blue-600'}`}>
                              {isAWin ? pa.nickname?.charAt(0) : pb.nickname?.charAt(0)}✓
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
