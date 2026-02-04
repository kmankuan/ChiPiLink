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

// Tipos de punto para registro técnico
const POINT_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'ace', label: 'Ace (Saque directo)' },
  { value: 'winner', label: 'Winner (Ganador)' },
  { value: 'error_rival', label: 'Error del rival' },
  { value: 'error_propio', label: 'Error propio' },
  { value: 'smash', label: 'Smash' },
  { value: 'bloqueo', label: 'Bloqueo' },
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
    partido_id,
    player_a_info,
    player_b_info,
    puntos_player_a,
    puntos_player_b,
    sets_player_a,
    sets_player_b,
    set_actual,
    saque,
    estado
  } = match;

  const playerAName = player_a_info?.apodo || player_a_info?.nombre || 'Jugador A';
  const playerBName = player_b_info?.apodo || player_b_info?.nombre || 'Jugador B';

  const handleAddPoint = async (jugador) => {
    if (estado !== 'en_curso') {
      toast.error('El partido no está en curso');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        PINPANCLUB_API.matchPoint(partido_id),
        { jugador, tipo: pointType }
      );
      
      if (response.data.success) {
        if (response.data.set_ganado) {
          toast.success(`¡Set ganado por ${response.data.ganador_set === 'a' ? playerAName : playerBName}!`);
        }
        if (response.data.partido_terminado) {
          toast.success(`🏆 ¡Partido ganado por ${response.data.ganador_partido === 'a' ? playerAName : playerBName}!`);
        }
        onMatchUpdate(response.data.match);
      }
    } catch (error) {
      toast.error('Error al registrar punto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchUndo(partido_id));
      
      if (response.data.success) {
        toast.info('Punto deshecho');
        onMatchUpdate(response.data.match);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al deshacer');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchStart(partido_id));
      
      if (response.data.success) {
        toast.success('¡Partido iniciado!');
        // Refresh match data
        const matchResponse = await axios.get(PINPANCLUB_API.matchById(partido_id));
        onMatchUpdate(matchResponse.data);
      }
    } catch (error) {
      toast.error('Error al iniciar partido');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseMatch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(PINPANCLUB_API.matchPause(partido_id));
      
      if (response.data.success) {
        toast.info('Partido pausado');
        // Refresh match data
        const matchResponse = await axios.get(PINPANCLUB_API.matchById(partido_id));
        onMatchUpdate(matchResponse.data);
      }
    } catch (error) {
      toast.error('Error al pausar partido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            🏓 Panel de Arbitraje
          </CardTitle>
          <Badge 
            variant={estado === 'en_curso' ? 'default' : 'secondary'}
            className={estado === 'en_curso' ? 'animate-pulse' : ''}
          >
            {estado === 'en_curso' ? '🔴 EN VIVO' : 
             estado === 'finalizado' ? 'Finalizado' : 
             estado === 'pausado' ? 'Pausado' : 'Pendiente'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Match Status */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">
            Set {set_actual} | Sets: {sets_player_a} - {sets_player_b}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Saque: {saque === 'a' ? playerAName : playerBName}
          </div>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Player A */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${saque === 'a' ? 'text-primary' : ''}`}>
              {playerAName}
              {saque === 'a' && <span className="ml-1">●</span>}
            </div>
            <div className="text-5xl font-bold text-red-600 my-2">
              {puntos_player_a}
            </div>
          </div>

          <div className="text-center text-3xl text-muted-foreground">
            VS
          </div>

          {/* Player B */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${saque === 'b' ? 'text-primary' : ''}`}>
              {playerBName}
              {saque === 'b' && <span className="ml-1">●</span>}
            </div>
            <div className="text-5xl font-bold text-blue-600 my-2">
              {puntos_player_b}
            </div>
          </div>
        </div>

        {/* Point Type Selector */}
        {estado === 'en_curso' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tipo de punto:</span>
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
