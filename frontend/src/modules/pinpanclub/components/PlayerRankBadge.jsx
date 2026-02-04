/**
 * PlayerRankBadge - Level/rank system based on points
 * Shows the player's current rank with progress towards the next level
 */
import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, Crown, Shield, Star, Gem, Award, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Rank definitions with thresholds and styling
const RANKS = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 99,
    icon: '🥉',
    color: 'from-amber-600 to-amber-800',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-600',
    bgColor: 'bg-amber-100',
    glowColor: 'shadow-amber-500/30',
    description: 'Starting your journey'
  },
  {
    id: 'silver',
    name: 'Silver',
    minPoints: 100,
    maxPoints: 299,
    icon: '🥈',
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-400',
    bgColor: 'bg-gray-100',
    glowColor: 'shadow-gray-400/30',
    description: 'Committed player'
  },
  {
    id: 'gold',
    name: 'Gold',
    minPoints: 300,
    maxPoints: 599,
    icon: '🥇',
    color: 'from-yellow-400 to-yellow-600',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50',
    glowColor: 'shadow-yellow-500/40',
    description: 'Outstanding player'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minPoints: 600,
    maxPoints: 999,
    icon: '💎',
    color: 'from-cyan-400 to-cyan-600',
    textColor: 'text-cyan-600',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50',
    glowColor: 'shadow-cyan-500/40',
    description: 'Club elite'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    minPoints: 1000,
    maxPoints: 1999,
    icon: '💠',
    color: 'from-blue-400 to-indigo-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50',
    glowColor: 'shadow-blue-500/50',
    description: 'Living legend'
  },
  {
    id: 'master',
    name: 'Master',
    minPoints: 2000,
    maxPoints: 4999,
    icon: '👑',
    color: 'from-purple-500 to-purple-700',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50',
    glowColor: 'shadow-purple-500/50',
    description: 'Absolute dominator'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minPoints: 5000,
    maxPoints: Infinity,
    icon: '🏆',
    color: 'from-red-500 via-orange-500 to-yellow-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-500',
    bgColor: 'bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50',
    glowColor: 'shadow-red-500/50',
    description: 'The best of all'
  }
];

// Get rank by points
function getRankByPoints(points) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return { ...RANKS[i], index: i };
    }
  }
  return { ...RANKS[0], index: 0 };
}

// Get next rank
function getNextRank(currentIndex) {
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  return null;
}

// Calculate progress to next rank
function getProgressToNextRank(points, currentRank, nextRank) {
  if (!nextRank) return 100;
  const rangeSize = nextRank.minPoints - currentRank.minPoints;
  const progress = points - currentRank.minPoints;
  return Math.min(Math.round((progress / rangeSize) * 100), 100);
}

// Main component - Full badge with progress
export default function PlayerRankBadge({ playerId, jugadorId, showProgress = true, size = 'normal' }) {
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  // Support both new and legacy prop names
  const playerIdToUse = playerId || jugadorId;
  
  useEffect(() => {
    if (playerIdToUse) {
      fetchRankData();
    }
  }, [playerIdToUse]);
  
  const fetchRankData = async () => {
    try {
      let totalPoints = 0;
      
      // Try direct rank endpoint first
      try {
        const directResponse = await fetch(
          `${API_URL}/api/pinpanclub/challenges/player/${playerIdToUse}/rank`
        );
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.total_points !== undefined) {
            totalPoints = directData.total_points;
          }
        }
      } catch (e) {
        console.log('Direct rank endpoint failed, trying leaderboard');
      }
      
      // Fallback to leaderboard if direct endpoint didn't work
      if (totalPoints === 0) {
        const response = await fetch(
          `${API_URL}/api/pinpanclub/challenges/leaderboard?player_id=${playerIdToUse}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const playerEntry = data.leaderboard?.find(e => e.player_id === playerIdToUse);
          totalPoints = playerEntry?.total_points || 0;
        }
      }
      
      const currentRank = getRankByPoints(totalPoints);
      const nextRank = getNextRank(currentRank.index);
      const progress = getProgressToNextRank(totalPoints, currentRank, nextRank);
      
      setRankData({
        totalPoints,
        currentRank,
        nextRank,
        progress,
        pointsToNext: nextRank ? nextRank.minPoints - totalPoints : 0
      });
    } catch (error) {
      console.error('Error fetching rank data:', error);
      // Set default rank
      const defaultRank = getRankByPoints(0);
      setRankData({
        totalPoints: 0,
        currentRank: defaultRank,
        nextRank: getNextRank(0),
        progress: 0,
        pointsToNext: 100
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className={`animate-pulse ${size === 'compact' ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-white/20`} />
    );
  }
  
  if (!rankData) return null;
  
  const { currentRank, nextRank, progress, totalPoints, pointsToNext } = rankData;
  const isMaxRank = !nextRank;
  const isHighRank = ['diamond', 'master', 'grandmaster'].includes(currentRank.id);
  
  if (size === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`
                inline-flex items-center justify-center w-8 h-8 rounded-full
                bg-gradient-to-br ${currentRank.color} cursor-pointer
                transform transition-all duration-300 hover:scale-110
                ${isHighRank ? 'animate-pulse-subtle shadow-lg ' + currentRank.glowColor : ''}
              `}
            >
              <span className="text-base">{currentRank.icon}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className={`${currentRank.bgColor} border-2 ${currentRank.borderColor}`}>
            <div className="text-center p-1">
              <p className={`font-bold ${currentRank.textColor}`}>{currentRank.name}</p>
              <p className="text-xs text-gray-600">{totalPoints} points</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`
              relative inline-flex flex-col items-center p-3 rounded-xl
              border-2 ${currentRank.borderColor} ${currentRank.bgColor}
              cursor-pointer transform transition-all duration-300
              ${isHovered ? 'scale-105 shadow-lg ' + currentRank.glowColor : ''}
              ${isHighRank ? 'animate-pulse-subtle' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Sparkles for high ranks */}
            {isHighRank && (
              <Sparkles className={`absolute -top-2 -right-2 w-5 h-5 ${currentRank.textColor} animate-spin-slow`} />
            )}
            
            {/* Rank icon */}
            <div className={`
              w-14 h-14 rounded-full bg-gradient-to-br ${currentRank.color}
              flex items-center justify-center shadow-lg
              ${isMaxRank ? 'animate-bounce-slow' : ''}
            `}>
              <span className="text-3xl">{currentRank.icon}</span>
            </div>
            
            {/* Rank name */}
            <p className={`mt-2 font-bold text-sm ${currentRank.textColor}`}>
              {currentRank.name}
            </p>
            
            {/* Points */}
            <p className="text-xs text-gray-500">
              {totalPoints.toLocaleString()} pts
            </p>
            
            {/* Progress bar */}
            {showProgress && nextRank && (
              <div className="w-full mt-2">
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            
            {/* Max rank badge */}
            {isMaxRank && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                MAX
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className={`${currentRank.bgColor} border-2 ${currentRank.borderColor} p-4 max-w-xs`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentRank.icon}</span>
              <div>
                <p className={`font-bold ${currentRank.textColor}`}>{currentRank.name}</p>
                <p className="text-xs text-gray-500">{currentRank.description}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-2">
              <p className="text-sm">
                <span className="font-bold">{totalPoints.toLocaleString()}</span> total points
              </p>
            </div>
            
            {nextRank && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Next: <strong className={RANKS[currentRank.index + 1]?.textColor}>{nextRank.name}</strong></span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 text-center">
                  <strong>{pointsToNext.toLocaleString()}</strong> points to go
                </p>
              </div>
            )}
            
            {isMaxRank && (
              <div className="bg-gradient-to-r from-red-100 to-yellow-100 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-red-600">
                  🎉 You have reached the maximum rank!
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline rank display for lists/tables
export function PlayerRankInline({ points, showLabel = true }) {
  const rank = getRankByPoints(points || 0);
  
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-lg">{rank.icon}</span>
      {showLabel && (
        <span className={`text-sm font-medium ${rank.textColor}`}>
          {rank.name}
        </span>
      )}
    </div>
  );
}

// Mini rank icon only
export function PlayerRankIcon({ points }) {
  const rank = getRankByPoints(points || 0);
  const isHighRank = ['diamond', 'master', 'grandmaster'].includes(rank.id);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={`
              text-xl cursor-pointer transform transition-transform hover:scale-125
              ${isHighRank ? 'animate-pulse-subtle' : ''}
            `}
          >
            {rank.icon}
          </span>
        </TooltipTrigger>
        <TooltipContent className={`${rank.bgColor} border ${rank.borderColor}`}>
          <p className={`font-bold ${rank.textColor}`}>{rank.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Rank progress card for dashboard
export function RankProgressCard({ jugadorId }) {
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (jugadorId) {
      fetchRankData();
    }
  }, [jugadorId]);
  
  const fetchRankData = async () => {
    try {
      let totalPoints = 0;
      
      // Try direct rank endpoint first
      try {
        const directResponse = await fetch(
          `${API_URL}/api/pinpanclub/challenges/player/${jugadorId}/rank`
        );
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.total_points !== undefined) {
            totalPoints = directData.total_points;
          }
        }
      } catch (e) {
        console.log('Direct rank endpoint failed');
      }
      
      // Fallback to leaderboard
      if (totalPoints === 0) {
        const response = await fetch(
          `${API_URL}/api/pinpanclub/challenges/leaderboard?jugador_id=${jugadorId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const playerEntry = data.leaderboard?.find(e => e.jugador_id === jugadorId);
          totalPoints = playerEntry?.total_points || 0;
        }
      }
      
      const currentRank = getRankByPoints(totalPoints);
      const nextRank = getNextRank(currentRank.index);
      const progress = getProgressToNextRank(totalPoints, currentRank, nextRank);
      
      setRankData({
        totalPoints,
        currentRank,
        nextRank,
        progress,
        pointsToNext: nextRank ? nextRank.minPoints - totalPoints : 0
      });
    } catch (error) {
      setRankData(null);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
    );
  }
  
  if (!rankData) return null;
  
  const { currentRank, nextRank, progress, totalPoints, pointsToNext } = rankData;
  
  return (
    <div className={`
      relative overflow-hidden rounded-xl border-2 ${currentRank.borderColor}
      ${currentRank.bgColor} p-4
    `}>
      {/* Background decoration */}
      <div className={`
        absolute top-0 right-0 w-32 h-32 rounded-full 
        bg-gradient-to-br ${currentRank.color} opacity-10 -translate-y-1/2 translate-x-1/2
      `} />
      
      <div className="relative flex items-center gap-4">
        {/* Rank badge */}
        <div className={`
          w-16 h-16 rounded-full bg-gradient-to-br ${currentRank.color}
          flex items-center justify-center shadow-lg
        `}>
          <span className="text-4xl">{currentRank.icon}</span>
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${currentRank.textColor}`}>
            {currentRank.name}
          </h3>
          <p className="text-sm text-gray-500">{currentRank.description}</p>
          <p className="text-lg font-bold mt-1">
            {totalPoints.toLocaleString()} <span className="text-sm font-normal text-gray-400">puntos</span>
          </p>
        </div>
      </div>
      
      {/* Progress to next */}
      {nextRank && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Próximo: <strong>{nextRank.name}</strong> {nextRank.icon}</span>
            <span className={currentRank.textColor}>{progress}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <div 
              className="absolute top-0 h-3 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"
              style={{ width: '30%' }}
            />
          </div>
          <p className="text-xs text-center text-gray-400">
            {pointsToNext.toLocaleString()} puntos para {nextRank.name}
          </p>
        </div>
      )}
      
      {/* Max rank celebration */}
      {!nextRank && (
        <div className="mt-4 text-center bg-gradient-to-r from-red-100 via-orange-100 to-yellow-100 rounded-lg p-3">
          <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-600">
            🎊 ¡Eres un Gran Maestro! 🎊
          </p>
        </div>
      )}
      
      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Export rank utilities
export { RANKS, getRankByPoints, getNextRank, getProgressToNextRank };
