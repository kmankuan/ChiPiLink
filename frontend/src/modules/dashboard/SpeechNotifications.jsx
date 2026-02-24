import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
import RESOLVED_API_URL from '@/config/apiUrl';
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Settings2, Loader2 } from 'lucide-react';

const API = RESOLVED_API_URL;

const OPENAI_VOICES = [
  { value: 'nova', label: 'Nova (Energetic)' },
  { value: 'coral', label: 'Coral (Warm)' },
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'shimmer', label: 'Shimmer (Bright)' },
  { value: 'echo', label: 'Echo (Calm)' },
  { value: 'onyx', label: 'Onyx (Deep)' },
  { value: 'fable', label: 'Fable (Expressive)' },
  { value: 'sage', label: 'Sage (Measured)' },
  { value: 'ash', label: 'Ash (Clear)' },
];

const LANGUAGES = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

const EVENT_LABELS = {
  order_submitted: 'Orders',
  access_request: 'Access Requests',
  access_request_approved: 'Approvals',
  access_request_rejected: 'Rejections',
  access_request_updated: 'Request Updates',
  user_registered: 'New Users',
  wallet_topup: 'Wallet Top-ups',
  crm_message: 'CRM Messages',
  order_status_changed: 'Order Updates',
};

export default function SpeechNotifications() {
  const { token, user } = useAuth();
  const [muted, setMuted] = useState(() => localStorage.getItem('tts_muted') === 'true');
  const [settings, setSettings] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [providers, setProviders] = useState({});
  const [elVoices, setElVoices] = useState([]);
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const audioRef = useRef(null);

  const isAdmin = user?.is_admin;

  // Load settings + providers
  useEffect(() => {
    if (!token || !isAdmin) return;
    Promise.all([
      fetch(`${API}/api/admin/tts/settings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/admin/tts/providers`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([s, p]) => {
      if (s) setSettings(s);
      if (p) setProviders(p);
    }).catch(() => {});
  }, [token, isAdmin]);

  // Load ElevenLabs voices when provider is elevenlabs
  useEffect(() => {
    if (!token || !isAdmin || settings?.provider !== 'elevenlabs') return;
    fetch(`${API}/api/admin/tts/elevenlabs/voices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.voices) setElVoices(data.voices); })
      .catch(() => {});
  }, [token, isAdmin, settings?.provider]);

  useEffect(() => { localStorage.setItem('tts_muted', String(muted)); }, [muted]);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0 || muted) return;
    processingRef.current = true;
    setSpeaking(true);

    while (queueRef.current.length > 0 && !muted) {
      const text = queueRef.current.shift();
      try {
        const body = { text };
        if (settings?.provider === 'elevenlabs') {
          body.provider = 'elevenlabs';
          body.voice_id = settings?.elevenlabs_voice_id;
          body.stability = settings?.elevenlabs_stability;
          body.similarity_boost = settings?.elevenlabs_similarity;
        } else {
          body.provider = 'openai';
          body.voice = settings?.voice || 'nova';
          body.speed = settings?.speed || 1.0;
        }

        const res = await fetch(`${API}/api/admin/tts/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audio) await playAudio(data.audio, settings?.volume ?? 0.8);
        }
      } catch {}
    }

    processingRef.current = false;
    setSpeaking(false);
  }, [token, muted, settings]);

  const playAudio = (base64Audio, volume) => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.volume = Math.min(1, Math.max(0, volume));
        audioRef.current = audio;
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      } catch { resolve(); }
    });
  };

  // Listen to all realtime events
  useRealtimeEvent('*', useCallback((data) => {
    if (muted || !settings?.enabled || !isAdmin) return;
    const enabledEvents = settings?.enabled_events || [];
    if (!enabledEvents.includes(data.type) && enabledEvents.length > 0) return;

    const lang = settings?.language || 'es';
    let text = '';
    if (data.message && typeof data.message === 'object') {
      text = data.message[lang] || data.message.es || data.message.en || '';
    } else if (typeof data.message === 'string') {
      text = data.message;
    }
    if (!text) return;

    queueRef.current.push(text);
    processQueue();
  }, [muted, settings, isAdmin, processQueue]));

  const saveSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    try {
      await fetch(`${API}/api/admin/tts/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSettings),
      });
    } catch {}
  }, [token]);

  const updateSetting = (key, value) => saveSettings({ ...settings, [key]: value });

  if (!isAdmin || !settings) return null;

  const activeProvider = settings.provider || 'openai';
  const elAvailable = providers?.elevenlabs?.available;

  return (
    <div className="flex items-center gap-1" data-testid="speech-notifications">
      {/* Mute/Unmute */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 relative ${!muted ? 'text-primary' : 'text-muted-foreground'}`}
        onClick={() => {
          setMuted(!muted);
          if (!muted && audioRef.current) {
            audioRef.current.pause();
            queueRef.current = [];
            processingRef.current = false;
            setSpeaking(false);
          }
        }}
        title={muted ? 'Enable speech notifications' : 'Mute speech notifications'}
        data-testid="tts-mute-btn"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className={`h-4 w-4 ${speaking ? 'animate-pulse' : ''}`} />}
        {speaking && !muted && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </Button>

      {/* Settings */}
      <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="tts-settings-btn">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-3 max-h-[80vh] overflow-y-auto" side="bottom">
          <DropdownMenuLabel className="text-xs font-semibold px-0">Speech Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Enabled */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium">Speech Enabled</span>
            <Button
              variant={settings.enabled ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => updateSetting('enabled', !settings.enabled)}
              data-testid="tts-toggle-enabled"
            >
              {settings.enabled ? 'ON' : 'OFF'}
            </Button>
          </div>

          {/* Provider */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium">Provider</span>
            <Select value={activeProvider} onValueChange={(v) => updateSetting('provider', v)}>
              <SelectTrigger className="h-7 w-36 text-xs" data-testid="tts-provider-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" className="text-xs">OpenAI TTS</SelectItem>
                <SelectItem value="elevenlabs" className="text-xs" disabled={!elAvailable}>
                  ElevenLabs {!elAvailable && '(no key)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!elAvailable && activeProvider === 'openai' && (
            <p className="text-[10px] text-muted-foreground pb-1">
              Add ELEVENLABS_API_KEY to enable ElevenLabs
            </p>
          )}

          {/* Language */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium">Language</span>
            <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
              <SelectTrigger className="h-7 w-28 text-xs" data-testid="tts-language-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* OpenAI Voice (when provider = openai) */}
          {activeProvider === 'openai' && (
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-medium">Voice</span>
              <Select value={settings.voice} onValueChange={(v) => updateSetting('voice', v)}>
                <SelectTrigger className="h-7 w-36 text-xs" data-testid="tts-voice-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_VOICES.map(v => (
                    <SelectItem key={v.value} value={v.value} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ElevenLabs Voice (when provider = elevenlabs) */}
          {activeProvider === 'elevenlabs' && (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-medium">Voice</span>
                <Select
                  value={settings.elevenlabs_voice_id}
                  onValueChange={(v) => updateSetting('elevenlabs_voice_id', v)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs" data-testid="tts-el-voice-select">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {elVoices.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">{v.label || v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stability */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Stability</span>
                  <span className="text-[10px] text-muted-foreground">{(settings.elevenlabs_stability * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.elevenlabs_stability]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => updateSetting('elevenlabs_stability', v)}
                  className="w-full"
                  data-testid="tts-el-stability-slider"
                />
              </div>

              {/* Similarity */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Similarity</span>
                  <span className="text-[10px] text-muted-foreground">{(settings.elevenlabs_similarity * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.elevenlabs_similarity]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => updateSetting('elevenlabs_similarity', v)}
                  className="w-full"
                  data-testid="tts-el-similarity-slider"
                />
              </div>
            </>
          )}

          {/* Speed (OpenAI only) */}
          {activeProvider === 'openai' && (
            <div className="py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Speed</span>
                <span className="text-[10px] text-muted-foreground">{settings.speed}x</span>
              </div>
              <Slider
                value={[settings.speed]}
                min={0.5}
                max={2.0}
                step={0.25}
                onValueChange={([v]) => updateSetting('speed', v)}
                className="w-full"
                data-testid="tts-speed-slider"
              />
            </div>
          )}

          {/* Volume */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Volume</span>
              <span className="text-[10px] text-muted-foreground">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume]}
              min={0.1}
              max={1.0}
              step={0.1}
              onValueChange={([v]) => updateSetting('volume', v)}
              className="w-full"
              data-testid="tts-volume-slider"
            />
          </div>

          <DropdownMenuSeparator />

          {/* Event toggles */}
          <DropdownMenuLabel className="text-[10px] font-semibold px-0 text-muted-foreground uppercase tracking-wide">
            Announce Events
          </DropdownMenuLabel>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={(settings.enabled_events || []).includes(key)}
              onCheckedChange={(checked) => {
                const current = settings.enabled_events || [];
                updateSetting('enabled_events', checked ? [...current, key] : current.filter(e => e !== key));
              }}
              className="text-xs"
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}

          {/* Test button */}
          <DropdownMenuSeparator />
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs mt-1"
            onClick={async () => {
              const testTexts = {
                es: 'Notificación de prueba. El sistema de voz está funcionando correctamente.',
                en: 'Test notification. The speech system is working correctly.',
                zh: '测试通知。语音系统运行正常。',
              };
              queueRef.current.push(testTexts[settings.language] || testTexts.es);
              processQueue();
            }}
            data-testid="tts-test-btn"
          >
            {speaking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
            Test Voice
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
