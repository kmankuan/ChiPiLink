import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ChevronLeft,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Clock,
  Loader2,
  Store,
  Package
} from 'lucide-react';
import FloatingStoreNav from '@/components/store/FloatingStoreNav';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categoryIcons = {
  'libros': '📚',
  'snacks': '🍫',
  'bebidas': '🥤',
  'preparados': '🌭',
  'uniformes': '👕',
  'servicios': '🔧'
};

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem, items, openCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const [productRes, categoriasRes, gradosRes] = await Promise.all([
        axios.get(`${API_URL}/api/libros/${productId}`),
        axios.get(`${API_URL}/api/categorias`),
        axios.get(`${API_URL}/api/grados`)
      ]);
      
      setProduct(productRes.data);
      setCategorias(categoriasRes.data || []);
      setGrados(gradosRes.data.grados || []);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoriaId) => {
    const cat = categorias.find(c => c.categoria_id === categoriaId);
    return cat || { nombre: categoriaId, icono: categoryIcons[categoriaId] || '📦' };
  };

  const getStockStatus = (cantidad) => {
    if (cantidad <= 0) return { label: 'Agotado', color: 'destructive', canBuy: false };
    if (cantidad < 10) return { label: `Solo ${cantidad} disponibles`, color: 'warning', canBuy: true };
    return { label: 'En stock', color: 'success', canBuy: true };
  };

  const isInCart = () => items.some(item => item.libro_id === product?.libro_id);
  const getCartQuantity = () => {
    const item = items.find(item => item.libro_id === product?.libro_id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = () => {
    if (!product || product.cantidad_inventario <= 0) {
      toast.error('Producto sin stock');
      return;
    }
    
    const maxQty = product.cantidad_inventario - getCartQuantity();
    if (quantity > maxQty) {
      toast.error(`Solo puedes agregar ${maxQty} más`);
      return;
    }
    
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const incrementQuantity = () => {
    const maxQty = product.cantidad_inventario - getCartQuantity();
    if (quantity < maxQty) {
      setQuantity(q => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Producto no encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/unatienda')}>
          Volver a la tienda
        </Button>
      </div>
    );
  }

  const catInfo = getCategoryInfo(product.categoria);
  const stockStatus = getStockStatus(product.cantidad_inventario);
  const inCart = isInCart();
  const cartQty = getCartQuantity();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/unatienda')}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a la tienda
          </Button>
        </div>
      </div>

      {/* Product Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 rounded-3xl flex items-center justify-center overflow-hidden">
              {product.imagen_url ? (
                <img 
                  src={product.imagen_url} 
                  alt={product.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-8xl">{catInfo.icono}</span>
              )}
            </div>
            
            {/* Stock Badge */}
            <div className="absolute top-4 right-4">
              <Badge 
                variant={stockStatus.color === 'success' ? 'default' : 
                         stockStatus.color === 'warning' ? 'secondary' : 'destructive'}
              >
                {stockStatus.label}
              </Badge>
            </div>

            {/* Preparation Badge */}
            {product.requiere_preparacion && (
              <div className="absolute top-4 left-4">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Requiere preparación
                </Badge>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="text-sm">
                <span className="mr-1">{catInfo.icono}</span>
                {catInfo.nombre}
              </Badge>
              {product.categoria === 'libros' && product.grado && (
                <Badge variant="secondary" className="text-sm">
                  {grados.find(g => g.id === product.grado)?.nombre || product.grado}
                </Badge>
              )}
              {product.categoria === 'libros' && product.materia && (
                <Badge variant="outline" className="text-sm">
                  {product.materia}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl lg:text-4xl font-bold mb-4">
              {product.nombre}
            </h1>

            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-bold text-primary">
                ${product.precio?.toFixed(2)}
              </span>
            </div>

            {/* Description */}
            {product.descripcion && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.descripcion}
                </p>
              </div>
            )}

            {/* Additional Info for Books */}
            {product.categoria === 'libros' && (product.isbn || product.editorial) && (
              <div className="mb-6 p-4 rounded-xl bg-muted/50">
                <h3 className="font-semibold mb-3">Información del libro</h3>
                <div className="space-y-2 text-sm">
                  {product.editorial && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Editorial:</span>
                      <span className="font-medium">{product.editorial}</span>
                    </div>
                  )}
                  {product.isbn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ISBN:</span>
                      <span className="font-medium">{product.isbn}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Cart Section */}
            {inCart && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 flex items-center justify-between">
                <span className="text-sm">
                  <ShoppingCart className="h-4 w-4 inline mr-2" />
                  Ya tienes {cartQty} en tu carrito
                </span>
                <Button variant="link" size="sm" onClick={openCart}>
                  Ver carrito
                </Button>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            {stockStatus.canBuy ? (
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity Selector */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-lg"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={incrementQuantity}
                    disabled={quantity >= (product.cantidad_inventario - cartQty)}
                    className="h-10 w-10 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  onClick={handleAddToCart}
                  className="flex-1 h-14 text-lg rounded-xl gap-2"
                  disabled={added}
                >
                  {added ? (
                    <><Check className="h-5 w-5" /> Agregado al carrito</>
                  ) : (
                    <><ShoppingCart className="h-5 w-5" /> Agregar al carrito</>
                  )}
                </Button>
              </div>
            ) : (
              <Button disabled className="w-full h-14 text-lg rounded-xl">
                Producto agotado
              </Button>
            )}

            {/* Stock Info */}
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {product.cantidad_inventario > 0 
                ? `${product.cantidad_inventario} unidades disponibles`
                : 'Sin stock disponible'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Floating Navigation Component - Back to Store */}
      <FloatingStoreNav
        categorias={categorias}
        grados={grados}
        showBackToStore={true}
      />
    </div>
  );
}
