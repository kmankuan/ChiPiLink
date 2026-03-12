/**
 * Rapid Pin - Main Dashboard
 * Admin panel for Rapid Pin seasons
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Zap, Plus, Calendar, Users, Award, Clock, 
  ChevronRight, Trophy, Settings, ArrowLeft, Trash2 
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
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
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
    if (!newSeason.name || !newSeason.end_date) {
      toast.error(t('rapidpin.seasons.fieldsRequired'));
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/rapidpin/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newSeason)
      });

      if (response.ok) {
        const created = await response.json();
        setSeasons([created, ...seasons]);
        setShowNewSeason(false);
        setNewSeason({
          name: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: ''
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

  const deleteSeason = async (seasonId, seasonName) => {
    if (!confirm(`Delete "${seasonName}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/rapidpin/seasons/${seasonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSeasons(prev => prev.filter(s => s.season_id !== seasonId));
        toast.success('Season deleted');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Cannot delete season');
      }
    } catch {
      toast.error('Error deleting season');
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
        <div className="animate-spin h-8 w-8 border-4 border-[#C8102E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #FBF7F0 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d2217 0%, #4a3728 100%)' }} className="text-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.2)' }}>
                <Zap className="w-7 h-7" style={{ color: '#C8102E' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Rapid Pin</h1>
                <p style={{ color: '#d4c5a9' }} className="text-sm">{t('rapidpin.subtitle')}</p>
              </div>
            </div>
            
            <Dialog open={showNewSeason} onOpenChange={setShowNewSeason}>
              <DialogTrigger asChild>
                <Button className="text-white rounded-full text-xs" style={{ background: '#C8102E' }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
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
                      value={newSeason.name}
                      onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                      placeholder={t('rapidpin.seasons.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('rapidpin.seasons.description')}</Label>
                    <Textarea
                      value={newSeason.description}
                      onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                      placeholder={t('rapidpin.seasons.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('rapidpin.seasons.startDate')}</Label>
                      <Input
                        type="date"
                        value={newSeason.start_date}
                        onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('rapidpin.seasons.endDate')}</Label>
                      <Input
                        type="date"
                        value={newSeason.end_date}
                        onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
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
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="rounded-xl p-3 text-center" style={{ background: 'linear-gradient(145deg, #FBF7F0, #F5EDE0)', border: '1px solid rgba(139,115,85,0.12)' }}>
            <Users className="h-5 w-5 mx-auto mb-1" style={{ color: '#8b7355' }} />
            <p className="text-lg font-bold" style={{ color: '#2d2217' }}>2+1</p>
            <p className="text-[9px]" style={{ color: '#8b7355' }}>Players + Ref</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'linear-gradient(145deg, #FBF7F0, #F5EDE0)', border: '1px solid rgba(139,115,85,0.12)' }}>
            <Award className="h-5 w-5 mx-auto mb-1" style={{ color: '#B8860B' }} />
            <p className="text-lg font-bold" style={{ color: '#2d2217' }}>+3/+1/+2</p>
            <p className="text-[9px]" style={{ color: '#8b7355' }}>Win/Loss/Ref</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'linear-gradient(145deg, #FBF7F0, #F5EDE0)', border: '1px solid rgba(139,115,85,0.12)' }}>
            <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: '#C8102E' }} />
            <p className="text-lg font-bold" style={{ color: '#2d2217' }}>Quick</p>
            <p className="text-[9px]" style={{ color: '#8b7355' }}>Fast Matches</p>
          </div>
        </div>

        {/* Seasons List */}
        <h3 className="text-sm font-bold mb-3" style={{ color: '#2d2217' }}>{t('rapidpin.seasons.title')}</h3>
        
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
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(season.status)}`}>
                      {t(`rapidpin.seasons.status.${season.status}`)}
                    </span>
                  </div>
                  {season.description && (
                    <CardDescription className="line-clamp-2">{season.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(season.start_date)} - {formatDate(season.end_date)}
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
                  <div className="mt-3 flex items-center justify-between">
                    {(season.total_matches || 0) === 0 && (
                      <button
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteSeason(season.season_id, season.name); }}
                        data-testid={`delete-season-${season.season_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex items-center text-yellow-500 ml-auto">
                      <span className="text-sm">{t('rapidpin.viewSeason')}</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
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
