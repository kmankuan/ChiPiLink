/**
 * Shared components and utilities used across all landing layouts.
 * Keeps each layout file focused on structure only.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';
import {
  Newspaper, Calendar, Image, Users, ChevronRight,
  Clock, MapPin, Store, Trophy, Zap,
} from 'lucide-react';

// ---- Helpers ----
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatEventDate = (dateStr) => {
  if (!dateStr) return {};
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('es-PA', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }),
  };
};

// ---- Quick Access ----
const ICON_BG = {
  primary: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  yellow: 'bg-gradient-to-br from-amber-400 to-amber-500',
  orange: 'bg-gradient-to-br from-orange-500 to-red-500',
  green: 'bg-gradient-to-br from-teal-400 to-teal-500',
  blue: 'bg-gradient-to-br from-sky-500 to-blue-600',
  purple: 'bg-gradient-to-br from-violet-500 to-purple-600',
};

export function QuickAccessButton({ icon: Icon, label, to, color = 'primary', moduleKey, moduleStatuses, className = '' }) {
  const navigate = useNavigate();
  const modStatus = moduleKey ? (moduleStatuses?.[moduleKey] || DEFAULT_MODULE_STATUS[moduleKey]) : null;
  return (
    <button
      onClick={() => navigate(to)}
      data-testid={`quick-access-${moduleKey || label}`}
      className={`flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform ${className}`}
    >
      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shadow-sm ${ICON_BG[color] || ICON_BG.primary}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="text-[10px] font-medium text-foreground/80 text-center leading-tight line-clamp-1">{label}</span>
      {modStatus && <ModuleStatusBadge status={modStatus.status} customLabel={modStatus.customLabel} size="xs" />}
    </button>
  );
}

export const QUICK_ACCESS_ITEMS = [
  { icon: Store, label: 'Unatienda', to: '/unatienda', color: 'primary', moduleKey: 'unatienda' },
  { icon: Trophy, label: 'Super Pin', to: '/pinpanclub/superpin/ranking', color: 'yellow', moduleKey: 'super_pin' },
  { icon: Zap, label: 'Rapid Pin', to: '/rapidpin', color: 'orange', moduleKey: 'rapid_pin' },
  { icon: Calendar, label: 'Eventos', to: '/eventos', color: 'blue', moduleKey: 'events' },
  { icon: Image, label: 'Galeria', to: '/galeria', color: 'purple', moduleKey: 'gallery' },
  { icon: Users, label: 'Jugadores', to: '/pinpanclub/players', color: 'green', moduleKey: 'players' },
];

// ---- Section Header ----
export function SectionHeader({ title, action, actionLink, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${className}`}>
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {action && (
        <Link to={actionLink || '#'} className="text-xs font-medium text-primary flex items-center gap-0.5">
          {action}<ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ---- News Card (list style) ----
export function NewsCard({ post }) {
  const navigate = useNavigate();
  return (
    <button
      className="flex items-start gap-3 p-4 w-full text-left border-b border-border/30 last:border-0 active:bg-muted/30 transition-colors"
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      data-testid={`news-card-${post.post_id}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold line-clamp-2 mb-1 tracking-tight">{post.titulo}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{post.resumen}</p>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />{formatDate(post.fecha_publicacion)}
        </span>
      </div>
      <img
        src={post.imagen_portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400'}
        alt={post.titulo}
        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
      />
    </button>
  );
}

// ---- News Card (compact/tile) ----
export function NewsCardCompact({ post }) {
  const navigate = useNavigate();
  return (
    <button
      className="group text-left rounded-xl overflow-hidden border border-border/40 hover:shadow-md transition-shadow"
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
      data-testid={`news-tile-${post.post_id}`}
    >
      <img
        src={post.imagen_portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400'}
        alt={post.titulo}
        className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="p-3">
        <h3 className="text-sm font-semibold line-clamp-2 mb-1">{post.titulo}</h3>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />{formatDate(post.fecha_publicacion)}
        </span>
      </div>
    </button>
  );
}

// ---- Event Card (list style) ----
export function EventCard({ evento }) {
  const navigate = useNavigate();
  const dateInfo = formatEventDate(evento.fecha_inicio);
  return (
    <button
      className="flex items-center gap-3 p-3 w-full text-left border-b border-border/30 last:border-0 active:bg-muted/30 transition-colors"
      onClick={() => navigate(`/comunidad/evento/${evento.evento_id}`)}
      data-testid={`event-card-${evento.evento_id}`}
    >
      <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-lg font-extrabold text-red-600 dark:text-red-400 leading-none">{dateInfo.day}</span>
        <span className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase">{dateInfo.month}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold line-clamp-1 tracking-tight">{evento.titulo}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{evento.description}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{dateInfo.time}</span>
          {evento.ubicacion && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{evento.ubicacion}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

// ---- Event Card (compact tile) ----
export function EventCardCompact({ evento }) {
  const navigate = useNavigate();
  const dateInfo = formatEventDate(evento.fecha_inicio);
  return (
    <button
      className="p-3 rounded-xl border border-border/40 text-left hover:shadow-md transition-shadow w-full"
      onClick={() => navigate(`/comunidad/evento/${evento.evento_id}`)}
      data-testid={`event-tile-${evento.evento_id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-sm font-extrabold text-red-600 dark:text-red-400 leading-none">{dateInfo.day}</span>
          <span className="text-[8px] font-bold text-red-500 uppercase">{dateInfo.month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold line-clamp-1">{evento.titulo}</h3>
          <span className="text-[10px] text-muted-foreground">{dateInfo.time}</span>
        </div>
      </div>
      {evento.ubicacion && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <MapPin className="h-2.5 w-2.5" />{evento.ubicacion}
        </span>
      )}
    </button>
  );
}

// ---- Gallery Card ----
export function GalleryCard({ album }) {
  const navigate = useNavigate();
  return (
    <button
      className="aspect-square relative overflow-hidden rounded-lg group"
      onClick={() => navigate(`/comunidad/galeria/${album.album_id}`)}
      data-testid={`gallery-${album.album_id}`}
    >
      <img
        src={album.portada || album.imagenes?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
        alt={album.titulo}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-medium text-white line-clamp-1">{album.titulo}</p>
      </div>
    </button>
  );
}

// ---- Story Pill (for Social Feed layout) ----
export function StoryPill({ item, type = 'news' }) {
  const navigate = useNavigate();
  const img = item.imagen_portada || item.portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200';
  const label = item.titulo || '';
  const link = type === 'event'
    ? `/comunidad/evento/${item.evento_id}`
    : type === 'gallery'
    ? `/comunidad/galeria/${item.album_id}`
    : `/comunidad/post/${item.post_id}`;

  return (
    <button onClick={() => navigate(link)} className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
      <div className="w-14 h-14 rounded-full ring-2 ring-primary/50 ring-offset-2 ring-offset-background overflow-hidden">
        <img src={img} alt={label} className="w-full h-full object-cover" />
      </div>
      <span className="text-[9px] text-muted-foreground line-clamp-1 text-center w-full">{label}</span>
    </button>
  );
}
