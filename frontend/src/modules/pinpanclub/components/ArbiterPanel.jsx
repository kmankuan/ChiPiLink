/**
 * ArbiterPanel Component - Panel de control para árbitros
 * Permite agregar/quitar puntos y controlar el partido
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Plus,
  Minus,
  RotateCcw,
  Play,
  Pause,
  Flag,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PINPANCLUB_API } from '../config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Point types for technical recording
const POINT_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'ace', label: 'Ace (Direct serve)' },
  { value: 'winner', label: 'Winner' },
  { value: 'error_opponent', label: 'Opponent error' },
  { value: 'error_self', label: 'Self error' },
  { value: 'smash', label: 'Smash' },
  { value: 'block', label: 'Block' },
  { value: 'top_spin', label: 'Top Spin' },
  { value: 'back_spin', label: 'Back Spin' }
];

export default function ArbiterPanel({ 
  match, 
  onMatchUpdate,
  className = '' 
}) {
  const [loading, setLoading] = useState(false);
  const [pointType, setPointType] = useState('normal');

  if (!match) return null;

  const {
    match_id,
    player_a_info,
    player_b_info,
    points_player_a,
    points_player_b,
    sets_player_a,
    sets_player_b,
    current_set,
    serve,
    status
  } = match;

  const playerAName = player_a_info?.nickname || player_a_info?.name || 'Player A';
  const playerBName = player_b_info?.nickname || player_b_info?.name || 'Player B';

  const handleAddPoint = async (player) => {
    if (status !== 'in_progress') {
      toast.error('Match is not in progress');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        PINPANCLUB_API.matchPoint(match_id || match.partido_id),
        { player, type: pointType }
      );
      
      if (response.data.success) {
        if (response.data.set_won) {
          toast.success(`Set won by ${response.data.set_winner === 'a' ? playerAName : playerBName}!`);
        }
        if (response.data.match_finished) {
          toast.success(`🏆 Match won by ${response.data.match_winner === 'a' ? playerAName : playerBName}!`);
        }
        onMatchUpdate(response.data.match);
      }
    } catch (error) {
      toast.error('Error recording point');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchUndo(match_id || match.partido_id));
      
      if (response.data.success) {
        toast.info('Point undone');
        onMatchUpdate(response.data.match);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error undoing');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchStart(match_id || match.partido_id));
      
      if (response.data.success) {
        toast.success('Match started!');
        // Refresh match data
        const matchResponse = await axios.get(PINPANCLUB_API.matchById(match_id || match.partido_id));
        onMatchUpdate(matchResponse.data);
      }
    } catch (error) {
      toast.error('Error starting match');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseMatch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchPause(match_id || match.partido_id));
      
      if (response.data.success) {
        toast.info('Match paused');
        // Refresh match data
        const matchResponse = await axios.get(PINPANCLUB_API.matchById(match_id || match.partido_id));
        onMatchUpdate(matchResponse.data);
      }
    } catch (error) {
      toast.error('Error pausing match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            🏓 Arbiter Panel
          </CardTitle>
          <Badge 
            variant={status === 'in_progress' ? 'default' : 'secondary'}
            className={status === 'in_progress' ? 'animate-pulse' : ''}
          >
            {status === 'in_progress' ? '🔴 LIVE' : 
             status === 'finished' ? 'Finished' : 
             status === 'paused' ? 'Paused' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Match Status */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">
            Set {current_set} | Sets: {sets_player_a} - {sets_player_b}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Serve: {serve === 'a' ? playerAName : playerBName}
          </div>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Player A */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${serve === 'a' ? 'text-primary' : ''}`}>
              {playerAName}
              {serve === 'a' && <span className="ml-1">●</span>}
            </div>
            <div className="text-5xl font-bold text-red-600 my-2">
              {points_player_a}
            </div>
          </div>

          <div className="text-center text-3xl text-muted-foreground">
            VS
          </div>

          {/* Player B */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${serve === 'b' ? 'text-primary' : ''}`}>
              {playerBName}
              {serve === 'b' && <span className="ml-1">●</span>}
            </div>
            <div className="text-5xl font-bold text-blue-600 my-2">
              {points_player_b}
            </div>
          </div>
        </div>

        {/* Point Type Selector */}
        {status === 'in_progress' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Point type:</span>
            <Select value={pointType} onValueChange={setPointType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POINT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Point Buttons */}
        {estado === 'en_curso' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Player A Buttons */}
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full h-20 text-xl bg-red-600 hover:bg-red-700"
                onClick={() => handleAddPoint('a')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 mr-2" />
                    +1 {playerAName}
                  </>
                )}
              </Button>
            </div>

            {/* Player B Buttons */}
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full h-20 text-xl bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAddPoint('b')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-6 w-6 mr-2" />
                    +1 {playerBName}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          {estado === 'pendiente' && (
            <Button onClick={handleStartMatch} disabled={loading} className="gap-2">
              <Play className="h-4 w-4" />
              Iniciar Partido
            </Button>
          )}
          
          {estado === 'pausado' && (
            <Button onClick={handleStartMatch} disabled={loading} className="gap-2">
              <Play className="h-4 w-4" />
              Reanudar
            </Button>
          )}
          
          {estado === 'en_curso' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleUndo} 
                disabled={loading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Deshacer
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={handlePauseMatch} 
                disabled={loading}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
            </>
          )}
        </div>

        {/* Match Result */}
        {estado === 'finalizado' && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-700">
              🏆 Partido Finalizado
            </div>
            <div className="text-2xl font-bold mt-2">
              Ganador: {match.winner_id === match.player_a_id ? playerAName : playerBName}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
