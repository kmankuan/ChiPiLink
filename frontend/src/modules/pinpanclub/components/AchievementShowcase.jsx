/**
 * AchievementShowcase - Componente de badges visuales con animaciones
 * Muestra los logros más recientes del jugador con efectos de celebración
 */
import React, { useState, useEffect } from 'react';
import { Award, Sparkles, Crown, Star, Trophy, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Rarity configurations
const rarityConfig = {
  common: {
    bgClass: 'bg-gradient-to-br from-gray-100 to-gray-200',
    borderClass: 'border-gray-300',
    glowClass: '',
    textClass: 'text-gray-700',
    label: 'Común'
  },
  rare: {
    bgClass: 'bg-gradient-to-br from-blue-100 to-blue-200',
    borderClass: 'border-blue-400',
    glowClass: 'shadow-blue-400/30',
    textClass: 'text-blue-700',
    label: 'Raro'
  },
  epic: {
    bgClass: 'bg-gradient-to-br from-purple-100 to-purple-200',
    borderClass: 'border-purple-500',
    glowClass: 'shadow-purple-500/40',
    textClass: 'text-purple-700',
    label: 'Épico'
  },
  legendary: {
    bgClass: 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100',
    borderClass: 'border-yellow-500',
    glowClass: 'shadow-yellow-500/50',
    textClass: 'text-yellow-700',
    label: 'Legendario'
  }
};

// Single Achievement Badge with animation
function AchievementBadge({ achievement, index, showNew = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const rarity = rarityConfig[achievement.achievement_info?.rarity || achievement.rarity] || rarityConfig.common;
  const isLegendary = (achievement.achievement_info?.rarity || achievement.rarity) === 'legendary';
  const isEpic = (achievement.achievement_info?.rarity || achievement.rarity) === 'epic';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              relative p-2 rounded-xl border-2 cursor-pointer
              transform transition-all duration-300 ease-out
              ${rarity.bgClass} ${rarity.borderClass}
              ${isHovered ? 'scale-110 shadow-lg ' + rarity.glowClass : 'scale-100'}
              ${isLegendary ? 'animate-pulse-slow' : ''}
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              animation: `fadeInUp 0.5s ease-out ${index * 100}ms both`
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Sparkle effect for legendary/epic */}
            {(isLegendary || isEpic) && (
              <div className="absolute -top-1 -right-1">
                <Sparkles 
                  className={`w-4 h-4 ${isLegendary ? 'text-yellow-500 animate-spin-slow' : 'text-purple-500'}`} 
                />
              </div>
            )}
            
            {/* New badge indicator */}
            {showNew && (
              <div className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                NEW
              </div>
            )}
            
            {/* Achievement icon */}
            <span 
              className={`text-2xl block text-center ${isLegendary ? 'animate-bounce-slow' : ''}`}
            >
              {achievement.achievement_info?.icon || achievement.icon || '🏅'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className={`${rarity.bgClass} border-2 ${rarity.borderClass} p-3 max-w-xs`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{achievement.achievement_info?.icon || achievement.icon}</span>
              <span className={`font-bold ${rarity.textClass}`}>
                {achievement.achievement_info?.name || achievement.name}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {achievement.achievement_info?.description || achievement.description}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
              <Badge variant="outline" className={rarity.textClass}>
                {rarity.label}
              </Badge>
              {(achievement.achievement_info?.points_reward || achievement.points_reward) > 0 && (
                <span className="text-xs text-yellow-600 font-bold">
                  +{achievement.achievement_info?.points_reward || achievement.points_reward} pts
                </span>
              )}
            </div>
            {achievement.earned_at && (
              <p className="text-xs text-gray-400 mt-1">
                Obtenido: {new Date(achievement.earned_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Main showcase component
export default function AchievementShowcase({ jugadorId, maxDisplay = 5, showTitle = true }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  
  useEffect(() => {
    if (jugadorId) {
      fetchAchievements();
    }
  }, [jugadorId]);
  
  const fetchAchievements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/achievements/player/${jugadorId}`);
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
        
        // Check for recent achievements (last 24h) to show celebration
        const recentAchievements = (data.achievements || []).filter(a => {
          if (!a.earned_at) return false;
          const earnedDate = new Date(a.earned_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return earnedDate > dayAgo;
        });
        
        if (recentAchievements.length > 0) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i}
            className="w-10 h-10 rounded-xl bg-white/20 animate-pulse"
          />
        ))}
      </div>
    );
  }
  
  if (achievements.length === 0) {
    return null;
  }
  
  // Sort by rarity (legendary first) and then by date
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sortedAchievements = [...achievements].sort((a, b) => {
    const rarityA = a.achievement_info?.rarity || a.rarity || 'common';
    const rarityB = b.achievement_info?.rarity || b.rarity || 'common';
    return rarityOrder[rarityA] - rarityOrder[rarityB];
  });
  
  const displayAchievements = sortedAchievements.slice(0, maxDisplay);
  const remaining = achievements.length - maxDisplay;
  
  return (
    <div className="relative">
      {/* Celebration particles */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['✨', '🎉', '⭐', '🏆', '🎊'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        {showTitle && achievements.length > 0 && (
          <div className="flex items-center gap-1 text-white/60 text-sm">
            <Trophy className="w-4 h-4" />
            <span>Logros:</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {displayAchievements.map((achievement, index) => (
            <AchievementBadge
              key={achievement.player_achievement_id || achievement.achievement_id || index}
              achievement={achievement}
              index={index}
              showNew={
                achievement.earned_at && 
                new Date(achievement.earned_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            />
          ))}
          
          {remaining > 0 && (
            <div className="w-10 h-10 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white/60 text-sm font-bold">
              +{remaining}
            </div>
          )}
        </div>
      </div>
      
      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(234, 179, 8, 0);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 1.5s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Compact version for headers
export function AchievementShowcaseCompact({ jugadorId }) {
  return (
    <AchievementShowcase 
      jugadorId={jugadorId} 
      maxDisplay={4} 
      showTitle={false}
    />
  );
}
