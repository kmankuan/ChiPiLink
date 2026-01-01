import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  Book, 
  Truck, 
  HeadphonesIcon, 
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Shield,
  Star,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Quote
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for features
const ICON_MAP = {
  shield: Shield,
  truck: Truck,
  headphones: HeadphonesIcon,
  book: Book,
  star: Star,
  graduation: GraduationCap,
  check: CheckCircle2
};

export default function Landing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [useStaticPage, setUseStaticPage] = useState(false);

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      const [pageRes, configRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/public/landing-page`),
        axios.get(`${BACKEND_URL}/api/public/site-config`)
      ]);

      const pageData = pageRes.data;
      setSiteConfig(configRes.data);

      // Check if page has blocks and is published
      if (pageData.publicada && pageData.bloques && pageData.bloques.length > 0) {
        // Sort by order and filter active blocks
        const activeBlocks = pageData.bloques
          .filter(b => b.activo !== false)
          .sort((a, b) => a.orden - b.orden);
        setBlocks(activeBlocks);
        setUseStaticPage(false);
      } else {
        setUseStaticPage(true);
      }
    } catch (error) {
      console.error('Error fetching landing data:', error);
      setUseStaticPage(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render static page if no dynamic blocks
  if (useStaticPage) {
    return <StaticLandingPage siteConfig={siteConfig} />;
  }

  // Render dynamic blocks
  return (
    <div className="min-h-screen">
      {blocks.map((block) => (
        <BlockRenderer key={block.bloque_id} block={block} siteConfig={siteConfig} />
      ))}
      
      {/* Footer */}
      <Footer siteConfig={siteConfig} />
    </div>
  );
}

// Block Renderer Component
function BlockRenderer({ block, siteConfig }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const config = block.config || {};

  switch (block.tipo) {
    case 'hero':
      return (
        <section 
          className="relative overflow-hidden"
          style={{ minHeight: config.altura || '500px' }}
        >
          {config.imagen_url && (
            <img 
              src={config.imagen_url} 
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div 
            className="absolute inset-0" 
            style={{ background: config.overlay_color || 'rgba(0,0,0,0.5)' }} 
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 h-full flex items-center" style={{ minHeight: config.altura || '500px' }}>
            <div className="py-16 md:py-24">
              {siteConfig?.nombre_sitio && (
                <p className="uppercase tracking-[0.2em] text-xs font-bold text-primary mb-4">
                  {siteConfig.nombre_sitio}
                </p>
              )}
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-2xl">
                {config.titulo}
              </h1>
              {config.subtitulo && (
                <p className="text-white/80 text-base md:text-lg mb-8 max-w-xl leading-relaxed">
                  {config.subtitulo}
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                {config.boton_texto && (
                  <Button 
                    size="lg"
                    onClick={() => navigate(config.boton_url || '/registro')}
                    className="rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {config.boton_texto}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                {config.boton_secundario_texto && (
                  <Button 
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate(config.boton_secundario_url || '/')}
                    className="rounded-full px-8 py-6 text-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                  >
                    {config.boton_secundario_texto}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      );

    case 'features':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
          {(config.titulo || config.subtitulo) && (
            <div className="text-center mb-12">
              {config.titulo && (
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  {config.titulo}
                </h2>
              )}
              {config.subtitulo && (
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {config.subtitulo}
                </p>
              )}
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-${config.columnas || 3} gap-6 md:gap-8`}>
            {(config.items || []).map((item, index) => {
              const Icon = ICON_MAP[item.icono] || CheckCircle2;
              return (
                <div 
                  key={index}
                  className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 soft-shadow"
                >
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-3">
                    {item.titulo}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.descripcion}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'text':
      return (
        <section 
          className="px-4 md:px-8 lg:px-12 py-12 md:py-16 max-w-7xl mx-auto"
          style={{ textAlign: config.alineacion || 'center' }}
        >
          <div style={{ maxWidth: config.ancho_max || '800px', margin: '0 auto' }}>
            {config.titulo && (
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
                {config.titulo}
              </h2>
            )}
            <div className="prose prose-lg max-w-none text-muted-foreground">
              {config.contenido?.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      );

    case 'image':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
          <figure style={{ width: config.ancho || '100%', margin: '0 auto' }}>
            <img 
              src={config.imagen_url} 
              alt={config.alt || ''} 
              className={`w-full h-auto ${config.redondeado !== false ? 'rounded-2xl' : ''}`}
            />
            {config.caption && (
              <figcaption className="text-center text-sm text-muted-foreground mt-4">
                {config.caption}
              </figcaption>
            )}
          </figure>
        </section>
      );

    case 'cta':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
          <div 
            className="relative rounded-3xl overflow-hidden p-8 md:p-12 lg:p-16"
            style={{ 
              backgroundColor: config.fondo_color || '#16a34a',
              color: config.texto_color || '#ffffff'
            }}
          >
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {config.titulo}
              </h2>
              {config.subtitulo && (
                <p className="mb-8 leading-relaxed opacity-90">
                  {config.subtitulo}
                </p>
              )}
              {config.boton_texto && (
                <Button 
                  size="lg"
                  onClick={() => navigate(config.boton_url || '/registro')}
                  className="rounded-full px-8 py-6 text-lg font-medium bg-white text-gray-900 hover:bg-white/90"
                >
                  {config.boton_texto}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 md:py-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {(config.items || []).map((item, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">
                  {item.numero}
                </p>
                <p className="text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'cards':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
          {config.titulo && (
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">
              {config.titulo}
            </h2>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-${config.columnas || 3} gap-6 md:gap-8`}>
            {(config.items || []).map((item, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg transition-all duration-300 group"
              >
                {item.imagen_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={item.imagen_url} 
                      alt={item.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-serif text-xl font-bold mb-2">{item.titulo}</h3>
                  <p className="text-muted-foreground">{item.descripcion}</p>
                  {item.link && (
                    <Link to={item.link} className="inline-flex items-center text-primary mt-4 hover:underline">
                      Ver más <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'banner':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
          <div 
            className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
            style={{ backgroundColor: config.fondo_color || '#f0fdf4' }}
          >
            <div className="flex-1">
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                {config.titulo}
              </h2>
              {config.subtitulo && (
                <p className="text-muted-foreground mb-6">{config.subtitulo}</p>
              )}
              {config.boton_texto && (
                <Button onClick={() => navigate(config.boton_url || '/')} className="rounded-full">
                  {config.boton_texto}
                </Button>
              )}
            </div>
            {config.imagen_url && (
              <div className="flex-shrink-0">
                <img 
                  src={config.imagen_url} 
                  alt=""
                  className="w-48 h-48 object-cover rounded-2xl"
                />
              </div>
            )}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
          {config.titulo && (
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">
              {config.titulo}
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {(config.items || []).map((item, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 border border-border/50"
              >
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="text-muted-foreground mb-6 italic">
                  &ldquo;{item.texto}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {item.avatar_url ? (
                    <img 
                      src={item.avatar_url} 
                      alt={item.nombre}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">
                        {item.nombre?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{item.nombre}</p>
                    {item.cargo && (
                      <p className="text-sm text-muted-foreground">{item.cargo}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'spacer':
      return <div style={{ height: config.altura || '60px' }} />;

    case 'divider':
      return (
        <div 
          className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12"
          style={{ padding: `${config.margen || '40px'} 0` }}
        >
          <hr 
            style={{ 
              borderStyle: config.estilo || 'solid',
              borderColor: config.color || '#e5e7eb',
              borderWidth: '1px 0 0 0',
              width: config.ancho || '100%',
              margin: '0 auto'
            }} 
          />
        </div>
      );

    default:
      return null;
  }
}

// Footer Component
function Footer({ siteConfig }) {
  return (
    <footer className="px-4 md:px-8 lg:px-12 py-8 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <span className="font-serif font-bold">{siteConfig?.nombre_sitio || 'Mi Tienda'}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {siteConfig?.email_contacto && (
            <a href={`mailto:${siteConfig.email_contacto}`} className="flex items-center gap-1 hover:text-foreground">
              <Mail className="h-4 w-4" /> {siteConfig.email_contacto}
            </a>
          )}
          {siteConfig?.telefono_contacto && (
            <a href={`tel:${siteConfig.telefono_contacto}`} className="flex items-center gap-1 hover:text-foreground">
              <Phone className="h-4 w-4" /> {siteConfig.telefono_contacto}
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {siteConfig?.footer_texto || '© 2025 Todos los derechos reservados'}
        </p>
      </div>
    </footer>
  );
}

// Static Landing Page (Fallback)
function StaticLandingPage({ siteConfig }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: Book,
      title: t('landing.features.easy'),
      description: t('landing.features.easyDesc')
    },
    {
      icon: Truck,
      title: t('landing.features.fast'),
      description: t('landing.features.fastDesc')
    },
    {
      icon: HeadphonesIcon,
      title: t('landing.features.support'),
      description: t('landing.features.supportDesc')
    }
  ];

  const grades = ['1', '2', '3', '4', '5', '6'];
  const siteName = siteConfig?.nombre_sitio || t('app.name') || 'Tienda';

  return (
    <div className="min-h-screen noise-bg">
      {/* Hero Section - Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
        {/* Main Hero Card */}
        <div 
          className="col-span-full md:col-span-8 row-span-2 min-h-[400px] md:min-h-[500px] rounded-3xl overflow-hidden relative group"
          data-testid="hero-main-card"
        >
          <img 
            src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" 
            alt="Students with textbooks"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-12">
            <p className="uppercase tracking-[0.2em] text-xs font-bold text-accent mb-4">
              {siteName}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-2xl">
              {t('landing.hero.title')}
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-8 max-w-xl leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/registro')}
                className="rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                data-testid="hero-cta-button"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="secondary"
                size="lg"
                onClick={() => navigate('/catalogo')}
                className="rounded-full px-8 py-6 text-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
                data-testid="hero-catalog-button"
              >
                {t('nav.catalog')}
              </Button>
            </div>
          </div>
        </div>

        {/* Side Card - Quick Stats */}
        <div 
          className="col-span-full md:col-span-4 rounded-3xl bg-card border border-border p-6 md:p-8 flex flex-col justify-between soft-shadow"
          data-testid="stats-card"
        >
          <div>
            <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-serif text-xl md:text-2xl font-bold mb-2">
              12 {t('landing.allGrades')}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('landing.fromPreschool')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-6">
            {grades.map(grade => (
              <span 
                key={grade}
                className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {t(`grades.${grade}`)}
              </span>
            ))}
          </div>
        </div>

        {/* Side Card - Benefits */}
        <div 
          className="col-span-full md:col-span-4 rounded-3xl bg-primary text-primary-foreground p-6 md:p-8 soft-shadow"
          data-testid="benefits-card"
        >
          <h3 className="font-serif text-lg md:text-xl font-bold mb-4">
            {t('landing.whyUs')}
          </h3>
          <ul className="space-y-3">
            {[
              t('landing.benefits.prices'),
              t('landing.benefits.original'),
              t('landing.benefits.shipping'),
              t('landing.benefits.support')
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            {t('landing.buyEasy')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.buyEasyDesc')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 soft-shadow"
              data-testid={`feature-card-${index}`}
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 lg:px-12 py-12 md:py-20 max-w-7xl mx-auto">
        <div 
          className="relative rounded-3xl overflow-hidden bg-secondary p-8 md:p-12 lg:p-16"
          data-testid="cta-section"
        >
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              {t('landing.readyToOrder')}
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {t('landing.readyToOrderDesc')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                onClick={() => navigate('/registro')}
                className="rounded-full px-8 py-6 text-lg font-medium"
                data-testid="cta-register-button"
              >
                {t('nav.register')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate('/catalogo')}
                className="rounded-full px-8 py-6 text-lg"
              >
                {t('landing.viewCatalog')}
              </Button>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full hidden lg:block">
            <img 
              src="https://images.unsplash.com/photo-1531280518436-9f2cc0fff88a?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
              alt="Decorative"
              className="w-full h-full object-cover opacity-50 rounded-l-3xl"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
