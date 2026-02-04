/**
 * ScoreBoard Component - Score board for spectators
 * Shows real-time score with statistics
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Flame,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Target,
  Zap
} from 'lucide-react';

export default function ScoreBoard({ 
  match, 
  size = 'large', // 'small', 'medium', 'large', 'tv'
  showStats = true,
  className = ''
}) {
  if (!match) return null;

  const {
    player_a_info,
    player_b_info,
    points_player_a,
    points_player_b,
    sets_player_a,
    sets_player_b,
    current_set,
    set_history,
    serve,
    status,
    match_type,
    table,
    round,
    statistics,
    situation = [],
    winner_id
  } = match;

  const playerAName = player_a_info?.nickname || player_a_info?.name || 'Player A';
  const playerBName = player_b_info?.nickname || player_b_info?.name || 'Player B';

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'p-3',
      score: 'text-3xl',
      sets: 'text-lg',
      name: 'text-sm',
      badge: 'text-xs'
    },
    medium: {
      container: 'p-4',
      score: 'text-5xl',
      sets: 'text-xl',
      name: 'text-base',
      badge: 'text-sm'
    },
    large: {
      container: 'p-6',
      score: 'text-7xl',
      sets: 'text-2xl',
      name: 'text-lg',
      badge: 'text-base'
    },
    tv: {
      container: 'p-8',
      score: 'text-9xl',
      sets: 'text-4xl',
      name: 'text-2xl',
      badge: 'text-lg'
    }
  };

  const config = sizeConfig[size] || sizeConfig.large;

  // Get situation badges
  const renderSituacion = () => {
    return situacion.map((sit, idx) => {
      switch (sit.tipo) {
        case 'match_point':
          return (
            <Badge key={idx} className="bg-red-500 text-white animate-pulse gap-1">
              <Trophy className="h-3 w-3" />
              MATCH POINT {sit.jugador === 'a' ? playerAName : playerBName}
            </Badge>
          );
        case 'set_point':
          return (
            <Badge key={idx} className="bg-orange-500 text-white gap-1">
              <Target className="h-3 w-3" />
              SET POINT {sit.jugador === 'a' ? playerAName : playerBName}
            </Badge>
          );
        case 'deuce':
          return (
            <Badge key={idx} variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              DEUCE
            </Badge>
          );
        case 'racha':
          return (
            <Badge key={idx} className="bg-amber-500 text-white gap-1">
              <Flame className="h-3 w-3" />
              {sit.jugador === 'a' ? playerAName : playerBName}: ¡{sit.puntos} puntos seguidos!
            </Badge>
          );
        default:
          return null;
      }
    });
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className={config.container}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {mesa && <Badge variant="outline">Mesa {mesa}</Badge>}
            {ronda && <Badge variant="secondary">{ronda}</Badge>}
          </div>
          <Badge 
            variant={estado === 'en_curso' ? 'default' : estado === 'finalizado' ? 'secondary' : 'outline'}
            className={estado === 'en_curso' ? 'animate-pulse' : ''}
          >
            {estado === 'en_curso' ? '🔴 EN VIVO' : 
             estado === 'finalizado' ? '✓ Finalizado' : 
             estado === 'pausado' ? '⏸ Pausado' : 'Pendiente'}
          </Badge>
        </div>

        {/* Main Score */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Player A */}
          <div className={`text-center ${ganador_id === match.player_a_id ? 'opacity-100' : ganador_id ? 'opacity-50' : ''}`}>
            {player_a_info?.foto_url ? (
              <img 
                src={player_a_info.foto_url} 
                alt={playerAName}
                className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-red-100 flex items-center justify-center">
                <span className="text-2xl">🔴</span>
              </div>
            )}
            <h3 className={`font-bold ${config.name} truncate`}>{playerAName}</h3>
            {player_a_info?.elo_rating && (
              <span className="text-xs text-muted-foreground">ELO: {player_a_info.elo_rating}</span>
            )}
            {saque === 'a' && estado === 'en_curso' && (
              <div className="mt-1">
                <Badge className="bg-yellow-400 text-yellow-900">● Saque</Badge>
              </div>
            )}
            {ganador_id === match.player_a_id && (
              <div className="mt-2">
                <Badge className="bg-green-500 text-white">🏆 Ganador</Badge>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="text-center">
            {/* Current Set Score */}
            <div className="flex justify-center items-center gap-4 mb-2">
              <span className={`${config.score} font-bold text-red-600`}>
                {puntos_player_a}
              </span>
              <span className={`${config.sets} text-muted-foreground`}>-</span>
              <span className={`${config.score} font-bold text-blue-600`}>
                {puntos_player_b}
              </span>
            </div>
            
            {/* Sets Score */}
            <div className="flex justify-center items-center gap-2">
              <span className="text-muted-foreground text-sm">Sets:</span>
              <span className={`${config.sets} font-bold text-red-600`}>{sets_player_a}</span>
              <span className="text-muted-foreground">-</span>
              <span className={`${config.sets} font-bold text-blue-600`}>{sets_player_b}</span>
            </div>

            {/* Set indicator */}
            {estado === 'en_curso' && (
              <div className="text-xs text-muted-foreground mt-1">
                Set {set_actual}
              </div>
            )}
          </div>

          {/* Player B */}
          <div className={`text-center ${ganador_id === match.player_b_id ? 'opacity-100' : ganador_id ? 'opacity-50' : ''}`}>
            {player_b_info?.foto_url ? (
              <img 
                src={player_b_info.foto_url} 
                alt={playerBName}
                className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">🔵</span>
              </div>
            )}
            <h3 className={`font-bold ${config.name} truncate`}>{playerBName}</h3>
            {player_b_info?.elo_rating && (
              <span className="text-xs text-muted-foreground">ELO: {player_b_info.elo_rating}</span>
            )}
            {saque === 'b' && estado === 'en_curso' && (
              <div className="mt-1">
                <Badge className="bg-yellow-400 text-yellow-900">● Saque</Badge>
              </div>
            )}
            {ganador_id === match.player_b_id && (
              <div className="mt-2">
                <Badge className="bg-green-500 text-white">🏆 Ganador</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Sets Detail */}
        {sets_detalle && sets_detalle.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            {sets_detalle.map((set, idx) => (
              <div 
                key={idx} 
                className={`px-3 py-1 rounded-lg text-sm ${
                  set.ganador === 'a' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {set.puntos_a}-{set.puntos_b}
              </div>
            ))}
          </div>
        )}

        {/* Situation Badges */}
        {situacion && situacion.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {renderSituacion()}
          </div>
        )}

        {/* Stats */}
        {showStats && estadisticas && estado === 'en_curso' && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-red-600 font-semibold">{playerAName}</div>
              <div className="text-muted-foreground">
                Mejor racha: {estadisticas.max_racha_a || 0}
              </div>
              {estadisticas.racha_actual_a > 0 && (
                <Badge variant="outline" className="mt-1">
                  <Flame className="h-3 w-3 mr-1 text-orange-500" />
                  Racha: {estadisticas.racha_actual_a}
                </Badge>
              )}
            </div>
            <div className="text-center">
              <div className="text-blue-600 font-semibold">{playerBName}</div>
              <div className="text-muted-foreground">
                Mejor racha: {estadisticas.max_racha_b || 0}
              </div>
              {estadisticas.racha_actual_b > 0 && (
                <Badge variant="outline" className="mt-1">
                  <Flame className="h-3 w-3 mr-1 text-orange-500" />
                  Racha: {estadisticas.racha_actual_b}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
