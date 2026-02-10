import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ChevronRight,
  ShoppingCart,
  Plus,
  Check,
  Clock,
  Star,
  Sparkles,
  TrendingUp,
  Package,
  ArrowRight,
  Percent
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CategoryLanding({ 
  categoria, 
  categoriaInfo,
  grados = [],
  onSelectSubcategoria,
  onViewAllProducts 
}) {
  const navigate = useNavigate();
  const { addItem, items, openCart } = useCart();
  
  const [landingData, setLandingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});

  useEffect(() => {
    if (categoria) {
      fetchLandingData();
    }
  }, [categoria]);

  const fetchLandingData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/category-landing/${categoria}`);
      setLandingData(response.data);
    } catch (error) {
      console.error('Error fetching landing data:', error);
      toast.error('Error al cargar la página');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product, e) => {
    e?.stopPropagation();
    if (product.inventory_quantity <= 0) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    setAddedItems(prev => ({ ...prev, [product.book_id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.book_id]: false }));
    }, 1500);
  };

  const isInCart = (bookId) => items.some(item => item.book_id === bookId);
  const getCartQuantity = (bookId) => {
    const item = items.find(item => item.book_id === bookId);
    return item ? item.quantity : 0;
  };

  const getStockStatus = (cantidad) => {
    if (cantidad <= 0) return { label: 'Agotado', color: 'destructive', canBuy: false };
    if (cantidad < 10) return { label: `Solo ${cantidad}`, color: 'warning', canBuy: true };
    return { label: 'Disponible', color: 'success', canBuy: true };
  };

  const calculateDiscount = (precio, precioOferta) => {
    if (!precioOferta || precioOferta >= precio) return 0;
    return Math.round((1 - precioOferta / precio) * 100);
  };

  // Product Card Component
  const ProductCard = ({ product, showPromotion = false }) => {
    const stockStatus = getStockStatus(product.inventory_quantity);
    const inCart = isInCart(product.book_id);
    const cartQty = getCartQuantity(product.book_id);
    const justAdded = addedItems[product.book_id];
    const discount = showPromotion ? calculateDiscount(product.price, product.sale_price) : 0;

    return (
      <Card 
        className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
        onClick={() => navigate(`/unatienda/producto/${product.book_id}`)}
      >
        <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative overflow-hidden">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <span className="text-5xl">{categoriaInfo?.icono || '📦'}</span>
          )}
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-500 text-white">
                -{discount}%
              </Badge>
            </div>
          )}
          
          {/* Stock Badge */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant={stockStatus.color === 'success' ? 'default' : 
                       stockStatus.color === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {stockStatus.label}
            </Badge>
          </div>

          {/* Featured Badge */}
          {product.featured && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                Destacado
              </Badge>
            </div>
          )}

          {/* Cart Badge */}
          {inCart && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="default" className="bg-primary text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" />
                {cartQty}
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            {showPromotion && product.sale_price ? (
              <>
                <span className="text-lg font-bold text-red-600">
                  ${product.sale_price.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  ${product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Add to Cart */}
          <Button
            size="sm"
            variant={inCart ? "secondary" : "default"}
            className="w-full rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              inCart ? openCart() : handleAddToCart(product, e);
            }}
            disabled={!stockStatus.canBuy}
          >
            {justAdded ? (
              <><Check className="h-4 w-4 mr-1" /> Agregado</>
            ) : inCart ? (
              <><ShoppingCart className="h-4 w-4 mr-1" /> Ver carrito</>
            ) : (
              <><Plus className="h-4 w-4 mr-1" /> Agregar</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Section Header Component
  const SectionHeader = ({ icon: Icon, title, action, onAction }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {action && (
        <Button variant="ghost" size="sm" onClick={onAction} className="text-primary">
          {action}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!landingData) {
    return (
      <div className="text-center py-16">
        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No se pudo cargar la información</p>
      </div>
    );
  }

  const { banners, destacados, promociones, novedades, total_productos } = landingData;
  const hasContent = banners?.length > 0 || destacados?.length > 0 || promociones?.length > 0 || novedades?.length > 0;

  return (
    <div className="space-y-8">
      {/* Hero Banner Section */}
      {banners && banners.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden">
          {banners.length === 1 ? (
            <div 
              className="aspect-[21/9] md:aspect-[3/1] bg-cover bg-center relative cursor-pointer"
              style={{ backgroundImage: `url(${banners[0].image_url})` }}
              onClick={() => banners[0].link_url && navigate(banners[0].link_url)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                <div className="p-6 md:p-10 text-white max-w-xl">
                  {banners[0].titulo && (
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">{banners[0].titulo}</h2>
                  )}
                  {banners[0].subtitulo && (
                    <p className="text-sm md:text-lg opacity-90">{banners[0].subtitulo}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.slice(0, 2).map((banner, idx) => (
                <div 
                  key={banner.banner_id}
                  className="aspect-[16/9] bg-cover bg-center rounded-xl relative cursor-pointer overflow-hidden"
                  style={{ backgroundImage: `url(${banner.image_url})` }}
                  onClick={() => banner.link_url && navigate(banner.link_url)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    <div className="p-4 text-white">
                      {banner.titulo && <h3 className="font-bold">{banner.titulo}</h3>}
                      {banner.subtitulo && <p className="text-sm opacity-90">{banner.subtitulo}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subcategories Quick Access (for books = grades) */}
      {categoria === 'books' && grados.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Explorar por Grado
          </h3>
          <div className="flex flex-wrap gap-2">
            {grados.map((grado) => (
              <Button
                key={grado.id}
                variant="outline"
                size="sm"
                onClick={() => onSelectSubcategoria(grado.id)}
                className="rounded-full"
              >
                {grado.nombre}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Promotions Section */}
      {promociones && promociones.length > 0 && (
        <section>
          <SectionHeader 
            icon={Percent} 
            title="🔥 Ofertas Especiales" 
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {promociones.slice(0, 4).map((product) => (
              <ProductCard key={product.book_id} product={product} showPromotion={true} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      {destacados && destacados.length > 0 && (
        <section>
          <SectionHeader 
            icon={Star} 
            title="⭐ Productos Destacados" 
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {destacados.slice(0, 4).map((product) => (
              <ProductCard key={product.book_id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals Section */}
      {novedades && novedades.length > 0 && (
        <section>
          <SectionHeader 
            icon={Sparkles} 
            title="🆕 Novedades" 
            action="Ver más"
            onAction={onViewAllProducts}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {novedades.slice(0, 8).map((product) => (
              <ProductCard key={product.book_id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* View All Products CTA */}
      <div className="text-center py-8 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl">
        <Package className="h-12 w-12 mx-auto mb-4 text-primary/60" />
        <h3 className="text-xl font-bold mb-2">
          Explora todo el catálogo
        </h3>
        <p className="text-muted-foreground mb-4">
          {total_productos} productos disponibles en {categoriaInfo?.nombre || 'esta categoría'}
        </p>
        <Button onClick={onViewAllProducts} size="lg" className="rounded-full gap-2">
          Ver todos los productos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty State */}
      {!hasContent && (
        <div className="text-center py-16 bg-muted/30 rounded-2xl">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2">¡Próximamente!</h3>
          <p className="text-muted-foreground mb-4">
            Estamos preparando contenido especial para esta categoría
          </p>
          <Button onClick={onViewAllProducts} variant="outline" className="rounded-full">
            Ver productos disponibles
          </Button>
        </div>
      )}
    </div>
  );
}
