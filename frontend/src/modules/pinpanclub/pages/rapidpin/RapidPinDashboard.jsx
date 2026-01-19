/**
 * Rapid Pin - Dashboard Principal
 * Panel de administración para temporadas Rapid Pin
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Zap, Plus, Calendar, Users, Award, Clock, 
  ChevronRight, Trophy, Settings, ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { API_BASE } from '../../config/api';

export default function RapidPinDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [newSeason, setNewSeason] = useState({
    nombre: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: ''
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch(`${API_BASE}/rapidpin/seasons`);
      if (response.ok) {
        const data = await response.json();
        setSeasons(data);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const createSeason = async () => {
    if (!newSeason.nombre || !newSeason.fecha_fin) {
      toast.error(t('rapidpin.seasons.fieldsRequired'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/rapidpin/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeason)
      });

      if (response.ok) {
        const created = await response.json();
        setSeasons([created, ...seasons]);
        setShowNewSeason(false);
        setNewSeason({
          nombre: '',
          descripcion: '',
          fecha_inicio: new Date().toISOString().split('T')[0],
          fecha_fin: ''
        });
        toast.success(t('rapidpin.seasons.created'));
      } else {
        const error = await response.json();
        toast.error(error.detail || t('common.error'));
      }
    } catch (error) {
      console.error('Error creating season:', error);
      toast.error(t('common.error'));
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Rapid Pin</h1>
                <p className="text-white/80">{t('rapidpin.subtitle')}</p>
              </div>
            </div>
            
            <Dialog open={showNewSeason} onOpenChange={setShowNewSeason}>
              <DialogTrigger asChild>
                <Button className="bg-white text-orange-600 hover:bg-white/90">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('rapidpin.seasons.create')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('rapidpin.seasons.create')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>{t('rapidpin.seasons.name')}</Label>
                    <Input
                      value={newSeason.nombre}
                      onChange={(e) => setNewSeason({ ...newSeason, nombre: e.target.value })}
                      placeholder={t('rapidpin.seasons.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('rapidpin.seasons.description')}</Label>
                    <Textarea
                      value={newSeason.descripcion}
                      onChange={(e) => setNewSeason({ ...newSeason, descripcion: e.target.value })}
                      placeholder={t('rapidpin.seasons.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('rapidpin.seasons.startDate')}</Label>
                      <Input
                        type="date"
                        value={newSeason.fecha_inicio}
                        onChange={(e) => setNewSeason({ ...newSeason, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('rapidpin.seasons.endDate')}</Label>
                      <Input
                        type="date"
                        value={newSeason.fecha_fin}
                        onChange={(e) => setNewSeason({ ...newSeason, fecha_fin: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={createSeason} className="w-full">
                    {t('rapidpin.seasons.create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rapidpin.info.participants')}</p>
                  <p className="text-2xl font-bold">2 + 1</p>
                  <p className="text-xs text-muted-foreground">{t('rapidpin.info.playersAndReferee')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rapidpin.info.scoring')}</p>
                  <p className="text-lg font-bold">+3 / +1 / +2</p>
                  <p className="text-xs text-muted-foreground">{t('rapidpin.info.scoringDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('rapidpin.info.validation')}</p>
                  <p className="text-lg font-bold">{t('rapidpin.info.oneConfirmation')}</p>
                  <p className="text-xs text-muted-foreground">{t('rapidpin.info.validationDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seasons List */}
        <h2 className="text-xl font-semibold mb-4">{t('rapidpin.seasons.title')}</h2>
        
        {seasons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('rapidpin.seasons.noSeasons')}</h3>
              <p className="text-muted-foreground mb-4">{t('rapidpin.seasons.noSeasonsDesc')}</p>
              <Button onClick={() => setShowNewSeason(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('rapidpin.seasons.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <Card 
                key={season.season_id} 
                className="cursor-pointer hover:border-yellow-500/50 transition-colors"
                onClick={() => navigate(`/pinpanclub/rapidpin/season/${season.season_id}`)}
                data-testid={`season-card-${season.season_id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.nombre}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(season.estado)}`}>
                      {t(`rapidpin.seasons.status.${season.estado}`)}
                    </span>
                  </div>
                  {season.descripcion && (
                    <CardDescription className="line-clamp-2">{season.descripcion}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(season.fecha_inicio)} - {formatDate(season.fecha_fin)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        {season.total_matches || 0} {t('rapidpin.matches.title').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        {season.total_players || 0}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end text-yellow-500">
                    <span className="text-sm">{t('rapidpin.viewSeason')}</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
