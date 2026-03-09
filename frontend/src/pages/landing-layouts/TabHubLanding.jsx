/**
 * Tab Hub Layout — WeChat/Grab/Rappi inspired.
 * Greeting area + horizontal tabs that swap the entire content view.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ChevronRight, LayoutGrid, Newspaper, Heart, Sparkles,
} from 'lucide-react';
import PinPanClubFeedBlock from '@/components/blocks/PinPanClubFeedBlock';
import {
  QuickAccessButton, QUICK_ACCESS_ITEMS, SectionHeader,
  NewsCard, NewsCardCompact, EventCard, EventCardCompact,
  GalleryCard, formatDate,
} from './shared';

const TABS = [
  { id: 'services', label: 'Services', icon: LayoutGrid },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'gallery', label: 'Gallery', icon: Image },
];

function ServicesTab({ moduleStatuses, destacados }) {
  const navigate = useNavigate();
  const featured = destacados?.[0];

  return (
    <div className="space-y-6">
      {/* Quick Access grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 px-2">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <QuickAccessButton key={item.moduleKey} {...item} moduleStatuses={moduleStatuses} />
        ))}
      </div>

      {/* Featured highlight */}
      {featured && (
        <button
          onClick={() => navigate(`/comunidad/post/${featured.post_id}`)}
          className="w-full relative overflow-hidden rounded-2xl h-40 text-left group"
          data-testid="tab-featured"
        >
          <img
            src={featured.imagen_portada || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'}
            alt={featured.titulo}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
          <div className="absolute inset-y-0 left-0 p-5 flex flex-col justify-end max-w-[70%]">
            <h3 className="text-base font-bold text-white line-clamp-2">{featured.titulo}</h3>
            <p className="text-white/60 text-xs line-clamp-1 mt-1">{featured.resumen}</p>
          </div>
        </button>
      )}

      {/* PinPanClub */}
      <PinPanClubFeedBlock
        config={{
          titulo: { es: 'PinPanClub', en: 'PinPanClub' },
          subtitulo: { es: 'Actividad reciente', en: 'Recent Activity' },
          sections: {
            recent_matches: { enabled: true, limit: 3 },
            leaderboard: { enabled: true, limit: 5 },
            active_challenges: { enabled: true, limit: 3 },
            recent_achievements: { enabled: true, limit: 4 },
          },
          style: { show_cta: true, cta_text: { es: 'Ver PinPanClub', en: 'View PinPanClub' }, cta_url: '/pinpanclub' },
        }}
      />
    </div>
  );
}

function CommunityTab({ noticias }) {
  if (!noticias?.length) {
    return <p className="text-center text-muted-foreground py-12 text-sm">No news yet</p>;
  }
  return (
    <div className="space-y-0 bg-card rounded-xl overflow-hidden border border-border/30">
      {noticias.slice(0, 8).map((post) => (
        <NewsCard key={post.post_id} post={post} />
      ))}
    </div>
  );
}

function EventsTab({ eventos }) {
  if (!eventos?.length) {
    return <p className="text-center text-muted-foreground py-12 text-sm">No upcoming events</p>;
  }
  return (
    <div className="space-y-0 bg-card rounded-xl overflow-hidden border border-border/30">
      {eventos.slice(0, 8).map((e) => (
        <EventCard key={e.evento_id} evento={e} />
      ))}
    </div>
  );
}

function GalleryTab({ galerias }) {
  if (!galerias?.length) {
    return <p className="text-center text-muted-foreground py-12 text-sm">No gallery albums</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {galerias.slice(0, 12).map((album) => (
        <GalleryCard key={album.album_id} album={album} />
      ))}
    </div>
  );
}

export default function TabHubLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('services');
  const { destacados, noticias, eventos, galerias } = communityData || {};

  const greeting = user?.first_name
    ? `${t('common.hello', 'Hello')}, ${user.first_name}`
    : t('landing.hero.title', 'Welcome to ChiPi Link');

  return (
    <div className="max-w-3xl mx-auto" data-testid="layout-tabhub">
      {/* Greeting */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('landing.hero.subtitle', 'Your community super app')}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide" data-testid="tab-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-4 pb-6">
        {activeTab === 'services' && <ServicesTab moduleStatuses={moduleStatuses} destacados={destacados} />}
        {activeTab === 'community' && <CommunityTab noticias={noticias} />}
        {activeTab === 'events' && <EventsTab eventos={eventos} />}
        {activeTab === 'gallery' && <GalleryTab galerias={galerias} />}
      </div>
    </div>
  );
}
