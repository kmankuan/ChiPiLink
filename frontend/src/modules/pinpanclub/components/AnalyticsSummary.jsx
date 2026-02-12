/**
 * Analytics Summary Component (Compact)
 * Resumen de analytics para mostrar en el dashboard principal
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Trophy, Target, TrendingUp, 
  ChevronRight, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AnalyticsSummary() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/analytics/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-xl font-bold text-white">{stats.active_players}</p>
          <p className="text-xs text-white/60">Jugadores</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-green-400" />
          <p className="text-xl font-bold text-white">{stats.matches_this_week}</p>
          <p className="text-xs text-white/60">Partidos</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-purple-400" />
          <p className="text-xl font-bold text-white">{stats.challenges_completed}</p>
          <p className="text-xs text-white/60">Retos</p>
        </div>
      </div>

      {/* Top Players */}
      {stats.top_players && stats.top_players.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/80 text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Más activos esta semana
          </p>
          <div className="flex gap-2">
            {stats.top_players.map((player, idx) => (
              <Badge 
                key={idx}
                variant="outline" 
                className="border-white/20 text-white/80"
              >
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {player.name} ({player.matches})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* View Full Dashboard Button */}
      <Button 
        variant="outline" 
        className="w-full border-white/20 text-white hover:bg-white/10"
        onClick={() => navigate('/pinpanclub/analytics')}
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Ver Dashboard Completo
        <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
    </div>
  );
}
