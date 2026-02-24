/**
 * Referee Settings - Admin page for managing referee configuration
 * Toggle referee requirements per game type, view referee leaderboard
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
import RESOLVED_API_URL from '@/config/apiUrl';
  Shield, ArrowLeft, Save, Star, Award, Trophy, Users, Swords, Zap, Crown
} from 'lucide-react';
import axios from 'axios';

const API_URL = RESOLVED_API_URL;

const GAME_TYPE_META = {
  league: { label: 'PinPan League', icon: Crown, color: 'text-yellow-500', desc: 'Round-robin league matches' },
  rapidpin: { label: 'RapidPin', icon: Zap, color: 'text-orange-500', desc: 'Quick spontaneous matches' },
  arena: { label: 'PinPan Arena', icon: Swords, color: 'text-indigo-500', desc: 'Tournament bracket matches' },
  casual: { label: 'Casual Play', icon: Users, color: 'text-green-500', desc: 'Informal matches' },
};

const BADGE_INFO = {
  first_whistle: { name: 'First Whistle', desc: 'Refereed your first match' },
  regular_ref: { name: 'Regular Ref', desc: 'Refereed 10 matches' },
  veteran_ref: { name: 'Veteran Ref', desc: 'Refereed 50 matches' },
  iron_whistle: { name: 'Iron Whistle', desc: 'Refereed 100 matches' },
  five_star: { name: 'Five Star', desc: 'Average rating of 4.5+' },
  streak_7: { name: 'Week Warrior', desc: '7-day referee streak' },
  all_rounder: { name: 'All-Rounder', desc: 'Refereed in all game types' },
};

function GameTypeRow({ gameType, config, onUpdate }) {
  const meta = GAME_TYPE_META[gameType] || { label: gameType, icon: Shield, color: 'text-gray-500' };
  const Icon = meta.icon;
  const [points, setPoints] = useState(config.points_awarded || 2);

  const handleToggle = (field, val) => {
    onUpdate(gameType, { ...config, [field]: val });
  };

  const handlePoints = () => {
    const p = Math.max(0, Math.min(10, parseInt(points) || 0));
    onUpdate(gameType, { ...config, points_awarded: p });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border" data-testid={`referee-setting-${gameType}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${meta.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">{meta.label}</div>
          <div className="text-xs text-muted-foreground">{meta.desc}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Required toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={config.required}
            onCheckedChange={(v) => handleToggle('required', v)}
            data-testid={`toggle-required-${gameType}`}
          />
          <Label className="text-sm">{config.required ? 'Required' : 'Optional'}</Label>
        </div>

        {/* Points */}
        <div className="flex items-center gap-1.5">
          <Label className="text-sm text-muted-foreground">Pts:</Label>
          <Input
            type="number"
            min={0}
            max={10}
            className="w-16 h-8 text-center"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onBlur={handlePoints}
            data-testid={`points-${gameType}`}
          />
        </div>

        {/* Self-referee toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={config.allow_self_referee}
            onCheckedChange={(v) => handleToggle('allow_self_referee', v)}
            data-testid={`toggle-self-${gameType}`}
          />
          <Label className="text-xs text-muted-foreground">Self-ref</Label>
        </div>
      </div>
    </div>
  );
}

function RefereeCard({ profile }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {profile.player_avatar ? (
          <img src={profile.player_avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Shield className="h-5 w-5 text-purple-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{profile.player_name || 'Unknown'}</div>
        <div className="flex gap-2 flex-wrap">
          {(profile.badges || []).map((b) => (
            <Badge key={b} variant="secondary" className="text-xs">
              {BADGE_INFO[b]?.name || b}
            </Badge>
          ))}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm">{profile.total_matches_refereed || 0} matches</div>
        <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
          <Star className="h-3 w-3 text-yellow-500" />
          {(profile.avg_rating || 0).toFixed(1)}
        </div>
      </div>
      <div className="text-right flex-shrink-0 pl-2">
        <div className="text-lg font-bold text-purple-600">{profile.total_points_earned || 0}</div>
        <div className="text-xs text-muted-foreground">pts</div>
      </div>
    </div>
  );
}

export default function RefereeSettings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [settingsRes, refereesRes] = await Promise.all([
        axios.get(`${API_URL}/api/pinpanclub/referee/settings`),
        axios.get(`${API_URL}/api/pinpanclub/referee/profiles?limit=20`)
      ]);
      setSettings(settingsRes.data);
      setReferees(refereesRes.data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load referee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (gameType, newConfig) => {
    setSettings((prev) => ({
      ...prev,
      referee_config: { ...prev.referee_config, [gameType]: newConfig }
    }));
    setPendingChanges((prev) => ({ ...prev, [gameType]: newConfig }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    setSaving(true);
    try {
      for (const [gameType, config] of Object.entries(pendingChanges)) {
        await axios.put(
          `${API_URL}/api/pinpanclub/referee/settings/${gameType}`,
          config,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setPendingChanges({});
      toast.success('Referee settings saved!');
    } catch (err) {
      toast.error('Failed to save: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const config = settings?.referee_config || {};
  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10 mb-4"
            onClick={() => navigate('/pinpanclub')}
            data-testid="ref-settings-back-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            PinPanClub
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Referee Settings</h1>
              <p className="text-white/80 text-sm">Manage referee requirements across all game modes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Settings Panel */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Game Mode Settings</CardTitle>
                {hasChanges && (
                  <Button size="sm" onClick={handleSave} disabled={saving} data-testid="save-referee-settings-btn">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(GAME_TYPE_META).map((gt) => (
                <GameTypeRow
                  key={gt}
                  gameType={gt}
                  config={config[gt] || { required: true, points_awarded: 2, allow_self_referee: false }}
                  onUpdate={handleUpdate}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top Referees */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Top Referees
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/pinpanclub/hall-of-fame')}
                data-testid="view-hall-of-fame-btn"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Hall of Fame
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {referees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No referee activity yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {referees.map((ref) => (
                  <RefereeCard key={ref.player_id} profile={ref} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
