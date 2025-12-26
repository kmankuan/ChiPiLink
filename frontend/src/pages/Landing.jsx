import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Book, 
  Truck, 
  HeadphonesIcon, 
  ArrowRight,
  GraduationCap,
  CheckCircle2
} from 'lucide-react';

export default function Landing() {
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
              Librería Escolar
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
      <footer className="px-4 md:px-8 lg:px-12 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold">Librería Escolar</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Librería Escolar. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
