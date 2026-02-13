/**
 * LivingGridLanding — "The Living Grid"
 * A bento-style dashboard landing that merges community vibes with functional utility.
 * Simplified, dense, interactive. Cultural Chinese-Panamanian identity.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ArrowRight, ChevronRight, Rss, LogIn
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1633060622821-a35c3f664426?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxwYW5hbWElMjBjaXR5JTIwc2t5bGluZSUyMG1vZGVybnxlbnwwfHx8fDE3NzA5NTE3NTJ8MA&ixlib=rb-4.1.0&q=85&w=1200';
const SPORTS_IMG = 'https://static.prod-images.emergentagent.com/jobs/0e997fa5-7870-4ad7-bfea-6491d7259a17/images/78c324677f3f701890649f9b0d24726815dbbe5114bad3d87b0f6adb5437aab7.png';
const COMMUNITY_IMG = 'https://images.unsplash.com/photo-1766470612292-929a0553da8b?crop=entropy&cs=srgb&fm=jpg&w=600&q=80';
const FESTIVAL_IMG = 'https://images.unsplash.com/photo-1766470611896-8f719ff4f89e?crop=entropy&cs=srgb&fm=jpg&w=600&q=80';

// Tile wrapper with hover effect
function Tile({ children, className = '', onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] text-left ${className}`}
    >
      {children}
    </button>
  );
}

// Module tile for quick access
function ModuleTile({ icon: Icon, label, to, bg, moduleKey, moduleStatuses }) {
  const navigate = useNavigate();
  const modStatus = moduleKey ? (moduleStatuses?.[moduleKey] || DEFAULT_MODULE_STATUS[moduleKey]) : null;

  return (
    <Tile onClick={() => navigate(to)} testId={`tile-${moduleKey || label}`} className={`${bg} p-4 flex flex-col justify-between min-h-[120px]`}>
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-white tracking-tight">{label}</p>
        {modStatus && (
          <ModuleStatusBadge status={modStatus.status} customLabel={modStatus.customLabel} size="xs" />
        )}
      </div>
    </Tile>
  );
}

export default function LivingGridLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = (() => {
    const h = time.getHours();
    if (h < 12) return t('landing.greeting.morning', 'Good morning');
    if (h < 18) return t('landing.greeting.afternoon', 'Good afternoon');
    return t('landing.greeting.evening', 'Good evening');
  })();

  const panamaTime = time.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="min-h-screen bg-background">
      {/* Top strip */}
      <div className="px-4 pt-6 pb-2 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
              {greeting}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              ChiPi Link
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('landing.tagline', 'Your Chinese community in Panama, connected')}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-3xl font-light text-foreground/30 tabular-nums tracking-tight">{panamaTime}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Panama City</p>
          </div>
        </div>

        {/* ═══ BENTO GRID ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[120px] md:auto-rows-[140px]">

          {/* Hero tile — spans 2 cols, 2 rows */}
          <Tile
            onClick={() => navigate(isAuthenticated ? '/comunidad' : '#')}
            testId="tile-hero"
            className="col-span-2 row-span-2"
          >
            <img src={HERO_IMG} alt="Panama" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-5">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">Community</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {t('landing.hero.title', 'Welcome to ChiPi Link')}
              </h2>
              <p className="text-xs text-white/60 mt-1.5 max-w-xs">
                {t('landing.hero.subtitle', 'Your Chinese community in Panama, connected')}
              </p>
              {!isAuthenticated && (
                <Button
                  onClick={(e) => { e.stopPropagation(); navigate('/login'); }}
                  size="sm"
                  className="mt-3 w-fit gap-1.5 bg-white/15 backdrop-blur-md hover:bg-white/25 text-white border-0 text-xs"
                  data-testid="hero-login-btn"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {t('common.login', 'Sign In')}
                </Button>
              )}
            </div>
          </Tile>

          {/* Store */}
          <ModuleTile icon={Store} label={t('modules.unatienda', 'Unatienda')} to="/unatienda" bg="bg-emerald-600" moduleKey="unatienda" moduleStatuses={moduleStatuses} />

          {/* Super Pin */}
          <ModuleTile icon={Trophy} label="Super Pin" to="/pinpanclub/superpin/ranking" bg="bg-amber-500" moduleKey="super_pin" moduleStatuses={moduleStatuses} />

          {/* Rapid Pin */}
          <ModuleTile icon={Zap} label="Rapid Pin" to="/rapidpin" bg="bg-red-600" moduleKey="rapid_pin" moduleStatuses={moduleStatuses} />

          {/* Events */}
          <ModuleTile icon={Calendar} label={t('modules.events', 'Eventos')} to="/eventos" bg="bg-sky-600" moduleKey="events" moduleStatuses={moduleStatuses} />

          {/* PinPanClub tile — spans 2 cols */}
          <Tile
            onClick={() => navigate('/pinpanclub')}
            testId="tile-pinpanclub"
            className="col-span-2 row-span-1"
          >
            <img src={SPORTS_IMG} alt="PinPanClub" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
            <div className="relative h-full flex items-center p-5 gap-4">
              <div className="flex-1">
                <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">PinPanClub</p>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                  {t('landing.pinpan.title', 'Table Tennis Community')}
                </h3>
                <p className="text-[11px] text-white/50 mt-1">
                  {t('landing.pinpan.subtitle', 'Rankings, matches & challenges')}
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </div>
          </Tile>

          {/* Gallery */}
          <ModuleTile icon={Image} label={t('modules.gallery', 'Galeria')} to="/galeria" bg="bg-violet-600" moduleKey="gallery" moduleStatuses={moduleStatuses} />

          {/* Players */}
          <ModuleTile icon={Users} label={t('modules.players', 'Jugadores')} to="/pinpanclub/players" bg="bg-teal-600" moduleKey="players" moduleStatuses={moduleStatuses} />

          {/* Community Feed tile — spans 2 cols */}
          <Tile
            onClick={() => navigate('/comunidad')}
            testId="tile-community-feed"
            className="col-span-2 row-span-1"
          >
            <img src={COMMUNITY_IMG} alt="Community" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
            <div className="relative h-full flex items-center p-5 gap-4">
              <div className="flex-1">
                <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">{t('community.title', 'Community')}</p>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                  {t('landing.community.title', 'Stay Connected')}
                </h3>
                <p className="text-[11px] text-white/50 mt-1">
                  {t('landing.community.subtitle', 'News, updates & Telegram feed')}
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Rss className="h-5 w-5 text-white" />
              </div>
            </div>
          </Tile>
        </div>

        {/* Activity strip */}
        {communityData?.destacados?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {t('landing.latest', 'Latest')}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {communityData.destacados.slice(0, 5).map((post) => (
                <button
                  key={post.post_id}
                  onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                  className="flex-shrink-0 w-64 rounded-xl overflow-hidden border border-border/40 hover:shadow-md transition-shadow bg-card"
                  data-testid={`latest-${post.post_id}`}
                >
                  <img
                    src={post.imagen_portada || FESTIVAL_IMG}
                    alt={post.titulo}
                    className="w-full h-28 object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-xs font-semibold line-clamp-2 tracking-tight">{post.titulo}</h4>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
