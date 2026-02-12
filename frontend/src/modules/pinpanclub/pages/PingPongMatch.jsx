/**
 * Ping Pong Match Creation Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Loader2, Play, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PingPongMatch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [formData, setFormData] = useState({
    player_a_id: '',
    player_b_id: '',
    tipo_partido: 'mejor_de_3',
    puntos_por_set: 11,
    diferencia_minima: 2,
    mesa: '',
    ronda: '',
    primer_saque: 'a'
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pinpanclub/players?activo=true`);
      setPlayers(response.data);
    } catch (error) {
      toast.error('Error al cargar jugadores');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.player_a_id || !formData.player_b_id) {
      toast.error('Debes seleccionar ambos jugadores');
      return;
    }
    
    if (formData.player_a_id === formData.player_b_id) {
      toast.error('Los jugadores deben ser diferentes');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/pinpanclub/matches`, formData);
      toast.success('Partido creado');
      navigate(`/pingpong/arbiter/${response.data.partido_id}`);
    } catch (error) {
      toast.error('Error al crear partido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/pinpanclub')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-2xl">🏓</span>
            <h1 className="font-bold text-xl">Nuevo Partido</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Configurar Partido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Players Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jugador A (Rojo)</Label>
                  <Select
                    value={formData.player_a_id}
                    onValueChange={(value) => setFormData({ ...formData, player_a_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem 
                          key={player.jugador_id} 
                          value={player.jugador_id}
                          disabled={player.jugador_id === formData.player_b_id}
                        >
                          {player.apodo || player.name} {player.apellido} (ELO: {player.elo_rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jugador B (Azul)</Label>
                  <Select
                    value={formData.player_b_id}
                    onValueChange={(value) => setFormData({ ...formData, player_b_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jugador" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem 
                          key={player.jugador_id} 
                          value={player.jugador_id}
                          disabled={player.jugador_id === formData.player_a_id}
                        >
                          {player.apodo || player.name} {player.apellido} (ELO: {player.elo_rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Match Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Partido</Label>
                  <Select
                    value={formData.tipo_partido}
                    onValueChange={(value) => setFormData({ ...formData, tipo_partido: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mejor_de_1">Mejor de 1 set</SelectItem>
                      <SelectItem value="mejor_de_3">Mejor de 3 sets</SelectItem>
                      <SelectItem value="mejor_de_5">Mejor de 5 sets</SelectItem>
                      <SelectItem value="mejor_de_7">Mejor de 7 sets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puntos por Set</Label>
                  <Select
                    value={formData.puntos_por_set.toString()}
                    onValueChange={(value) => setFormData({ ...formData, puntos_por_set: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 puntos</SelectItem>
                      <SelectItem value="21">21 puntos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primer Saque</Label>
                  <Select
                    value={formData.primer_saque}
                    onValueChange={(value) => setFormData({ ...formData, primer_saque: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Jugador A (Rojo)</SelectItem>
                      <SelectItem value="b">Jugador B (Azul)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mesa (opcional)</Label>
                  <Input
                    placeholder="Ej: Mesa 1"
                    value={formData.mesa}
                    onChange={(e) => setFormData({ ...formData, mesa: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ronda (opcional)</Label>
                <Input
                  placeholder="Ej: Semifinal, Final, Cuartos de Final"
                  value={formData.ronda}
                  onChange={(e) => setFormData({ ...formData, ronda: e.target.value })}
                />
              </div>

              {/* No Players Warning */}
              {players.length < 2 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800 mb-2">
                    Necesitas al menos 2 jugadores registrados
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/pinpanclub/players/new')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Agregar Jugador
                  </Button>
                </div>
              )}

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || players.length < 2}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                Crear Partido
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
