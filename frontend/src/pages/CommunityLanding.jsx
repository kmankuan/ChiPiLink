import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Newspaper,
  Calendar,
  ShoppingBag,
  Image,
  Users,
  ArrowRight,
  ChevronRight,
  Clock,
  MapPin,
  Heart,
  Eye,
  MessageCircle,
  Star,
  Sparkles,
  Bell,
  Trophy,
  Store,
  Send,
  ExternalLink,
  Play
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to format date in Spanish
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

// Section Header Component
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

// Hero Carousel Component
const HeroCarousel = ({ posts }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (posts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (!posts || posts.length === 0) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background h-[300px] md:h-[400px] flex items-center justify-center">
        <div className="text-center px-6">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
          <h2 className="text-2xl md:text-4xl font-bold mb-2">Bienvenido a ChiPi Link</h2>
          <p className="text-muted-foreground">Tu comunidad, conectada</p>
        </div>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div 
      className="relative rounded-3xl overflow-hidden h-[300px] md:h-[400px] cursor-pointer group"
      onClick={() => navigate(`/comunidad/post/${currentPost.post_id}`)}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ 
          backgroundImage: currentPost.imagen_url 
            ? `url(${currentPost.imagen_url})` 
            : 'linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))'
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <Badge className="mb-3" variant={currentPost.tipo === 'evento' ? 'default' : 'secondary'}>
          {currentPost.tipo === 'noticia' ? '📰 Noticia' : 
           currentPost.tipo === 'evento' ? '📅 Evento' : '📢 Anuncio'}
        </Badge>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 line-clamp-2">
          {currentPost.titulo}
        </h2>
        {currentPost.resumen && (
          <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl">
            {currentPost.resumen}
          </p>
        )}
        <div className="flex items-center gap-4 mt-4 text-white/60 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDate(currentPost.fecha_publicacion)}
          </span>
          {currentPost.vistas > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {currentPost.vistas}
            </span>
          )}
        </div>
      </div>

      {/* Carousel Indicators */}
      {posts.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-2">
          {posts.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
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

// News Card Component
const NewsCard = ({ post, compact = false }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden h-full"
      onClick={() => navigate(`/comunidad/post/${post.post_id}`)}
    >
      {post.imagen_url && !compact && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img 
            src={post.imagen_url} 
            alt={post.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <CardContent className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {post.tipo === 'noticia' ? 'Noticia' : post.tipo === 'anuncio' ? 'Anuncio' : 'Evento'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.fecha_publicacion)}
          </span>
        </div>
        <h3 className={`font-semibold group-hover:text-primary transition-colors ${compact ? 'text-sm line-clamp-2' : 'text-lg line-clamp-2 mb-2'}`}>
          {post.titulo}
        </h3>
        {!compact && post.resumen && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.resumen}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {post.vistas > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {post.vistas}
            </span>
          )}
          {post.likes > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> {post.likes}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Event Card Component
const EventCard = ({ event }) => {
  const navigate = useNavigate();
  const dateInfo = formatEventDate(event.fecha_inicio);
  
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
      onClick={() => navigate(`/comunidad/evento/${event.evento_id}`)}
    >
      <CardContent className="p-4 flex gap-4">
        {/* Date Badge */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-primary">{dateInfo.day}</span>
          <span className="text-xs font-medium text-primary/70">{dateInfo.month}</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {event.destacado && (
              <Badge variant="default" className="text-xs">Destacado</Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {event.tipo === 'torneo' ? '🏓 Torneo' : 
               event.tipo === 'reunion' ? '👥 Reunión' : 
               event.tipo === 'social' ? '🎉 Social' : '📅 Evento'}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {event.titulo}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {dateInfo.time}
            </span>
            {event.lugar && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" /> {event.lugar}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Card Component (Compact)
const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const hasDiscount = product.en_promocion && product.precio_oferta;
  
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
      onClick={() => navigate(`/unatienda/producto/${product.libro_id}`)}
    >
      <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center overflow-hidden relative">
        {product.imagen_url ? (
          <img 
            src={product.imagen_url} 
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-4xl">📦</span>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            -{Math.round((1 - product.precio_oferta / product.precio) * 100)}%
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {product.nombre}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {hasDiscount ? (
            <>
              <span className="font-bold text-red-600">${product.precio_oferta?.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground line-through">${product.precio.toFixed(2)}</span>
            </>
          ) : (
            <span className="font-bold text-primary">${product.precio.toFixed(2)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Gallery Album Card
const AlbumCard = ({ album }) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
      onClick={() => navigate(`/comunidad/galeria/${album.album_id}`)}
    >
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden relative">
        {album.imagen_portada ? (
          <img 
            src={album.imagen_portada} 
            alt={album.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white line-clamp-1">{album.titulo}</h3>
          {album.fotos && (
            <span className="text-xs text-white/70">{album.fotos.length} fotos</span>
          )}
        </div>
      </div>
    </Card>
  );
};

// Ping Pong Section Component
const PingPongSection = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPingPongData = async () => {
      try {
        // Fetch active matches
        const matchesRes = await axios.get(`${API_URL}/api/pingpong/matches`);
        const activeMatches = matchesRes.data.filter(m => m.estado === 'en_curso');
        setMatches(activeMatches.slice(0, 3));

        // Fetch rankings
        const rankingsRes = await axios.get(`${API_URL}/api/pingpong/rankings?limit=5`);
        setRankings(rankingsRes.data);
      } catch (error) {
        console.error('Error fetching ping pong data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPingPongData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPingPongData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-gradient-to-br from-green-500/5 via-background to-emerald-500/5 rounded-3xl p-6 md:p-8">
      <SectionHeader 
        icon={Trophy} 
        title="🏓 Club de Tenis de Mesa" 
        action="Ver todo"
        actionLink="/pingpong"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Matches */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Partidos en Vivo
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card 
                  key={match.partido_id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/pingpong/spectator/${match.partido_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {match.jugador_a_info?.nombre?.[0] || 'A'}
                        </div>
                        <div>
                          <div className="font-medium">{match.jugador_a_info?.apodo || match.jugador_a_info?.nombre || 'Jugador A'}</div>
                          <div className="text-xs text-muted-foreground">Mesa {match.mesa || '?'}</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black">{match.puntos_jugador_a}</span>
                          <span className="text-muted-foreground">:</span>
                          <span className="text-2xl font-black">{match.puntos_jugador_b}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sets: {match.sets_jugador_a} - {match.sets_jugador_b}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">{match.jugador_b_info?.apodo || match.jugador_b_info?.nombre || 'Jugador B'}</div>
                          <div className="text-xs text-red-500 flex items-center gap-1 justify-end">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            EN VIVO
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                          {match.jugador_b_info?.nombre?.[0] || 'B'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-2">🏓</div>
                <p className="text-muted-foreground">No hay partidos en vivo</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/pingpong')}
                >
                  Ver dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/canvas')}
            >
              <Play className="h-4 w-4" />
              Ver TV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/pingpong')}
            >
              <Trophy className="h-4 w-4" />
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 hidden md:flex"
              onClick={() => navigate('/pingpong/sponsors')}
            >
              <Star className="h-4 w-4" />
              Patrocinadores
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 hidden md:flex"
              onClick={() => window.open('/tv/pingpong', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Pantalla TV
            </Button>
          </div>
        </div>

        {/* Rankings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Top 5 Ranking
          </h3>
          
          <Card>
            <CardContent className="p-0">
              {rankings.length > 0 ? (
                <div className="divide-y">
                  {rankings.map((player, index) => (
                    <div 
                      key={player.jugador_id} 
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/pingpong')}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{player.apodo || player.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {player.partidos_ganados}W - {player.partidos_perdidos}L
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{player.elo_rating}</div>
                        <div className="text-xs text-muted-foreground">ELO</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No hay jugadores registrados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

// Quick Access Button
const QuickAccessButton = ({ icon: Icon, label, to, color = 'primary' }) => (
  <Link to={to}>
    <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-${color}/5 hover:bg-${color}/10 transition-colors cursor-pointer group`}>
      <div className={`p-3 rounded-xl bg-${color}/10 group-hover:bg-${color}/20 transition-colors`}>
        <Icon className={`h-6 w-6 text-${color}`} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  </Link>
);

// Main Community Landing Component
export default function CommunityLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/community/landing`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching landing data:', error);
      toast.error('Error al cargar contenido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { destacados, noticias, anuncios, eventos, galerias, productos_destacados, productos_promocion } = data || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              <span className="font-bold text-xl">ChiPi Link</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/unatienda" className="text-sm hover:text-primary transition-colors">Tienda</Link>
              <Link to="/comunidad" className="text-sm hover:text-primary transition-colors">Comunidad</Link>
              <Link to="/eventos" className="text-sm hover:text-primary transition-colors">Eventos</Link>
              <Link to="/galeria" className="text-sm hover:text-primary transition-colors">Galería</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Iniciar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section>
          <HeroCarousel posts={destacados || []} />
        </section>

        {/* Quick Access */}
        <section className="grid grid-cols-4 md:grid-cols-6 gap-3">
          <QuickAccessButton icon={Store} label="Tienda" to="/unatienda" />
          <QuickAccessButton icon={Calendar} label="Eventos" to="/eventos" />
          <QuickAccessButton icon={Image} label="Galería" to="/galeria" />
          <QuickAccessButton icon={Trophy} label="Torneos" to="/pingpong" />
          <QuickAccessButton icon={Users} label="Club" to="/club" />
          <QuickAccessButton icon={Send} label="Telegram" to="/telegram" />
        </section>

        {/* Announcements Banner */}
        {anuncios && anuncios.length > 0 && (
          <section className="bg-primary/5 rounded-2xl p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{anuncios[0].titulo}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{anuncios[0].resumen || anuncios[0].contenido}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/comunidad/post/${anuncios[0].post_id}`)}>
                Ver más
              </Button>
            </div>
          </section>
        )}

        {/* News Section */}
        {noticias && noticias.length > 0 && (
          <section>
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
        )}

        {/* Events Section */}
        {eventos && eventos.length > 0 && (
          <section>
            <SectionHeader 
              icon={Calendar} 
              title="Próximos Eventos" 
              action="Ver calendario"
              actionLink="/eventos"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventos.slice(0, 4).map((event) => (
                <EventCard key={event.evento_id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Store Section */}
        {(productos_destacados?.length > 0 || productos_promocion?.length > 0) && (
          <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-3xl p-6 md:p-8">
            <SectionHeader 
              icon={ShoppingBag} 
              title="Tienda Destacada" 
              action="Ir a la tienda"
              actionLink="/unatienda"
            />
            
            {/* Promotions */}
            {productos_promocion && productos_promocion.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Ofertas Especiales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {productos_promocion.slice(0, 4).map((product) => (
                    <ProductCard key={product.libro_id} product={product} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Featured Products */}
            {productos_destacados && productos_destacados.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" /> Productos Destacados
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {productos_destacados.slice(0, 4).map((product) => (
                    <ProductCard key={product.libro_id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Gallery Section */}
        {galerias && galerias.length > 0 && (
          <section>
            <SectionHeader 
              icon={Image} 
              title="Galería de la Comunidad" 
              action="Ver toda la galería"
              actionLink="/galeria"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galerias.slice(0, 4).map((album) => (
                <AlbumCard key={album.album_id} album={album} />
              ))}
            </div>
          </section>
        )}

        {/* Ping Pong Section */}
        <PingPongSection />

        {/* Telegram Section (Placeholder) */}
        <section className="bg-[#0088cc]/5 rounded-3xl p-6 md:p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#0088cc]/10 flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-[#0088cc]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Únete a nuestro Telegram</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Mantente conectado con la comunidad. Noticias, fotos y más en tiempo real.
            </p>
            <Button className="bg-[#0088cc] hover:bg-[#0088cc]/90">
              <Send className="h-4 w-4 mr-2" />
              Unirse al Canal
            </Button>
          </div>
        </section>

        {/* Community Stats (Placeholder) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Miembros', value: '150+' },
            { icon: Trophy, label: 'Torneos', value: '12' },
            { icon: Calendar, label: 'Eventos', value: '24' },
            { icon: Image, label: 'Fotos', value: '500+' }
          ].map((stat, idx) => (
            <Card key={idx} className="text-center p-6">
              <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary/60" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              <span className="font-bold">ChiPi Link</span>
              <span className="text-muted-foreground text-sm">• Comunidad China en Panamá</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary">Acerca de</Link>
              <Link to="/contact" className="hover:text-primary">Contacto</Link>
              <Link to="/privacy" className="hover:text-primary">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
