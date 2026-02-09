/**
 * Social Feed Layout — Instagram/Twitter inspired.
 * Stories carousel at top + unified mixed-content timeline.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Clock, Calendar, Image, Newspaper, Trophy,
  MapPin, ChevronRight, Store, MessageCircle,
} from 'lucide-react';
import PinPanClubFeedBlock from '@/components/blocks/PinPanClubFeedBlock';
import {
  StoryPill, QuickAccessButton, QUICK_ACCESS_ITEMS,
  formatDate, formatEventDate,
} from './shared';

// Build a unified timeline from all content types
function buildTimeline(data) {
  const items = [];
  const { noticias, eventos, galerias, destacados } = data || {};

  (destacados || []).forEach((p) => items.push({ type: 'featured', data: p, date: p.fecha_publicacion }));
  (noticias || []).forEach((p) => items.push({ type: 'news', data: p, date: p.fecha_publicacion }));
  (eventos || []).forEach((e) => items.push({ type: 'event', data: e, date: e.fecha_inicio }));
  (galerias || []).forEach((g) => items.push({ type: 'gallery', data: g, date: g.created_at }));

  // Sort by date descending, then deduplicate featured vs news
  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const seen = new Set();
  return items.filter((item) => {
    const id = item.data.post_id || item.data.evento_id || item.data.album_id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function FeedNewsCard({ post, featured = false }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      className="w-full text-left bg-card rounded-2xl overflow-hidden border border-border/30 hover:shadow-md transition-shadow"
      data-testid={`feed-news-${post.post_id}`}
    >
      <img
        src={post.imagen_portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600'}
        alt={post.titulo}
        className={`w-full object-cover ${featured ? 'aspect-[2/1]' : 'aspect-[3/1]'}`}
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Newspaper className="h-2.5 w-2.5 mr-0.5" />
            {post.categoria || 'News'}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />{formatDate(post.fecha_publicacion)}
          </span>
        </div>
        <h3 className={`font-bold line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>{post.titulo}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.resumen}</p>
      </div>
    </button>
  );
}

function FeedEventCard({ evento }) {
  const navigate = useNavigate();
  const dateInfo = formatEventDate(evento.fecha_inicio);
  return (
    <button
      onClick={() => navigate(`/comunidad/evento/${evento.evento_id}`)}
      className="w-full text-left bg-card rounded-2xl border border-border/30 p-4 hover:shadow-md transition-shadow"
      data-testid={`feed-event-${evento.evento_id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
          <Calendar className="h-2.5 w-2.5 mr-0.5" /> Event
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-lg font-extrabold text-primary leading-none">{dateInfo.day}</span>
          <span className="text-[9px] font-bold text-primary uppercase">{dateInfo.month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold line-clamp-1">{evento.titulo}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{evento.description}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{dateInfo.time}</span>
            {evento.ubicacion && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{evento.ubicacion}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function FeedGalleryCard({ album }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/comunidad/galeria/${album.album_id}`)}
      className="w-full text-left bg-card rounded-2xl overflow-hidden border border-border/30 hover:shadow-md transition-shadow"
      data-testid={`feed-gallery-${album.album_id}`}
    >
      <div className="grid grid-cols-3 gap-0.5">
        {(album.imagenes || []).slice(0, 3).map((img, i) => (
          <img key={i} src={img.url || album.portada} alt="" className="aspect-square object-cover" />
        ))}
        {(!album.imagenes || album.imagenes.length === 0) && (
          <img src={album.portada || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} alt="" className="aspect-square object-cover col-span-3" />
        )}
      </div>
      <div className="p-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          <Image className="h-2.5 w-2.5 mr-0.5" /> Gallery
        </Badge>
        <span className="text-xs font-medium line-clamp-1">{album.titulo}</span>
      </div>
    </button>
  );
}

export default function SocialFeedLanding({ communityData, moduleStatuses }) {
  const { t } = useTranslation();
  const { destacados, noticias, eventos, galerias } = communityData || {};

  // Build stories from highlights
  const stories = [
    ...(destacados || []).map((p) => ({ ...p, _type: 'news' })),
    ...(eventos || []).slice(0, 3).map((e) => ({ ...e, _type: 'event' })),
    ...(galerias || []).slice(0, 3).map((g) => ({ ...g, _type: 'gallery' })),
  ];

  const timeline = buildTimeline(communityData);

  return (
    <div className="max-w-2xl mx-auto" data-testid="layout-social">
      {/* Stories carousel */}
      {stories.length > 0 && (
        <div className="px-4 pt-4 pb-2 overflow-x-auto">
          <div className="flex gap-3">
            {stories.map((item, i) => (
              <StoryPill key={i} item={item} type={item._type} />
            ))}
          </div>
        </div>
      )}

      {/* Quick access pills */}
      <div className="px-4 py-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {QUICK_ACCESS_ITEMS.map((item) => (
            <QuickAccessButton key={item.moduleKey} {...item} moduleStatuses={moduleStatuses} className="flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Unified feed */}
      <div className="px-4 pb-6 space-y-3">
        {timeline.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No content yet. Check back soon!</p>
          </div>
        )}
        {timeline.map((item, idx) => {
          switch (item.type) {
            case 'featured':
              return <FeedNewsCard key={`f-${idx}`} post={item.data} featured />;
            case 'news':
              return <FeedNewsCard key={`n-${idx}`} post={item.data} />;
            case 'event':
              return <FeedEventCard key={`e-${idx}`} evento={item.data} />;
            case 'gallery':
              return <FeedGalleryCard key={`g-${idx}`} album={item.data} />;
            default:
              return null;
          }
        })}

        {/* PinPanClub at the bottom */}
        <div className="rounded-2xl border border-border/30 overflow-hidden">
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
              style: { show_cta: true, cta_text: { es: 'Ver PinPanClub', en: 'See PinPanClub' }, cta_url: '/pinpanclub' },
            }}
          />
        </div>
      </div>
    </div>
  );
}
