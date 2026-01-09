/**
 * Super Pin Admin Dashboard
 * Panel de administración para gestionar ligas, rankings y torneos
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trophy, Users, Calendar, Settings, Plus, Play, Pause,
  ChevronRight, Medal, Target, Award, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import PINPANCLUB_API from '../../config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinAdmin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeague, setNewLeague] = useState({
    nombre: '',
    temporada: new Date().getFullYear().toString(),
    descripcion: '',
    scoring_config: { system: 'simple', points_win: 3, points_loss: 1 },
    checkin_config: { method: 'manual' }
  });

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/leagues`);
      const data = await response.json();
      setLeagues(data);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLeague = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pinpanclub/superpin/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeague)
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        setNewLeague({
          nombre: '',
          temporada: new Date().getFullYear().toString(),
          descripcion: '',
          scoring_config: { system: 'simple', points_win: 3, points_loss: 1 },
          checkin_config: { method: 'manual' }
        });
        fetchLeagues();
      }
    } catch (error) {
      console.error('Error creating league:', error);
    }
  };

  const activateLeague = async (ligaId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchLeagues();
    } catch (error) {
      console.error('Error activating league:', error);
    }
  };

  const getStatusBadge = (estado) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      finished: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={styles[estado]}>{t(`superpin.leagues.status.${estado}`)}</Badge>;
  };

  const getScoringLabel = (system) => {
    return system === 'elo' ? t('superpin.leagues.scoringElo') : t('superpin.leagues.scoringSimple');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              {t('superpin.admin')}
            </h1>
            <p className="text-gray-600 mt-1">{t('superpin.adminDesc')}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" /> {t('superpin.leagues.new')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.leagues.total')}</p>
              <p className="text-2xl font-bold">{leagues.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.leagues.active')}</p>
              <p className="text-2xl font-bold">{leagues.filter(l => l.estado === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.players.total')}</p>
              <p className="text-2xl font-bold">{leagues.reduce((acc, l) => acc + (l.total_jugadores || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('superpin.matches.total')}</p>
              <p className="text-2xl font-bold">{leagues.reduce((acc, l) => acc + (l.total_partidos || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leagues List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" /> {t('superpin.leagues.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leagues.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('superpin.leagues.noLeagues')}</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                {t('superpin.leagues.createFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {leagues.map((league) => (
                <div
                  key={league.liga_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{league.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{t('superpin.tournaments.season')} {league.temporada}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{getScoringLabel(league.scoring_config?.system)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <p className="text-sm text-gray-500">{league.total_jugadores || 0} {t('superpin.players.title').toLowerCase()}</p>
                      <p className="text-sm text-gray-500">{league.total_partidos || 0} {t('superpin.matches.title').toLowerCase()}</p>
                    </div>
                    {getStatusBadge(league.estado)}
                    {league.estado === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateLeague(league.liga_id)}
                      >
                        <Play className="h-4 w-4 mr-1" /> Activar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/pingpong/superpin/league/${league.liga_id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create League Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nueva Liga
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newLeague.nombre}
                  onChange={(e) => setNewLeague({ ...newLeague, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Liga Primavera 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporada</label>
                <input
                  type="text"
                  value={newLeague.temporada}
                  onChange={(e) => setNewLeague({ ...newLeague, temporada: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={newLeague.descripcion}
                  onChange={(e) => setNewLeague({ ...newLeague, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Descripción de la liga..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Puntuación</label>
                <select
                  value={newLeague.scoring_config.system}
                  onChange={(e) => setNewLeague({
                    ...newLeague,
                    scoring_config: { ...newLeague.scoring_config, system: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="simple">Puntos Simples (+3 victoria, +1 derrota)</option>
                  <option value="elo">Sistema ELO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Check-in</label>
                <select
                  value={newLeague.checkin_config.method}
                  onChange={(e) => setNewLeague({
                    ...newLeague,
                    checkin_config: { ...newLeague.checkin_config, method: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="manual">Manual</option>
                  <option value="qr_code">Código QR</option>
                  <option value="geolocation">Geolocalización</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createLeague} className="bg-green-600 hover:bg-green-700">
                Crear Liga
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
