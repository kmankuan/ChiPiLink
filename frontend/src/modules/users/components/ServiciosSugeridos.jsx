/**
 * ServiciosSugeridos - Componente para mostrar servicios/membresías sugeridos
 * Marketing configurable por admin
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Star,
  CheckCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ServiciosSugeridos({ token }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'es';
  
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    loadServicios();
  }, []);

  const loadServicios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/conexiones/servicios-sugeridos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServicios(data.servicios || []);
      }
    } catch (err) {
      console.error('Error loading servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNombre = (item) => {
    if (item.nombre && typeof item.nombre === 'object') {
      return item.nombre[lang] || item.nombre['es'] || Object.values(item.nombre)[0];
    }
    return item.nombre || '';
  };

  const getDescripcion = (item) => {
    if (item.descripcion && typeof item.descripcion === 'object') {
      return item.descripcion[lang] || item.descripcion['es'] || '';
    }
    return item.descripcion || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (servicios.length === 0) {
    return null; // No mostrar si no hay servicios sugeridos
  }

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('servicios.title')}
        </CardTitle>
        <CardDescription>
          {t('servicios.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servicios.map((servicio) => (
            <div 
              key={servicio.membresia_id}
              className="p-4 rounded-lg bg-card border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-xl text-2xl"
                  style={{ backgroundColor: `${servicio.color || '#6366f1'}20` }}
                >
                  {servicio.icono || '⭐'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold flex items-center gap-2">
                    {getNombre(servicio)}
                    {servicio.destacado && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Recomendado
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getDescripcion(servicio)}
                  </p>
                  
                  {/* Planes disponibles */}
                  {servicio.planes && servicio.planes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {servicio.planes.slice(0, 3).map((plan) => (
                        <Badge 
                          key={plan.plan_id} 
                          variant="outline"
                          className="text-xs"
                        >
                          {plan.nombre} - ${plan.precio}
                        </Badge>
                      ))}
                      {servicio.planes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{servicio.planes.length - 3} más
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Beneficios destacados */}
                  {servicio.beneficios && (
                    <div className="mt-3 space-y-1">
                      {servicio.beneficios.slice(0, 3).map((beneficio, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {beneficio}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button size="sm" asChild>
                    <Link to={`/membresias/${servicio.membresia_id}`}>
                      {t('servicios.viewPlans')}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
