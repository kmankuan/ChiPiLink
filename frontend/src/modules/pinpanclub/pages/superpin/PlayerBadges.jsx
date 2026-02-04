/**
 * Player Badges Component
 * Shows badges/achievements for a player
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Trophy, Flame, Star, Gamepad2, Crown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Rarity colors
const RARITY_STYLES = {
  common: 'bg-gray-100 border-gray-300 text-gray-700',
  rare: 'bg-blue-100 border-blue-300 text-blue-700',
  epic: 'bg-purple-100 border-purple-300 text-purple-700',
  legendary: 'bg-yellow-100 border-yellow-400 text-yellow-700 ring-2 ring-yellow-300'
};

const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

export default function PlayerBadges({ playerId, jugadorId, compact = false }) {
  const { t } = useTranslation();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Support both new and legacy prop names
  const playerIdToUse = playerId || jugadorId;

  useEffect(() => {
    if (playerIdToUse) {
      fetchBadges();
    }
  }, [playerIdToUse]);

  const fetchBadges = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/players/${playerIdToUse}/badges`);
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  // Compact mode - just show icons
  if (compact) {
    return (
      <div className="flex gap-1 flex-wrap">
        {badges.slice(0, 5).map((badge) => (
          <span
            key={badge.badge_id}
            className={`text-lg cursor-help ${badge.rarity === 'legendary' ? 'animate-pulse' : ''}`}
            title={`${badge.name} - ${badge.description}`}
          >
            {badge.icon}
          </span>
        ))}
        {badges.length > 5 && (
          <span className="text-xs text-gray-500">+{badges.length - 5}</span>
        )}
      </div>
    );
  }

  // Full mode - card with details
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          {t('superpin.badges.title')} ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.badge_id}
              className={`p-3 rounded-lg border-2 ${RARITY_STYLES[badge.rarity] || RARITY_STYLES.common}`}
            >
              <div className="text-center">
                <span className={`text-3xl ${badge.rarity === 'legendary' ? 'animate-bounce' : ''}`}>
                  {badge.icon}
                </span>
                <p className="font-medium text-sm mt-1">{badge.name}</p>
                <Badge className="mt-1 text-xs" variant="outline">
                  {RARITY_LABELS[badge.rarity] || 'Común'}
                </Badge>
                {badge.temporada && (
                  <p className="text-xs text-gray-500 mt-1">{badge.temporada}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Badge Feed Component - for showing recent badges
export function BadgeFeed({ limit = 10 }) {
  const { t } = useTranslation();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentBadges();
  }, [limit]);

  const fetchRecentBadges = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/badges/recent?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setBadges(data || []);
      }
    } catch (error) {
      console.error('Error fetching recent badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        {t('superpin.badges.noBadges')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {badges.map((badge) => (
        <div
          key={badge.badge_id}
          className={`flex items-center gap-3 p-3 rounded-lg border ${RARITY_STYLES[badge.rarity] || RARITY_STYLES.common}`}
        >
          <span className="text-2xl">{badge.icon}</span>
          <div className="flex-1">
            <p className="font-medium">
              {badge.jugador_info?.nombre || t('superpin.ranking.player')}
              <span className="text-gray-500 font-normal"> {t('superpin.badges.earned')} </span>
              {badge.name}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(badge.earned_at).toLocaleDateString()}
              {badge.metadata?.tournament_name && ` • ${badge.metadata.tournament_name}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Badge Leaderboard Component
export function BadgeLeaderboard({ ligaId = null, limit = 10 }) {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [ligaId, limit]);

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (ligaId) params.append('liga_id', ligaId);
      
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/badges/leaderboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => (
        <div
          key={entry._id}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <span className="w-8 h-8 flex items-center justify-center font-bold text-lg">
            {index === 0 && '🥇'}
            {index === 1 && '🥈'}
            {index === 2 && '🥉'}
            {index > 2 && `${index + 1}`}
          </span>
          <div className="flex-1">
            <p className="font-medium">
              {entry.jugador_info?.nombre || t('superpin.ranking.player')}
            </p>
            <div className="flex gap-2 text-xs text-gray-500">
              <span>🏆 {entry.legendary || 0}</span>
              <span>💎 {entry.epic || 0}</span>
              <span>📦 {entry.total_badges}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
