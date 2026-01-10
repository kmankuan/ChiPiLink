/**
 * RankRewardsDisplay - Muestra las recompensas disponibles por rango
 * Con modal de celebración al subir de rango
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift, Star, Crown, Sparkles, Trophy, ChevronRight,
  Check, Lock, Zap, Shield, Award, PartyPopper
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Confetti animation component
function Confetti() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 8 + Math.random() * 8
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// Rank Promotion Celebration Modal
export function RankPromotionModal({ isOpen, onClose, promotion, lang = 'es' }) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!promotion) return null;

  const { new_rank, reward } = promotion;

  return (
    <>
      {showConfetti && <Confetti />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-orange-50 to-amber-100 -z-10" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-30 -z-10 animate-pulse" />
          
          <DialogHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce-slow">
                  <span className="text-5xl">{new_rank.icon}</span>
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-spin-slow" />
                <PartyPopper className="absolute -bottom-2 -left-2 w-8 h-8 text-orange-500 animate-bounce" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {t('ranks.promotion')}
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-4 py-4">
            <p className="text-lg">
              {lang === 'es' ? '¡Felicidades! Has alcanzado el rango' : 'Congratulations! You reached'}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full border-2 border-yellow-400">
              <span className="text-3xl">{new_rank.icon}</span>
              <span className="text-xl font-bold text-yellow-700">{new_rank.name}</span>
            </div>

            {/* Rewards section */}
            {reward && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  {t('ranks.rewards')}
                </h4>
                
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-yellow-200 space-y-3">
                  {/* Bonus points */}
                  {reward.bonus_points > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-600">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        {t('ranks.bonusPoints')}
                      </span>
                      <span className="font-bold text-yellow-600">+{reward.bonus_points}</span>
                    </div>
                  )}
                  
                  {/* Badges */}
                  {reward.badges && reward.badges.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-600">
                        <Award className="w-4 h-4 text-purple-500" />
                        {t('ranks.specialBadge')}
                      </span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {reward.badges[0].name || reward.badges[0]}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Perks */}
                  {reward.perks && reward.perks.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-2 text-gray-600 mb-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        {t('ranks.perks')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {reward.perks.map((perk, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {perk.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Description */}
                  {reward.description && (
                    <p className="text-sm text-gray-500 italic pt-2 border-t border-gray-100">
                      {reward.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button 
              onClick={onClose}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8"
            >
              ¡Genial! 🎉
            </Button>
          </div>
          
          {/* Animation styles */}
          <style>{`
            @keyframes bounce-slow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .animate-bounce-slow {
              animation: bounce-slow 1.5s ease-in-out infinite;
            }
            .animate-spin-slow {
              animation: spin-slow 3s linear infinite;
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Full Rank Rewards Display Card
export default function RankRewardsDisplay({ jugadorId, showAll = false }) {
  const { t, i18n } = useTranslation();
  const [ranksInfo, setRanksInfo] = useState([]);
  const [playerRank, setPlayerRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(showAll);

  const lang = i18n.language || 'es';

  useEffect(() => {
    fetchData();
  }, [jugadorId, lang]);

  const fetchData = async () => {
    try {
      // Fetch rank rewards info
      const infoResponse = await fetch(`${API_URL}/api/pinpanclub/rank-rewards/info?lang=${lang}`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setRanksInfo(infoData.ranks || []);
      }

      // Fetch player's current rank if jugadorId provided
      if (jugadorId) {
        const playerResponse = await fetch(
          `${API_URL}/api/pinpanclub/rank-rewards/current/${jugadorId}?lang=${lang}`
        );
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          setPlayerRank(playerData);
        }
      }
    } catch (error) {
      console.error('Error fetching rank rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRanks = expanded ? ranksInfo : ranksInfo.slice(0, 4);
  const currentRankIndex = playerRank?.current_rank 
    ? ranksInfo.findIndex(r => r.id === playerRank.current_rank.id)
    : -1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t('ranks.rewards')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Player's current progress */}
        {playerRank && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-3xl">{playerRank.current_rank?.icon || '🥉'}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t('ranks.currentRank')}</p>
                <p className="text-xl font-bold text-yellow-700">
                  {playerRank.current_rank?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {playerRank.total_points?.toLocaleString()} pts
                </p>
              </div>
              {playerRank.next_rank && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('ranks.nextRank')}</p>
                  <p className="font-medium">{playerRank.next_rank.icon} {playerRank.next_rank.name}</p>
                  <p className="text-xs text-purple-600">
                    {playerRank.points_to_next} {t('ranks.pointsToNext')}
                  </p>
                </div>
              )}
            </div>
            {playerRank.next_rank && (
              <div className="mt-3">
                <Progress 
                  value={Math.round(((playerRank.total_points - (ranksInfo[currentRankIndex]?.min_points || 0)) / 
                    (playerRank.next_rank.min_points - (ranksInfo[currentRankIndex]?.min_points || 0))) * 100)} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* Ranks list */}
        <div className="space-y-3">
          {displayRanks.map((rank, index) => {
            const isEarned = playerRank?.earned_ranks?.includes(rank.id);
            const isCurrent = playerRank?.current_rank?.id === rank.id;
            const isLocked = currentRankIndex >= 0 && index > currentRankIndex;

            return (
              <div
                key={rank.id}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${isCurrent 
                    ? 'border-yellow-400 bg-yellow-50 shadow-lg shadow-yellow-100' 
                    : isEarned 
                      ? 'border-green-300 bg-green-50' 
                      : isLocked 
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Rank icon */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isCurrent 
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                      : isEarned 
                        ? 'bg-gradient-to-br from-green-400 to-green-600'
                        : 'bg-gray-200'
                    }
                  `}>
                    <span className="text-2xl">{rank.icon}</span>
                  </div>

                  {/* Rank info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{rank.name}</h4>
                      {isEarned && !isCurrent && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {isCurrent && (
                        <Badge className="bg-yellow-500 text-white text-xs">
                          {t('ranks.currentRank')}
                        </Badge>
                      )}
                      {isLocked && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {rank.min_points?.toLocaleString()}
                      {rank.max_points ? ` - ${rank.max_points.toLocaleString()}` : '+'} pts
                    </p>
                  </div>

                  {/* Reward preview */}
                  {rank.reward && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-purple-600">
                        <Gift className="w-4 h-4" />
                        <span className="font-bold">+{rank.reward.value}</span>
                      </div>
                      {rank.reward.badge && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {rank.reward.badge.icon} {rank.reward.badge.name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded reward details */}
                {rank.reward && (isCurrent || isEarned) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{rank.reward.description}</p>
                    {rank.reward.perks && rank.reward.perks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rank.reward.perks.map((perk, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {perk.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse button */}
        {ranksInfo.length > 4 && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ver menos' : `Ver todos los rangos (${ranksInfo.length})`}
            <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Compact inline display
export function RankRewardBadge({ rankId, reward }) {
  if (!reward) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full text-xs">
      <Gift className="w-3 h-3 text-purple-500" />
      <span className="text-purple-700">+{reward.value} pts</span>
      {reward.badge && (
        <span>{reward.badge.icon}</span>
      )}
    </div>
  );
}
