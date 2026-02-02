/**
 * Challenge Modal - Select opponent to challenge
 * 我要挑战 - I want to challenge
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, Search, Swords, Loader2, Trophy, 
  Target, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

export default function ChallengeModal({ 
  seasonId, 
  onChallengeCreated
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const currentUserId = user?.user_id;

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredPlayers(
        players.filter(p => 
          p.nombre?.toLowerCase().includes(query) ||
          p.nickname?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredPlayers(players);
    }
  }, [searchQuery, players]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/pinpanclub/players`);
      if (response.ok) {
        const data = await response.json();
        // Filter current user from the list
        const available = (data.players || data || []).filter(
          p => p.player_id !== currentUserId
        );
        setPlayers(available);
        setFilteredPlayers(available);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChallenge = () => {
    if (!isAuthenticated) {
      toast.error(t('rapidpin.loginRequired'));
      navigate('/login');
      return;
    }
    setIsOpen(true);
  };

  const handleSelectOpponent = (player) => {
    if (player.player_id === currentUserId) {
      toast.error(t('rapidpin.cantChallengeSelf'));
      return;
    }
    setSelectedOpponent(player);
    setConfirmOpen(true);
  };

  const handleConfirmChallenge = async () => {
    if (!selectedOpponent || !seasonId || !currentUserId) return;

    setSending(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/pinpanclub/rapidpin/challenge?` + 
        `season_id=${seasonId}&challenger_id=${currentUserId}&opponent_id=${selectedOpponent.player_id}`,
        { method: 'POST' }
      );

      if (response.ok) {
        toast.success(t('rapidpin.success'), { description: t('rapidpin.successDesc') });
        setConfirmOpen(false);
        setIsOpen(false);
        setSelectedOpponent(null);
        onChallengeCreated?.();
      } else {
        const error = await response.json();
        toast.error(error.detail || t('rapidpin.error'));
      }
    } catch (error) {
      toast.error(t('rapidpin.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Main Challenge Button */}
      <Button
        size="lg"
        onClick={handleOpenChallenge}
        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-xl px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        data-testid="challenge-btn"
      >
        <Target className="h-6 w-6 mr-3" />
        <div className="flex flex-col items-start">
          <span className="text-2xl">{t('rapidpin.challengeBtn')}</span>
          <span className="text-xs opacity-80 font-normal">{t('rapidpin.challengeSubtitle')}</span>
        </div>
      </Button>

      {/* Player Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Swords className="h-6 w-6 text-orange-500" />
              {t('rapidpin.selectOpponent')}
            </DialogTitle>
            <DialogDescription>{t('rapidpin.selectOpponentDesc')}</DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('rapidpin.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Player List */}
          <ScrollArea className="h-[350px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredPlayers.length > 0 ? (
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.player_id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-orange-200 group-hover:ring-orange-400 transition-all">
                        <AvatarImage src={player.avatar} />
                        <AvatarFallback className="bg-orange-100 text-orange-600">
                          {player.nombre?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {player.nickname || player.nombre}
                        </p>
                        {player.nombre && player.nickname && (
                          <p className="text-xs text-muted-foreground">{player.nombre}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {player.stats && (
                            <>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                                {player.stats.wins || 0} {t('rapidpin.wins')}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                                {player.stats.losses || 0} {t('rapidpin.losses')}
                              </Badge>
                            </>
                          )}
                          {player.puntos_totales !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {player.puntos_totales} {t('rapidpin.points')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectOpponent(player)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Swords className="h-4 w-4 mr-1" />
                      {t('rapidpin.challenge')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                <p>{t('rapidpin.noPlayers')}</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-orange-500" />
              {txt.confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30">
                <Avatar className="h-16 w-16 ring-2 ring-orange-400">
                  <AvatarImage src={selectedOpponent?.avatar} />
                  <AvatarFallback className="bg-orange-200 text-orange-700 text-xl">
                    {selectedOpponent?.nombre?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {selectedOpponent?.nickname || selectedOpponent?.nombre}
                  </p>
                  <p className="text-sm">{txt.confirmDesc}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {txt.confirmNote}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>{txt.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChallenge}
              disabled={sending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {txt.sending}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {txt.confirm}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
