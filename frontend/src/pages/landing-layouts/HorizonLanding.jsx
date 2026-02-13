/**
 * HorizonLanding — "The Horizon"
 * Warm editorial layout with split-screen hero, horizontal pill navigation,
 * overlapping depth cards, and a newspaper-meets-app-store feel.
 * Cream background, bold red accents, serif headlines, layered depth.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ArrowRight, LogIn, ChevronRight, Clock, MapPin, Rss
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1656259541897-a13b22104214?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80';
const LANTERNS_IMG = 'https://images.unsplash.com/photo-1762889583592-2dda392f5431?crop=entropy&cs=srgb&fm=jpg&w=800&q=80';
const SPORTS_IMG = 'https://images.unsplash.com/photo-1573988127517-7a9794fac0a6?crop=entropy&cs=srgb&fm=jpg&w=800&q=80';

const MODULES = [
  { key: 'unatienda', icon: Store, label: 'Unatienda', to: '/unatienda', color: '#059669' },
  { key: 'super_pin', icon: Trophy, label: 'Super Pin', to: '/pinpanclub/superpin/ranking', color: '#d97706' },
  { key: 'rapid_pin', icon: Zap, label: 'Rapid Pin', to: '/rapidpin', color: '#dc2626' },
  { key: 'events', icon: Calendar, label: 'Eventos', to: '/eventos', color: '#0284c7' },
  { key: 'gallery', icon: Image, label: 'Galeria', to: '/galeria', color: '#7c3aed' },
  { key: 'players', icon: Users, label: 'Jugadores', to: '/pinpanclub/players', color: '#0d9488' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
}

export default function HorizonLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pillRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [modulesVisible, setModulesVisible] = useState(false);

  useEffect(() => {
    // Staggered entrance
    const t1 = setTimeout(() => setHeroVisible(true), 100);
    const t2 = setTimeout(() => setModulesVisible(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const destacados = communityData?.destacados || [];
  const noticias = communityData?.noticias || [];
  const eventos = communityData?.eventos || [];

  return (
    <div className="min-h-screen" style={{ background: '#FAF7F2' }} data-testid="horizon-landing">
      {/* ═══ HERO: Split screen ═══ */}
      <section className="relative overflow-hidden" data-testid="horizon-hero">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 min-h-[85vh] md:min-h-[90vh]">
          {/* Left: Text */}
          <div
            className={`flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16 md:py-0 transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C8102E]/20 bg-[#C8102E]/5 w-fit mb-6" data-testid="hero-badge">
              <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" />
              <span className="text-xs font-semibold text-[#C8102E] tracking-wide uppercase">
                {t('landing.hero.label', 'Panama Community')}
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5"
              style={{ color: '#1A1A1A', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {t('landing.hero.title', 'Welcome to')}{' '}
              <span className="relative inline-block">
                ChiPi Link
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-[#C8102E]/15 -skew-x-3 rounded-sm" />
              </span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed max-w-md mb-8" style={{ color: '#666' }}>
              {t('landing.hero.desc', 'Where Chinese heritage meets Panamanian soul. Shop, play, connect — all in one place.')}
            </p>

            <div className="flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <>
                  <Button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 h-auto rounded-full font-bold gap-2 shadow-lg shadow-[#C8102E]/20 hover:shadow-xl hover:shadow-[#C8102E]/30 transition-shadow"
                    style={{ background: '#C8102E' }}
                    data-testid="hero-login-btn"
                  >
                    <LogIn className="h-4 w-4" />
                    {t('common.login', 'Sign In')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/unatienda')}
                    className="px-6 py-3 h-auto rounded-full font-bold gap-2 border-2 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-colors"
                    data-testid="hero-explore-btn"
                  >
                    {t('landing.hero.explore', 'Explore')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate('/unatienda')}
                  className="px-6 py-3 h-auto rounded-full font-bold gap-2 shadow-lg shadow-[#C8102E]/20"
                  style={{ background: '#C8102E' }}
                  data-testid="hero-explore-btn"
                >
                  {t('landing.hero.explore', 'Explore')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Right: Image collage */}
          <div
            className={`relative hidden md:flex items-center justify-center p-8 transition-all duration-1000 delay-200 ease-out ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
          >
            {/* Main image */}
            <div className="relative w-full max-w-lg">
              <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[3/4]">
                <img src={HERO_IMG} alt="Panama City" className="w-full h-full object-cover" />
              </div>
              {/* Floating accent card */}
              <div className="absolute -left-8 bottom-16 bg-white rounded-2xl shadow-xl p-4 w-48 border border-black/5 animate-float" data-testid="hero-float-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#C8102E' }}>
                    <Rss className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-[#1A1A1A]">{t('community.title', 'Community')}</span>
                </div>
                <p className="text-[10px] text-[#999] leading-relaxed">{t('landing.community.subtitle', 'News, updates & Telegram feed')}</p>
              </div>
              {/* Small floating lantern card */}
              <div className="absolute -right-4 top-12 rounded-2xl overflow-hidden shadow-xl w-28 h-36 border-2 border-white animate-float-delay">
                <img src={LANTERNS_IMG} alt="Lanterns" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero image */}
        <div className="md:hidden relative mx-4 -mt-4 rounded-2xl overflow-hidden shadow-xl aspect-[16/9] mb-8">
          <img src={HERO_IMG} alt="Panama City" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-transparent to-transparent" />
        </div>
      </section>

      {/* ═══ MODULE PILLS: Horizontal scrollable ═══ */}
      <section
        className={`py-6 transition-all duration-700 ease-out ${modulesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="modules-section"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p className="text-xs font-bold tracking-[0.15em] uppercase mb-4" style={{ color: '#999' }}>
            {t('landing.modules.label', 'What we do')}
          </p>
        </div>
        <div
          ref={pillRef}
          className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-8 scrollbar-hide snap-x snap-mandatory"
        >
          {MODULES.map(mod => {
            const Icon = mod.icon;
            const status = moduleStatuses?.[mod.key] || DEFAULT_MODULE_STATUS[mod.key];
            return (
              <button
                key={mod.key}
                onClick={() => navigate(mod.to)}
                className="group snap-start flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-black/5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 whitespace-nowrap flex-shrink-0"
                data-testid={`mod-${mod.key}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `${mod.color}12` }}
                >
                  <Icon className="h-5 w-5" style={{ color: mod.color }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#1A1A1A] tracking-tight">{mod.label}</p>
                  {status && (
                    <ModuleStatusBadge status={status.status} customLabel={status.customLabel} size="xs" />
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-[#ccc] group-hover:text-[#999] transition-colors ml-2" />
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ PINPANCLUB: Overlapping depth card ═══ */}
      <section className="py-10 sm:py-16" data-testid="pinpanclub-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: '#1A1A1A' }}>
            <div className="grid md:grid-cols-5 gap-0">
              {/* Image column */}
              <div className="md:col-span-2 relative min-h-[240px] md:min-h-0">
                <img src={SPORTS_IMG} alt="PinPanClub" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A1A1A] hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent md:hidden" />
              </div>
              {/* Text column */}
              <div className="md:col-span-3 flex flex-col justify-center px-6 sm:px-10 py-8 sm:py-12">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#d97706] mb-3">PinPanClub</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-3">
                  {t('landing.pinpan.heading', 'Table Tennis Community')}
                </h2>
                <p className="text-sm text-white/40 leading-relaxed max-w-md mb-6">
                  {t('landing.pinpan.desc', 'Compete, rank up, and connect with fellow players. From casual games to club championships.')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate('/pinpanclub')}
                    className="rounded-full px-5 font-bold gap-2"
                    style={{ background: '#d97706' }}
                    data-testid="pinpan-cta"
                  >
                    <Trophy className="h-4 w-4" />
                    {t('landing.pinpan.cta', 'View Rankings')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/pinpanclub/players')}
                    className="rounded-full px-5 font-bold gap-2 border-white/15 text-white/60 hover:bg-white/5 hover:text-white"
                    data-testid="pinpan-players-btn"
                  >
                    <Users className="h-4 w-4" />
                    {t('landing.pinpan.players', 'Players')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LATEST CONTENT: Horizontal scroll cards ═══ */}
      {destacados.length > 0 && (
        <section className="py-8 sm:py-12" data-testid="latest-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase mb-1" style={{ color: '#999' }}>
                  {t('landing.latest', 'Latest')}
                </p>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>
                  {t('landing.featured.title', 'Featured Stories')}
                </h2>
              </div>
              <button
                onClick={() => navigate('/comunidad')}
                className="text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
                style={{ color: '#C8102E' }}
                data-testid="see-all-stories"
              >
                {t('common.viewAll', 'View all')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-8 scrollbar-hide snap-x snap-mandatory">
            {destacados.slice(0, 6).map((post, idx) => (
              <button
                key={post.post_id}
                onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                className="snap-start flex-shrink-0 w-72 sm:w-80 group"
                data-testid={`latest-${post.post_id}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg border border-black/5 transition-shadow duration-300">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={post.imagen_portada || LANTERNS_IMG}
                      alt={post.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {post.categoria && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-[#1A1A1A]">
                        {post.categoria}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-[#1A1A1A] line-clamp-2 tracking-tight mb-2 group-hover:text-[#C8102E] transition-colors">
                      {post.titulo}
                    </h3>
                    {post.resumen && (
                      <p className="text-xs text-[#999] line-clamp-2 mb-2">{post.resumen}</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-[#bbb]">
                      <Clock className="h-3 w-3" />
                      {formatDate(post.fecha_publicacion)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ NEWS + EVENTS: Two-column editorial ═══ */}
      {(noticias.length > 0 || eventos.length > 0) && (
        <section className="py-8 sm:py-12" data-testid="editorial-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* News column */}
              {noticias.length > 0 && (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                    <h3 className="text-base font-black tracking-tight" style={{ color: '#1A1A1A' }}>
                      {t('landing.news.title', 'News')}
                    </h3>
                    <button
                      onClick={() => navigate('/comunidad/noticias')}
                      className="text-[10px] font-bold flex items-center gap-0.5 uppercase tracking-wider"
                      style={{ color: '#C8102E' }}
                      data-testid="news-view-all"
                    >
                      {t('common.viewAll', 'View all')} <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-black/5">
                    {noticias.slice(0, 4).map(post => (
                      <button
                        key={post.post_id}
                        onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                        className="flex items-start gap-3 px-5 py-3.5 w-full text-left hover:bg-black/[0.02] transition-colors"
                        data-testid={`news-${post.post_id}`}
                      >
                        <img
                          src={post.imagen_portada || LANTERNS_IMG}
                          alt={post.titulo}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-[#1A1A1A] line-clamp-2 tracking-tight mb-1">{post.titulo}</h4>
                          <span className="text-[10px] text-[#bbb] flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Events column */}
              {eventos.length > 0 && (
                <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                    <h3 className="text-base font-black tracking-tight" style={{ color: '#1A1A1A' }}>
                      {t('landing.events.title', 'Events')}
                    </h3>
                    <button
                      onClick={() => navigate('/eventos')}
                      className="text-[10px] font-bold flex items-center gap-0.5 uppercase tracking-wider"
                      style={{ color: '#C8102E' }}
                      data-testid="events-view-all"
                    >
                      {t('common.viewAll', 'View all')} <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-black/5">
                    {eventos.slice(0, 4).map(evento => {
                      const d = evento.fecha_inicio ? new Date(evento.fecha_inicio) : null;
                      return (
                        <button
                          key={evento.evento_id}
                          onClick={() => navigate(`/comunidad/evento/${evento.evento_id}`)}
                          className="flex items-center gap-3 px-5 py-3.5 w-full text-left hover:bg-black/[0.02] transition-colors"
                          data-testid={`event-${evento.evento_id}`}
                        >
                          <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: '#C8102E10' }}>
                            <span className="text-lg font-black leading-none" style={{ color: '#C8102E' }}>
                              {d ? d.getDate() : '--'}
                            </span>
                            <span className="text-[9px] font-bold uppercase" style={{ color: '#C8102E' }}>
                              {d ? d.toLocaleDateString('es-PA', { month: 'short' }).toUpperCase() : ''}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-[#1A1A1A] line-clamp-1 tracking-tight">{evento.titulo}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#999]">
                              {d && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {evento.ubicacion && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" />{evento.ubicacion}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-[#ddd] flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ COMMUNITY CTA BAND ═══ */}
      <section className="py-10 sm:py-16" data-testid="community-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: '#C8102E' }}>
            {/* Decorative circle */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-10" style={{ background: '#fff' }} />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full opacity-10" style={{ background: '#fff' }} />

            <div className="relative px-8 sm:px-12 py-10 sm:py-14 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Rss className="h-4 w-4 text-white/70" />
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70">
                    {t('community.title', 'Community')}
                  </p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                  {t('landing.community.heading', 'Stay in the loop')}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed max-w-lg">
                  {t('landing.community.desc', 'Get the latest updates from our Telegram channel, community news, and event announcements — all in one place.')}
                </p>
              </div>
              <Button
                onClick={() => navigate('/comunidad')}
                className="bg-white hover:bg-white/90 font-bold px-8 py-6 h-auto rounded-full gap-2 shadow-lg text-[#C8102E] shrink-0"
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
      <footer className="py-8 px-4 sm:px-8" data-testid="horizon-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs font-bold tracking-tight" style={{ color: '#ccc' }}>
            ChiPi Link
          </p>
          <p className="text-[10px] tracking-wider uppercase" style={{ color: '#ddd' }}>
            {t('landing.footer', 'Connecting communities since 2024')}
          </p>
        </div>
      </footer>

      {/* Inline animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 5s ease-in-out infinite;
          animation-delay: 1s;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
