/**
 * SuperAppLanding - Main unified landing page for the Super App
 * Combines:
 * - Editable block system (previously in Landing.jsx)
 * - Community content: news, events, gallery (previously in CommunityLanding.jsx)
 * - Hero section, Quick Access, PinPanClub feed
 */
import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { COMMUNITY_ENDPOINTS, buildUrl } from '@/config/api';
import {
  Newspaper,
  Calendar,
  Image,
  Users,
  ChevronRight,
  Clock,
  MapPin,
  Bell,
  Store,
  Trophy,
  Zap,
  Loader2,
  Edit,
  Save,
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  X
} from 'lucide-react';
import PinPanClubFeedBlock from '@/components/blocks/PinPanClubFeedBlock';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============== CONTEXT FOR EDIT MODE ==============
const EditModeContext = createContext({
  isEditMode: false,
  editingBlockId: null,
  setEditingBlockId: () => {},
  updateBlockConfig: () => {},
  saveBlock: () => {}
});

export const useEditMode = () => useContext(EditModeContext);

// ============== HELPER FUNCTIONS ==============
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('es-PA', { month: 'short' }).toUpperCase(),
    time: date.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
  };
};

// ============== REUSABLE COMPONENTS ==============

const SectionHeader = ({ icon: Icon, title, action, actionLink, className = '' }) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
    </div>
    {action && (
      <Link to={actionLink || '#'}>
        <Button variant="ghost" size="sm" className="text-primary gap-1">
          {action}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    )}
  </div>
);

import ModuleStatusBadge from '@/components/ui/ModuleStatusBadge';
import { DEFAULT_MODULE_STATUS } from '@/config/moduleStatus';

const QuickAccessButton = ({ icon: Icon, label, to, color = 'primary', moduleKey, moduleStatuses }) => {
  const navigate = useNavigate();
  const colorClasses = {
    primary: 'bg-primary/10 text-primary hover:bg-primary/20',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  };

  const modStatus = moduleKey ? (moduleStatuses?.[moduleKey] || DEFAULT_MODULE_STATUS[moduleKey]) : null;

  return (
    <button
      onClick={() => navigate(to)}
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${colorClasses[color]}`}
    >
      <Icon className="h-6 w-6 mb-2" />
      <span className="text-xs font-medium text-center">{label}</span>
      {modStatus && (
        <div className="mt-1">
          <ModuleStatusBadge status={modStatus.status} customLabel={modStatus.customLabel} size="xs" />
        </div>
      )}
    </button>
  );
};

const HeroCarousel = ({ posts }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!posts || posts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [posts]);

  if (!posts || posts.length === 0) {
    return (
      <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.hero.title')}</h1>
          <p className="text-muted-foreground">{t('landing.hero.subtitle')}</p>
        </div>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden group">
      <img
        src={currentPost.imagen_portada || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200'}
        alt={currentPost.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        {currentPost.categoria && (
          <Badge className="mb-3">{currentPost.categoria}</Badge>
        )}
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 line-clamp-2">
          {currentPost.titulo}
        </h1>
        <p className="text-white/80 text-sm md:text-base mb-4 line-clamp-2">
          {currentPost.resumen}
        </p>
        <Button 
          onClick={() => navigate(`/comunidad/post/${currentPost.post_id}`)}
          className="gap-2"
        >
          {t('common.readMore')} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {posts.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {posts.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NewsCard = ({ post }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
    >
      <div className="aspect-video relative overflow-hidden">
        <img
          src={post.imagen_portada || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400'}
          alt={post.titulo}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {post.categoria && (
          <Badge className="absolute top-3 left-3">{post.categoria}</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {post.titulo}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.resumen}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(post.fecha_publicacion)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const EventCard = ({ evento }) => {
  const navigate = useNavigate();
  const dateInfo = formatEventDate(evento.fecha_inicio);

  return (
    <Card 
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
      onClick={() => navigate(`/comunidad/evento/${evento.evento_id}`)}
    >
      <div className="flex">
        <div className="w-20 flex-shrink-0 bg-primary/10 flex flex-col items-center justify-center p-3">
          <span className="text-2xl font-bold text-primary">{dateInfo.day}</span>
          <span className="text-xs font-medium text-primary">{dateInfo.month}</span>
        </div>
        <CardContent className="p-4 flex-1">
          <h3 className="font-semibold line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {evento.titulo}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {evento.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dateInfo.time}
            </span>
            {evento.ubicacion && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {evento.ubicacion}
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

const GalleryCard = ({ album }) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/comunidad/galeria/${album.album_id}`)}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={album.portada || album.imagenes?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
          alt={album.titulo}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white line-clamp-1">{album.titulo}</h3>
          <p className="text-xs text-white/80">{album.imagenes?.length || 0} fotos</p>
        </div>
      </div>
    </Card>
  );
};

// ============== EDITABLE BLOCK WRAPPER ==============
const EditableBlockWrapper = ({ blockId, blockType, children, onDelete }) => {
  const { isEditMode, editingBlockId, setEditingBlockId, saveBlock } = useEditMode();
  
  if (!isEditMode) return children;
  
  const isEditing = editingBlockId === blockId;
  
  return (
    <div className={`relative group ${isEditing ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <div className="absolute -top-3 -left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background rounded-lg shadow-lg p-1">
        <Button size="icon" variant="ghost" className="h-7 w-7 cursor-grab">
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7"
          onClick={() => setEditingBlockId(isEditing ? null : blockId)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        {isEditing && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-green-600"
            onClick={() => saveBlock(blockId)}
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7 text-red-600"
          onClick={() => onDelete?.(blockId)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground absolute -top-6 left-8 opacity-0 group-hover:opacity-100 transition-opacity">
        {blockType}
      </div>
      {children}
    </div>
  );
};

// ============== MAIN COMPONENT ==============
export default function SuperAppLanding() {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Community data
  const [communityData, setCommunityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moduleStatuses, setModuleStatuses] = useState(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Block configuration with order
  const [blocks, setBlocks] = useState([
    { id: 'hero', label: 'Hero Carousel', icon: Image, visible: true, order: 0 },
    { id: 'quickAccess', label: 'Acceso Rápido', icon: Zap, visible: true, order: 1 },
    { id: 'announcements', label: 'Anuncios', icon: Bell, visible: true, order: 2 },
    { id: 'pinpanclub', label: 'PinPanClub', icon: Trophy, visible: true, order: 3 },
    { id: 'news', label: 'Noticias', icon: Newspaper, visible: true, order: 4 },
    { id: 'events', label: 'Eventos', icon: Calendar, visible: true, order: 5 },
    { id: 'gallery', label: 'Galería', icon: Image, visible: true, order: 6 },
  ]);

  useEffect(() => {
    fetchData();
    loadBlockConfig();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildUrl(COMMUNITY_ENDPOINTS.landing));
      setCommunityData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/admin/landing-page/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.blocks) {
        setBlocks(prev => {
          const savedConfig = response.data.blocks;
          return prev.map(block => ({
            ...block,
            visible: savedConfig[block.id]?.visible ?? block.visible,
            order: savedConfig[block.id]?.order ?? block.order
          })).sort((a, b) => a.order - b.order);
        });
      }
    } catch (error) {
      // Config doesn't exist yet, use defaults
    }
  };

  const toggleBlockVisibility = (blockId) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, visible: !b.visible } : b
    ));
    setHasChanges(true);
  };

  const moveBlock = (blockId, direction) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx === -1) return prev;
      
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      
      const newBlocks = [...prev];
      [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
      
      // Update order values
      return newBlocks.map((b, i) => ({ ...b, order: i }));
    });
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const config = {};
      blocks.forEach(b => {
        config[b.id] = { visible: b.visible, order: b.order };
      });
      
      await axios.put(`${API_URL}/api/admin/landing-page/config`, 
        { blocks: config },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Configuración guardada');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error guardando - El endpoint será creado próximamente');
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  // Get block visibility helper
  const isBlockVisible = (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    return block?.visible ?? true;
  };

  // Get sorted blocks for rendering
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Create edit mode context value
  const editModeValue = {
    isEditMode,
    editingBlockId: null,
    setEditingBlockId: () => {},
    updateBlockConfig: () => {},
    saveBlock: () => {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { destacados, noticias, anuncios, eventos, galerias } = communityData || {};

  return (
    <EditModeContext.Provider value={editModeValue}>
      <div className="min-h-screen bg-background">
        {/* Admin Edit Mode Controls */}
        {isAdmin && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            {isEditMode && hasChanges && (
              <Button 
                onClick={saveAllChanges} 
                disabled={saving}
                className="shadow-lg"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            )}
            <Button
              variant={isEditMode ? "default" : "outline"}
              onClick={() => setIsEditMode(!isEditMode)}
              className="shadow-lg"
            >
              {isEditMode ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditMode ? 'Vista previa' : 'Editar'}
            </Button>
          </div>
        )}

        {/* Edit Mode Sidebar */}
        {isAdmin && isEditMode && (
          <div className="fixed left-6 top-24 z-50 bg-card border rounded-xl shadow-lg p-4 w-72 max-h-[calc(100vh-120px)] overflow-y-auto">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurar Bloques
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Usa las flechas para reordenar y el ojo para mostrar/ocultar
            </p>
            <div className="space-y-2">
              {sortedBlocks.map((block, idx) => {
                const IconComponent = block.icon;
                return (
                  <div
                    key={block.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                      block.visible 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {/* Move buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 hover:bg-primary/20 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="h-3 w-3 -rotate-90" />
                      </button>
                      <button
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={idx === sortedBlocks.length - 1}
                        className="p-0.5 hover:bg-primary/20 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="h-3 w-3 rotate-90" />
                      </button>
                    </div>
                    
                    {/* Block info */}
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{block.label}</span>
                    
                    {/* Visibility toggle */}
                    <button
                      onClick={() => toggleBlockVisibility(block.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        block.visible 
                          ? 'text-primary hover:bg-primary/20' 
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {block.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            
            {hasChanges && (
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={saveAllChanges} 
                  disabled={saving}
                  className="w-full"
                  size="sm"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            )}
          </div>
        )}

        <main className={`container mx-auto px-4 py-8 space-y-12 ${isEditMode ? 'ml-80' : ''}`}>
          {/* Render blocks dynamically based on sortedBlocks order */}
          {sortedBlocks.map((block) => {
            if (!block.visible) return null;
            
            switch (block.id) {
              case 'hero':
                return (
                  <section key={block.id} data-block="hero">
                    <HeroCarousel posts={destacados || []} />
                  </section>
                );
              
              case 'quickAccess':
                return (
                  <section key={block.id} data-block="quickAccess" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    <QuickAccessButton icon={Store} label="Unatienda" to="/unatienda" moduleKey="unatienda" />
                    <QuickAccessButton icon={Trophy} label="🏆 Super Pin" to="/pinpanclub/superpin/ranking" color="yellow" moduleKey="super_pin" />
                    <QuickAccessButton icon={Zap} label="⚡ Rapid Pin" to="/rapidpin" color="orange" moduleKey="rapid_pin" />
                    <QuickAccessButton icon={Calendar} label="Eventos" to="/eventos" moduleKey="events" />
                    <QuickAccessButton icon={Image} label="Galería" to="/galeria" moduleKey="gallery" />
                    <QuickAccessButton icon={Users} label="Jugadores" to="/pinpanclub/players" moduleKey="players" />
                  </section>
                );
              
              case 'announcements':
                if (!anuncios || anuncios.length === 0) return null;
                return (
                  <section key={block.id} data-block="announcements" className="bg-primary/5 rounded-2xl p-4 md:p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{anuncios[0].titulo}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {anuncios[0].resumen || anuncios[0].contenido}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/comunidad/post/${anuncios[0].post_id}`)}
                      >
                        Ver más
                      </Button>
                    </div>
                  </section>
                );
              
              case 'pinpanclub':
                return (
                  <section key={block.id} data-block="pinpanclub">
                    <PinPanClubFeedBlock 
                      config={{
                        titulo: { es: 'Actividad del Club', en: 'Club Activity' },
                        subtitulo: { es: 'Lo último en PinPanClub', en: 'Latest from PinPanClub' },
                        sections: {
                          recent_matches: { enabled: true, limit: 5 },
                          leaderboard: { enabled: true, limit: 10 },
                          active_challenges: { enabled: true, limit: 4 },
                          recent_achievements: { enabled: true, limit: 6 }
                        },
                        style: {
                          show_cta: true,
                          cta_text: { es: 'Ver más en PinPanClub', en: 'See more in PinPanClub' },
                          cta_url: '/pinpanclub'
                        }
                      }}
                    />
                  </section>
                );
              
              case 'news':
                if (!noticias || noticias.length === 0) return null;
                return (
                  <section key={block.id} data-block="news">
                    <SectionHeader 
                      icon={Newspaper} 
                      title="Últimas Noticias" 
                      action="Ver todas"
                      actionLink="/comunidad/noticias"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {noticias.slice(0, 3).map((post) => (
                        <NewsCard key={post.post_id} post={post} />
                      ))}
                    </div>
                  </section>
                );
              
              case 'events':
                if (!eventos || eventos.length === 0) return null;
                return (
                  <section key={block.id} data-block="events">
                    <SectionHeader 
                      icon={Calendar} 
                      title="Próximos Eventos" 
                      action="Ver todos"
                      actionLink="/eventos"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eventos.slice(0, 4).map((evento) => (
                        <EventCard key={evento.evento_id} evento={evento} />
                      ))}
                    </div>
                  </section>
                );
              
              case 'gallery':
                if (!galerias || galerias.length === 0) return null;
                return (
                  <section key={block.id} data-block="gallery">
                    <SectionHeader 
                      icon={Image} 
                      title="Galería" 
                      action="Ver todo"
                      actionLink="/galeria"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galerias.slice(0, 4).map((album) => (
                        <GalleryCard key={album.album_id} album={album} />
                      ))}
                    </div>
                  </section>
                );
              
              default:
                return null;
            }
          })}

          {/* Empty State */}
          {!destacados?.length && !noticias?.length && !eventos?.length && !galerias?.length && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Bienvenido a ChiPi Link</h2>
              <p className="text-muted-foreground mb-8">
                Tu Super App de comunidad y servicios
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/pinpanclub')}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Ir a PinPanClub
                </Button>
                <Button variant="outline" onClick={() => navigate('/unatienda')}>
                  <Store className="h-4 w-4 mr-2" />
                  Ver Unatienda
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </EditModeContext.Provider>
  );
}
