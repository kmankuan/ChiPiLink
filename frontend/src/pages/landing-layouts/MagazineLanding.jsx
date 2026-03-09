/**
 * Magazine Layout — Editorial, 2-column asymmetric.
 * Featured article dominates, sidebar with events + quick links.
 * Inspired by Medium/Bloomberg editorial layouts.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Store, Trophy, Zap, Calendar, Image, Users,
  ChevronRight, Clock, Newspaper, MapPin, ArrowRight,
} from 'lucide-react';
import PinPanClubFeedBlock from '@/components/blocks/PinPanClubFeedBlock';
import {
  QuickAccessButton, QUICK_ACCESS_ITEMS,
  NewsCard, EventCard, EventCardCompact, GalleryCard,
  formatDate, formatEventDate,
} from './shared';

function FeaturedArticle({ post }) {
  const navigate = useNavigate();
  if (!post) return null;
  return (
    <button
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      className="w-full text-left group"
      data-testid="magazine-featured"
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[2/1] mb-4">
        <img
          src={post.imagen_portada || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200'}
          alt={post.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {post.categoria && (
          <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary text-primary-foreground">
            {post.categoria}
          </span>
        )}
      </div>
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-2 group-hover:text-primary transition-colors">
        {post.titulo}
      </h1>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{post.resumen}</p>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />{formatDate(post.fecha_publicacion)}
      </span>
    </button>
  );
}

function Sidebar({ eventos, moduleStatuses, galerias }) {
  const navigate = useNavigate();
  return (
    <aside className="space-y-5">
      {/* Quick links */}
      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Quick Access</h3>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACCESS_ITEMS.map((item) => (
            <QuickAccessButton key={item.moduleKey} {...item} moduleStatuses={moduleStatuses} />
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      {eventos?.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Events</h3>
            <button onClick={() => navigate('/eventos')} className="text-[10px] text-primary font-medium">
              See all
            </button>
          </div>
          <div className="space-y-2">
            {eventos.slice(0, 4).map((e) => (
              <EventCardCompact key={e.evento_id} evento={e} />
            ))}
          </div>
        </div>
      )}

      {/* Gallery preview */}
      {galerias?.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gallery</h3>
            <button onClick={() => navigate('/galeria')} className="text-[10px] text-primary font-medium">
              See all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {galerias.slice(0, 6).map((album) => (
              <GalleryCard key={album.album_id} album={album} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function MoreArticles({ noticias }) {
  if (!noticias?.length) return null;
  return (
    <div>
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        More Stories
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {noticias.map((post) => (
          <ArticleTile key={post.post_id} post={post} />
        ))}
      </div>
    </div>
  );
}

function ArticleTile({ post }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      className="text-left group rounded-xl overflow-hidden border border-border/30 hover:shadow-md transition-shadow"
      data-testid={`magazine-article-${post.post_id}`}
    >
      <img
        src={post.imagen_portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400'}
        alt={post.titulo}
        className="w-full aspect-[16/9] object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="p-3">
        <h3 className="text-sm font-bold line-clamp-2 mb-1 group-hover:text-primary transition-colors">{post.titulo}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{post.resumen}</p>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
        </span>
      </div>
    </button>
  );
}

export default function MagazineLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { destacados, noticias, eventos, galerias } = communityData || {};
  const featured = destacados?.[0] || noticias?.[0] || null;
  const restNews = (noticias || []).filter((p) => p.post_id !== featured?.post_id).slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" data-testid="layout-magazine">
      {/* Main grid: content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">
          <FeaturedArticle post={featured} />
          <MoreArticles noticias={restNews} />
        </div>

        {/* Sidebar — hidden on mobile, shown on lg+ */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar eventos={eventos} moduleStatuses={moduleStatuses} galerias={galerias} />
          </div>
        </div>
      </div>

      {/* Mobile-only: services + events below main content */}
      <div className="lg:hidden mt-8 space-y-6">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_ACCESS_ITEMS.map((item) => (
            <QuickAccessButton key={item.moduleKey} {...item} moduleStatuses={moduleStatuses} />
          ))}
        </div>
        {eventos?.length > 0 && (
          <div className="bg-card rounded-xl border border-border/30 overflow-hidden">
            {eventos.slice(0, 4).map((e) => (
              <EventCard key={e.evento_id} evento={e} />
            ))}
          </div>
        )}
        {galerias?.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {galerias.slice(0, 6).map((album) => (
              <GalleryCard key={album.album_id} album={album} />
            ))}
          </div>
        )}
      </div>

      {/* PinPanClub full width */}
      <div className="mt-8 rounded-2xl border border-border/30 overflow-hidden">
        <PinPanClubFeedBlock
          config={{
            titulo: { es: 'PinPanClub', en: 'PinPanClub' },
            subtitulo: { es: 'Actividad reciente', en: 'Recent Activity' },
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
