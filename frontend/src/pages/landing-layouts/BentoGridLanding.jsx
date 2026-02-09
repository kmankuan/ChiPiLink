/**
 * Bento Grid Layout — Asymmetric tile dashboard.
 * No traditional hero. Content organized in varied-size tiles.
 * Inspired by Apple/Notion bento grids.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ChevronRight, Clock, Newspaper, ArrowRight,
} from 'lucide-react';
import PinPanClubFeedBlock from '@/components/blocks/PinPanClubFeedBlock';
import {
  QuickAccessButton, QUICK_ACCESS_ITEMS,
  NewsCardCompact, EventCardCompact, GalleryCard,
  formatDate, formatEventDate,
} from './shared';

function FeaturedTile({ post }) {
  const navigate = useNavigate();
  if (!post) return null;
  return (
    <button
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      className="relative overflow-hidden rounded-2xl group text-left h-full min-h-[220px]"
      data-testid="bento-featured"
    >
      <img
        src={post.imagen_portada || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'}
        alt={post.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {post.categoria && (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/20 backdrop-blur-sm text-white mb-2">
            {post.categoria}
          </span>
        )}
        <h2 className="text-lg font-bold text-white line-clamp-2 mb-1">{post.titulo}</h2>
        <p className="text-white/70 text-xs line-clamp-2">{post.resumen}</p>
      </div>
    </button>
  );
}

function ServicesTile({ moduleStatuses }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 h-full" data-testid="bento-services">
      <h3 className="text-sm font-bold mb-3">Services</h3>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <QuickAccessButton key={item.moduleKey} {...item} moduleStatuses={moduleStatuses} />
        ))}
      </div>
    </div>
  );
}

function EventsTile({ eventos }) {
  const navigate = useNavigate();
  if (!eventos?.length) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 h-full" data-testid="bento-events">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" /> Upcoming
        </h3>
        <button onClick={() => navigate('/eventos')} className="text-[10px] text-primary font-medium flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {eventos.slice(0, 3).map((e) => (
          <EventCardCompact key={e.evento_id} evento={e} />
        ))}
      </div>
    </div>
  );
}

function NewsTile({ noticias }) {
  if (!noticias?.length) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 h-full" data-testid="bento-news">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
        <Newspaper className="h-4 w-4 text-primary" /> Latest News
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {noticias.slice(0, 4).map((post) => (
          <NewsCardCompact key={post.post_id} post={post} />
        ))}
      </div>
    </div>
  );
}

function GalleryTile({ galerias }) {
  const navigate = useNavigate();
  if (!galerias?.length) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 h-full" data-testid="bento-gallery">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Image className="h-4 w-4 text-primary" /> Gallery
        </h3>
        <button onClick={() => navigate('/galeria')} className="text-[10px] text-primary font-medium flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {galerias.slice(0, 6).map((album) => (
          <GalleryCard key={album.album_id} album={album} />
        ))}
      </div>
    </div>
  );
}

export default function BentoGridLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { destacados, noticias, eventos, galerias } = communityData || {};
  const featured = destacados?.[0] || noticias?.[0] || null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4" data-testid="layout-bento">
      {/* Row 1: Featured + Services */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <FeaturedTile post={featured} />
        </div>
        <div className="md:col-span-2">
          <ServicesTile moduleStatuses={moduleStatuses} />
        </div>
      </div>

      {/* Row 2: Events + Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EventsTile eventos={eventos} />
        <GalleryTile galerias={galerias} />
      </div>

      {/* Row 3: News grid */}
      <NewsTile noticias={noticias} />

      {/* Row 4: PinPanClub */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <PinPanClubFeedBlock
          config={{
            titulo: { es: 'Actividad del Club', en: 'Club Activity' },
            subtitulo: { es: 'Lo último en PinPanClub', en: 'Latest from PinPanClub' },
            sections: {
              recent_matches: { enabled: true, limit: 5 },
              leaderboard: { enabled: true, limit: 10 },
              active_challenges: { enabled: true, limit: 4 },
              recent_achievements: { enabled: true, limit: 6 },
            },
            style: { show_cta: true, cta_text: { es: 'Ver más en PinPanClub', en: 'See more in PinPanClub' }, cta_url: '/pinpanclub' },
          }}
        />
      </div>
    </div>
  );
}
