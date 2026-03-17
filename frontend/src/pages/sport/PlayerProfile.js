import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sportApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Swords, Camera, Upload } from 'lucide-react';

export default function PlayerProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          sportApi.getPlayer(id),
          sportApi.getMatches({ player_id: id }).catch(() => ({ data: [] }))
        ]);
        setPlayer(pRes.data);
        setMatches(mRes.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          await sportApi.updatePlayer(id, {});  // ensure auth header
          // Use the base64 photo endpoint
          const token = localStorage.getItem('sport_token');
          const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
          await fetch(`${BACKEND_URL}/api/sport/players/${id}/photo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ photo_base64: base64 })
          });
          setPlayer(prev => ({ ...prev, photo_base64: base64 }));
          toast.success('Photo uploaded!');
        } catch (err) {
          toast.error('Failed to upload photo');
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to read file');
      setUploading(false);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!player) return <div className="text-center py-12 text-gray-400">Player not found</div>;

  const photoSrc = player.photo_base64 || player.avatar_url;

  return (
    <div className="space-y-6" data-testid="player-profile">
      <Link to="/sport/players" className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('back')}
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Photo / Avatar */}
            <div className="relative group shrink-0">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={player.nickname}
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {player.nickname?.charAt(0)?.toUpperCase()}
                </div>
              )}
              {isAdmin && (
                <button
                  data-testid="upload-photo-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploading ? (
                    <Upload size={24} className="text-white animate-pulse" />
                  ) : (
                    <Camera size={24} className="text-white" />
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{player.nickname}</h1>
              <p className="text-gray-500">{player.name}</p>
              <div className="flex gap-2 mt-2">
                {player.roles?.map(role => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold font-mono text-red-600">{player.elo}</p>
              <p className="text-sm text-gray-500">{t('elo')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('matches'), value: player.stats?.matches || 0, color: 'bg-blue-50 text-blue-700' },
          { label: t('wins'), value: player.stats?.wins || 0, color: 'bg-green-50 text-green-700' },
          { label: t('losses'), value: player.stats?.losses || 0, color: 'bg-red-50 text-red-700' },
          { label: t('winRate'), value: `${player.stats?.win_rate || 0}%`, color: 'bg-amber-50 text-amber-700' },
          { label: t('streak'), value: player.stats?.current_streak || 0, color: 'bg-purple-50 text-purple-700' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className={`p-3 text-center ${stat.color} rounded-lg`}>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Swords size={18} /> Match History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-center text-gray-400 py-4">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {matches.map(m => {
                const won = m.winner_id === player.player_id;
                const opponent = m.player_a?.player_id === player.player_id ? m.player_b : m.player_a;
                const eloChange = m.player_a?.player_id === player.player_id
                  ? m.player_a?.elo_change : m.player_b?.elo_change;
                return (
                  <div key={m.match_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant={won ? 'default' : 'destructive'} className="w-6 text-center">
                        {won ? 'W' : 'L'}
                      </Badge>
                      <span>vs {opponent?.nickname}</span>
                      {eloChange != null && (
                        <span className={`text-xs font-mono ${eloChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {eloChange > 0 ? '+' : ''}{eloChange}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm">{m.score_winner}-{m.score_loser}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
