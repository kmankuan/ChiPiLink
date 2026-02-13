/**
 * CinematicLanding — "The Stage"
 * Full-screen immersive sections. Dark, dramatic, editorial.
 * Large typography, cinematic imagery, minimal UI.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';
import { useLandingImages } from '@/hooks/useLandingImages';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ArrowRight, ChevronDown, LogIn, Rss
} from 'lucide-react';

const LANTERNS = 'https://images.unsplash.com/photo-1683304290583-897712dc5446?crop=entropy&cs=srgb&fm=jpg&w=1400&q=80';
const SPORTS = 'https://static.prod-images.emergentagent.com/jobs/0e997fa5-7870-4ad7-bfea-6491d7259a17/images/78c324677f3f701890649f9b0d24726815dbbe5114bad3d87b0f6adb5437aab7.png';

const MODULES = [
  { key: 'unatienda', icon: Store, label: 'Unatienda', to: '/unatienda', accent: '#059669' },
  { key: 'super_pin', icon: Trophy, label: 'Super Pin', to: '/pinpanclub/superpin/ranking', accent: '#d97706' },
  { key: 'rapid_pin', icon: Zap, label: 'Rapid Pin', to: '/rapidpin', accent: '#dc2626' },
  { key: 'events', icon: Calendar, label: 'Eventos', to: '/eventos', accent: '#0284c7' },
  { key: 'gallery', icon: Image, label: 'Galeria', to: '/galeria', accent: '#7c3aed' },
  { key: 'players', icon: Users, label: 'Jugadores', to: '/pinpanclub/players', accent: '#0d9488' },
];

export default function CinematicLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const landingImages = useLandingImages();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallax = Math.min(scrollY * 0.3, 200);
  const heroOpacity = Math.max(1 - scrollY / 500, 0);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen">
      {/* ═══ HERO: Full-screen cinematic ═══ */}
      <section ref={heroRef} className="relative h-screen flex items-end overflow-hidden" data-testid="cinematic-hero">
        <img
          src={LANTERNS}
          alt="Chinese lanterns"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: `translateY(${parallax}px)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 to-transparent" />

        <div className="relative z-10 px-6 sm:px-12 pb-16 sm:pb-24 max-w-4xl" style={{ opacity: heroOpacity }}>
          <p className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-amber-400/80 mb-4">
            {t('landing.hero.label', 'Your community in Panama')}
          </p>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
            ChiPi<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">Link</span>
          </h1>
          <p className="text-base sm:text-lg text-white/50 max-w-md leading-relaxed mb-8">
            {t('landing.hero.desc', 'Where Chinese heritage meets Panamanian soul. Shop, play, connect.')}
          </p>
          <div className="flex gap-3">
            {!isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-white text-black hover:bg-white/90 font-bold px-6 gap-2"
                  data-testid="hero-login-btn"
                >
                  <LogIn className="h-4 w-4" />
                  {t('common.login', 'Sign In')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/unatienda')}
                  className="border-white/20 text-white hover:bg-white/10 font-bold px-6 gap-2"
                  data-testid="hero-explore-btn"
                >
                  {t('landing.hero.explore', 'Explore')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/unatienda')}
                className="bg-white text-black hover:bg-white/90 font-bold px-6 gap-2"
              >
                {t('landing.hero.explore', 'Explore')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce" style={{ opacity: heroOpacity }}>
          <ChevronDown className="h-5 w-5 text-white/30" />
        </div>
      </section>

      {/* ═══ MODULES: Horizontal scroll ═══ */}
      <section className="relative py-16 sm:py-24 px-6 sm:px-12" data-testid="modules-section">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/30 mb-2">
            {t('landing.modules.label', 'What we do')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-12">
            {t('landing.modules.title', 'Everything in one place')}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {MODULES.map(mod => {
              const Icon = mod.icon;
              const status = moduleStatuses?.[mod.key] || DEFAULT_MODULE_STATUS[mod.key];
              return (
                <button
                  key={mod.key}
                  onClick={() => navigate(mod.to)}
                  className="group relative flex flex-col items-start p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 hover:border-white/10"
                  data-testid={`mod-${mod.key}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${mod.accent}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: mod.accent }} />
                  </div>
                  <p className="text-sm font-bold text-white/90 tracking-tight">{mod.label}</p>
                  {status && (
                    <div className="mt-1.5">
                      <ModuleStatusBadge status={status.status} customLabel={status.customLabel} size="xs" />
                    </div>
                  )}
                  <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-white/10 group-hover:text-white/40 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PINPANCLUB: Side-by-side ═══ */}
      <section className="relative py-16 sm:py-24 px-6 sm:px-12" data-testid="pinpanclub-section">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-amber-400/60 mb-2">PinPanClub</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
              {t('landing.pinpan.heading', 'Table Tennis Community')}
            </h2>
            <p className="text-white/40 leading-relaxed mb-6 max-w-md">
              {t('landing.pinpan.desc', 'Compete, rank up, and connect with fellow players. From casual games to club championships.')}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/pinpanclub')}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 gap-2"
                data-testid="pinpan-cta"
              >
                <Trophy className="h-4 w-4" />
                {t('landing.pinpan.cta', 'View Rankings')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/pinpanclub/players')}
                className="border-white/10 text-white/60 hover:bg-white/5 font-bold px-5 gap-2"
              >
                <Users className="h-4 w-4" />
                {t('landing.pinpan.players', 'Players')}
              </Button>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img src={SPORTS} alt="Table tennis" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 to-transparent" />
            {communityData?.stats && (
              <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                {[
                  { label: t('landing.stats.players', 'Players'), value: communityData.stats.active_players || 0 },
                  { label: t('landing.stats.total', 'ChiPi Points'), value: communityData.stats.total_points || 100 },
                ].map(s => (
                  <div key={s.label} className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2.5 flex-1">
                    <p className="text-xl font-black text-white tabular-nums">{s.value}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY FEED CTA ═══ */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-12" data-testid="community-section">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-900/30 to-amber-900/20 border border-white/[0.06]">
            <div className="px-8 sm:px-12 py-12 sm:py-16 flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Rss className="h-4 w-4 text-amber-400" />
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/80">
                    {t('community.title', 'Community')}
                  </p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
                  {t('landing.community.heading', 'Stay in the loop')}
                </h2>
                <p className="text-white/40 leading-relaxed max-w-lg">
                  {t('landing.community.desc', 'Get the latest updates from our Telegram channel, community news, and event announcements — all in one place.')}
                </p>
              </div>
              <Button
                onClick={() => navigate('/comunidad')}
                className="bg-white text-black hover:bg-white/90 font-bold px-8 py-6 gap-2 shrink-0"
                data-testid="community-cta"
              >
                {t('landing.community.cta', 'Open Feed')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-8 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/20">ChiPi Link &mdash; Panama</p>
          <p className="text-[10px] text-white/10 tracking-wider uppercase">
            {t('landing.footer', 'Connecting communities since 2024')}
          </p>
        </div>
      </footer>
    </div>
  );
}
