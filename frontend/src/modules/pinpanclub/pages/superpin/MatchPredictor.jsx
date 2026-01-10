/**
 * Match Predictor Component
 * Predice el resultado entre dos jugadores basándose en ELO, H2H y racha
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, Zap, Target, Trophy, ChevronRight,
  Award, BarChart3, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Progress } from '../../../../components/ui/progress';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MatchPredictor({ playerA, playerB, onClose }) {
  const { t } = useTranslation();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (playerA && playerB) {
      fetchPrediction();
    }
  }, [playerA, playerB]);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/superpin/predict-match?jugador_a_id=${playerA.jugador_id}&jugador_b_id=${playerB.jugador_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPrediction(data);
      } else {
        setError('Error fetching prediction');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error fetching prediction');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getConfidenceLabel = (confidence) => {
    switch (confidence) {
      case 'high': return t('superpin.predictor.confidenceHigh');
      case 'medium': return t('superpin.predictor.confidenceMedium');
      case 'low': return t('superpin.predictor.confidenceLow');
      default: return confidence;
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (error || !prediction) {
    return (
      <Card className="border-2 border-red-500/30">
        <CardContent className="p-8 text-center text-red-500">
          {error || 'No se pudo obtener la predicción'}
        </CardContent>
      </Card>
    );
  }

  const { player_a, player_b, prediction: pred, factors, advantages, head_to_head } = prediction;
  const favoriteIsA = pred.favorite === 'player_a';
  const favoritePlayer = favoriteIsA ? player_a : player_b;
  const underdogPlayer = favoriteIsA ? player_b : player_a;

  return (
    <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('superpin.predictor.title')}
        </CardTitle>
        <p className="text-white/70 text-sm">{t('superpin.predictor.subtitle')}</p>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Main Prediction */}
        <div className="flex items-center justify-between gap-4">
          {/* Player A */}
          <div className={`flex-1 text-center p-4 rounded-xl ${favoriteIsA ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-gray-100'}`}>
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
              {player_a.nombre?.[0]}
            </div>
            <h3 className="font-bold text-lg">{player_a.apodo || player_a.nombre}</h3>
            <p className="text-sm text-gray-500">ELO: {player_a.elo}</p>
            <div className="mt-2">
              <span className={`text-3xl font-bold ${favoriteIsA ? 'text-green-600' : 'text-gray-600'}`}>
                {player_a.probability}%
              </span>
            </div>
            {favoriteIsA && (
              <Badge className="mt-2 bg-green-500">
                <Trophy className="w-3 h-3 mr-1" />
                {t('superpin.predictor.favorite')}
              </Badge>
            )}
          </div>

          {/* VS */}
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-gray-300">VS</div>
            <Badge className={`mt-2 ${getConfidenceColor(pred.confidence)}`}>
              {t('superpin.predictor.confidence')}: {getConfidenceLabel(pred.confidence)}
            </Badge>
          </div>

          {/* Player B */}
          <div className={`flex-1 text-center p-4 rounded-xl ${!favoriteIsA ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-gray-100'}`}>
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {player_b.nombre?.[0]}
            </div>
            <h3 className="font-bold text-lg">{player_b.apodo || player_b.nombre}</h3>
            <p className="text-sm text-gray-500">ELO: {player_b.elo}</p>
            <div className="mt-2">
              <span className={`text-3xl font-bold ${!favoriteIsA ? 'text-green-600' : 'text-gray-600'}`}>
                {player_b.probability}%
              </span>
            </div>
            {!favoriteIsA && pred.favorite !== 'draw' && (
              <Badge className="mt-2 bg-green-500">
                <Trophy className="w-3 h-3 mr-1" />
                {t('superpin.predictor.favorite')}
              </Badge>
            )}
          </div>
        </div>

        {/* Probability Bar */}
        <div className="relative">
          <div className="flex h-8 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-sm font-bold transition-all"
              style={{ width: `${player_a.probability}%` }}
            >
              {player_a.probability > 20 && `${player_a.probability}%`}
            </div>
            <div 
              className="bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold transition-all"
              style={{ width: `${player_b.probability}%` }}
            >
              {player_b.probability > 20 && `${player_b.probability}%`}
            </div>
          </div>
        </div>

        {/* Prediction Factors */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <BarChart3 className="w-5 h-5 mx-auto text-purple-500 mb-1" />
            <p className="text-xs text-gray-500">{t('superpin.predictor.eloBased')}</p>
            <p className="font-bold">{factors.elo_based}%</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Target className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-gray-500">{t('superpin.predictor.h2hAdjust')}</p>
            <p className={`font-bold ${factors.h2h_adjustment > 0 ? 'text-green-500' : factors.h2h_adjustment < 0 ? 'text-red-500' : ''}`}>
              {factors.h2h_adjustment > 0 ? '+' : ''}{factors.h2h_adjustment}%
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xs text-gray-500">{t('superpin.predictor.streakAdjust')}</p>
            <p className={`font-bold ${factors.streak_adjustment > 0 ? 'text-green-500' : factors.streak_adjustment < 0 ? 'text-red-500' : ''}`}>
              {factors.streak_adjustment > 0 ? '+' : ''}{factors.streak_adjustment}%
            </p>
          </div>
        </div>

        {/* Advantages */}
        {advantages && advantages.length > 0 ? (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              {t('superpin.predictor.advantages')}
            </h4>
            <div className="space-y-2">
              {advantages.map((adv, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    adv.player === 'a' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <span className="font-medium">
                    {adv.player === 'a' ? player_a.apodo || player_a.nombre : player_b.apodo || player_b.nombre}
                  </span>
                  <span className="text-sm">
                    {adv.category === 'elo' ? 'ELO' : adv.category === 'win_rate' ? 'Win Rate' : 'H2H'}: {adv.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 italic">{t('superpin.predictor.noAdvantages')}</p>
        )}

        {/* H2H History */}
        {head_to_head && head_to_head.total_matches > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              {t('superpin.predictor.vsHistory')}
            </h4>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <span className="text-2xl font-bold text-green-600">{head_to_head.player_a_wins}</span>
                <p className="text-sm text-gray-500">{player_a.apodo || player_a.nombre}</p>
              </div>
              <div className="text-gray-400">-</div>
              <div className="text-center">
                <span className="text-2xl font-bold text-blue-600">{head_to_head.player_b_wins}</span>
                <p className="text-sm text-gray-500">{player_b.apodo || player_b.nombre}</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {head_to_head.total_matches} {t('superpin.profile.matches').toLowerCase()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
