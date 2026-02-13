/**
 * HorizonLanding — "The Horizon"
 * Native-app feel. Warm cream tones, no dark sections.
 * Unique content blocks — NOT the same 6 module links.
 * Activity-driven, playful, community-first.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, LogIn, Heart, MessageCircle, Star,
  TrendingUp, Sparkles, Search, Bell, ChevronRight,
  Clock, Play, ShoppingBag, Trophy
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1656259541897-a13b22104214?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80';
const LANTERNS_IMG = 'https://images.unsplash.com/photo-1762889583592-2dda392f5431?crop=entropy&cs=srgb&fm=jpg&w=800&q=80';
const PINGPONG_IMG = 'https://images.unsplash.com/photo-1767022894200-419082de2c3e?crop=entropy&cs=srgb&fm=jpg&w=800&q=80';
const COMMUNITY_IMG = 'https://images.unsplash.com/photo-1758275557161-f117d724d769?crop=entropy&cs=srgb&fm=jpg&w=800&q=80';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
}

export default function HorizonLanding({ communityData }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 80);
    const t2 = setTimeout(() => setCardsVisible(true), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const destacados = communityData?.destacados || [];
  const noticias = communityData?.noticias || [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('landing.greeting.morning', 'Good morning');
    if (h < 18) return t('landing.greeting.afternoon', 'Good afternoon');
    return t('landing.greeting.evening', 'Good evening');
  })();

  return (
    <div className="min-h-screen" style={{ background: '#FAF7F2' }} data-testid="horizon-landing">

      {/* ═══ HERO: Split screen ═══ */}
      <section className="relative overflow-hidden" data-testid="horizon-hero">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 min-h-[80vh] md:min-h-[85vh]">
          {/* Left */}
          <div className={`flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-14 md:py-0 transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C8102E]/20 bg-[#C8102E]/5 w-fit mb-5" data-testid="hero-badge">
              <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" />
              <span className="text-xs font-semibold text-[#C8102E] tracking-wide uppercase">
                {t('landing.hero.label', 'Panama Community')}
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5"
              style={{ color: '#1A1A1A', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {greeting},{' '}
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
          <div className={`relative hidden md:flex items-center justify-center p-8 transition-all duration-1000 delay-200 ease-out ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative w-full max-w-lg">
              <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[3/4]">
                <img src={HERO_IMG} alt="Panama City" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -left-8 bottom-16 bg-white rounded-2xl shadow-xl p-4 w-48 border border-black/5 animate-float" data-testid="hero-float-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#C8102E' }}>
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-[#1A1A1A]">{t('community.title', 'Community')}</span>
                </div>
                <p className="text-[10px] text-[#999] leading-relaxed">{t('landing.community.subtitle', 'News, updates & Telegram feed')}</p>
              </div>
              <div className="absolute -right-4 top-12 rounded-2xl overflow-hidden shadow-xl w-28 h-36 border-2 border-white animate-float-delay">
                <img src={LANTERNS_IMG} alt="Lanterns" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero */}
        <div className="md:hidden relative mx-4 -mt-4 rounded-2xl overflow-hidden shadow-xl aspect-[16/9] mb-6">
          <img src={HERO_IMG} alt="Panama City" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-transparent to-transparent" />
        </div>
      </section>

      {/* ═══ QUICK ACTIONS: Native app style cards ═══ */}
      <section
        className={`py-4 px-4 sm:px-8 max-w-7xl mx-auto transition-all duration-700 ease-out ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        data-testid="quick-actions"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Shop */}
          <button
            onClick={() => navigate('/unatienda')}
            className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            data-testid="action-shop"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#059669', opacity: 0.9 }}>
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[#1A1A1A] tracking-tight">{t('modules.unatienda', 'Unatienda')}</p>
            <p className="text-[10px] text-[#999] mt-0.5">{t('landing.shop.hint', 'Browse & order')}</p>
            <ChevronRight className="absolute top-5 right-4 h-4 w-4 text-[#ddd] group-hover:text-[#999] transition-colors" />
          </button>

          {/* Play */}
          <button
            onClick={() => navigate('/pinpanclub')}
            className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            data-testid="action-play"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#d97706', opacity: 0.9 }}>
              <Play className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[#1A1A1A] tracking-tight">PinPanClub</p>
            <p className="text-[10px] text-[#999] mt-0.5">{t('landing.play.hint', 'Matches & rankings')}</p>
            <ChevronRight className="absolute top-5 right-4 h-4 w-4 text-[#ddd] group-hover:text-[#999] transition-colors" />
          </button>

          {/* Discover */}
          <button
            onClick={() => navigate('/comunidad')}
            className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            data-testid="action-discover"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#C8102E', opacity: 0.9 }}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[#1A1A1A] tracking-tight">{t('landing.discover', 'Discover')}</p>
            <p className="text-[10px] text-[#999] mt-0.5">{t('landing.discover.hint', 'News & stories')}</p>
            <ChevronRight className="absolute top-5 right-4 h-4 w-4 text-[#ddd] group-hover:text-[#999] transition-colors" />
          </button>

          {/* Search */}
          <button
            onClick={() => navigate('/comunidad')}
            className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            data-testid="action-search"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#7c3aed', opacity: 0.9 }}>
              <Search className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[#1A1A1A] tracking-tight">{t('landing.search', 'Search')}</p>
            <p className="text-[10px] text-[#999] mt-0.5">{t('landing.search.hint', 'Find anything')}</p>
            <ChevronRight className="absolute top-5 right-4 h-4 w-4 text-[#ddd] group-hover:text-[#999] transition-colors" />
          </button>
        </div>
      </section>

      {/* ═══ PINPANCLUB: Warm, playful — NOT dark ═══ */}
      <section className="py-8 sm:py-12 px-4 sm:px-8" data-testid="pinpanclub-section">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)' }}>
            <div className="grid md:grid-cols-5 gap-0">
              {/* Image */}
              <div className="md:col-span-2 relative min-h-[240px] md:min-h-[320px]">
                <img src={PINGPONG_IMG} alt="Kids playing table tennis" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#FFF7ED] hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFF7ED] to-transparent md:hidden" />
              </div>
              {/* Text */}
              <div className="md:col-span-3 flex flex-col justify-center px-6 sm:px-10 py-8 sm:py-12">
                <div className="inline-flex items-center gap-1.5 mb-3">
                  <Trophy className="h-4 w-4 text-[#d97706]" />
                  <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#d97706]">PinPanClub</p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3" style={{ color: '#1A1A1A' }}>
                  {t('landing.pinpan.heading', 'Table Tennis Community')}
                </h2>
                <p className="text-sm leading-relaxed max-w-md mb-6" style={{ color: '#78716c' }}>
                  {t('landing.pinpan.desc', 'Compete, rank up, and connect with fellow players. From casual games to club championships.')}
                </p>

                {/* Stats row */}
                <div className="flex gap-4 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-[#d97706]/10">
                    <TrendingUp className="h-4 w-4 text-[#d97706]" />
                    <div>
                      <p className="text-sm font-black text-[#1A1A1A]">{communityData?.stats?.active_players || 50}+</p>
                      <p className="text-[9px] text-[#999] uppercase tracking-wider">{t('landing.stats.players', 'Players')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-[#d97706]/10">
                    <Star className="h-4 w-4 text-[#d97706]" />
                    <div>
                      <p className="text-sm font-black text-[#1A1A1A]">{communityData?.stats?.total_points || 100}</p>
                      <p className="text-[9px] text-[#999] uppercase tracking-wider">ChiPi Points</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate('/pinpanclub')}
                    className="rounded-full px-5 font-bold gap-2 shadow-md"
                    style={{ background: '#d97706' }}
                    data-testid="pinpan-cta"
                  >
                    <Trophy className="h-4 w-4" />
                    {t('landing.pinpan.cta', 'View Rankings')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/pinpanclub/players')}
                    className="rounded-full px-5 font-bold gap-2 border-[#d97706]/20 text-[#92400e] hover:bg-[#d97706]/5"
                    data-testid="pinpan-players-btn"
                  >
                    {t('landing.pinpan.players', 'Players')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HAPPENING NOW: Activity feed style ═══ */}
      {destacados.length > 0 && (
        <section className="py-6 sm:py-10 px-4 sm:px-8" data-testid="happening-section">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>
                  {t('landing.happening', 'Happening Now')}
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
          <div className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-8 scrollbar-hide snap-x snap-mandatory max-w-7xl mx-auto">
            {destacados.slice(0, 6).map((post, idx) => (
              <button
                key={post.post_id}
                onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
                className="snap-start flex-shrink-0 w-64 sm:w-72 group"
                data-testid={`story-${post.post_id}`}
              >
                <div className="rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md border border-black/5 transition-shadow duration-300">
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

      {/* ═══ COMMUNITY HIGHLIGHTS: Image + CTA ═══ */}
      <section className="py-8 sm:py-12 px-4 sm:px-8" data-testid="community-section">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: '#C8102E' }}>
            <div className="grid md:grid-cols-2 gap-0">
              {/* Text */}
              <div className="flex flex-col justify-center px-8 sm:px-12 py-10 sm:py-14">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-white/70" />
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70">
                    {t('community.title', 'Community')}
                  </p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                  {t('landing.community.heading', 'Stay in the loop')}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed max-w-md mb-6">
                  {t('landing.community.desc', 'Get the latest updates from our Telegram channel, community news, and event announcements — all in one place.')}
                </p>
                <Button
                  onClick={() => navigate('/comunidad')}
                  className="bg-white hover:bg-white/90 font-bold px-7 py-3 h-auto rounded-full gap-2 shadow-lg text-[#C8102E] w-fit"
                  data-testid="community-cta"
                >
                  {t('landing.community.cta', 'Open Feed')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {/* Image */}
              <div className="relative hidden md:block min-h-[300px]">
                <img src={COMMUNITY_IMG} alt="Community" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#C8102E]/80" />
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10 bg-white pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full opacity-10 bg-white pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ═══ LATEST NEWS: Compact list ═══ */}
      {noticias.length > 0 && (
        <section className="py-6 sm:py-10 px-4 sm:px-8" data-testid="news-section">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>
                {t('landing.news.title', 'News')}
              </h2>
              <button
                onClick={() => navigate('/comunidad/noticias')}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: '#C8102E' }}
                data-testid="news-view-all"
              >
                {t('common.viewAll', 'View all')} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden divide-y divide-black/5">
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
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#1A1A1A] line-clamp-2 tracking-tight mb-0.5">{post.titulo}</h4>
                    <span className="text-[10px] text-[#bbb] flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#ddd] flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4 sm:px-8" data-testid="horizon-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs font-bold tracking-tight" style={{ color: '#ccc' }}>ChiPi Link</p>
          <p className="text-[10px] tracking-wider uppercase" style={{ color: '#ddd' }}>
            {t('landing.footer', 'Connecting communities since 2024')}
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-delay { animation: float-delay 5s ease-in-out infinite; animation-delay: 1s; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
