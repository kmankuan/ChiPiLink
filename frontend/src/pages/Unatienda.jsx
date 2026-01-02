import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Search,
  ShoppingCart,
  Loader2,
  Store,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  Home
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default category icons mapping
const categoryIcons = {
  'libros': '📚',
  'snacks': '🍫',
  'bebidas': '🥤',
  'preparados': '🌭',
  'uniformes': '👕',
  'servicios': '🔧'
};

export default function Unatienda() {
  const { t } = useTranslation();
  const { addItem, items, openCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hierarchical navigation state
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  
  const [addedItems, setAddedItems] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, storeRes, categoriasRes, gradosRes, materiasRes] = await Promise.all([
        axios.get(`${API_URL}/api/platform-store/products`),
        axios.get(`${API_URL}/api/platform-store`),
        axios.get(`${API_URL}/api/categorias`),
        axios.get(`${API_URL}/api/grados`),
        axios.get(`${API_URL}/api/materias`)
      ]);
      
      setProducts(productsRes.data.products || []);
      setStoreInfo(storeRes.data);
      setCategorias(categoriasRes.data || []);
      setGrados(gradosRes.data.grados || []);
      setMaterias(materiasRes.data.materias || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on hierarchical selection
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // No category selected = show all
    if (!selectedCategoria) {
      return matchesSearch;
    }
    
    // Category selected
    const matchesCategoria = product.categoria === selectedCategoria;
    
    // If subcategory selected (for books = grade)
    if (selectedSubcategoria && selectedCategoria === 'libros') {
      const matchesGrado = product.grado === selectedSubcategoria || 
        product.grados?.includes(selectedSubcategoria);
      return matchesSearch && matchesCategoria && matchesGrado;
    }
    
    return matchesSearch && matchesCategoria;
  });

  // Check if current category has subcategories
  const hasSubcategories = selectedCategoria === 'libros';
  const subcategories = hasSubcategories ? grados : [];

  // Navigation handlers
  const handleSelectCategoria = (categoriaId) => {
    setSelectedCategoria(categoriaId);
    setSelectedSubcategoria(null);
  };

  const handleSelectSubcategoria = (subcategoriaId) => {
    setSelectedSubcategoria(subcategoriaId);
  };

  const handleGoBack = () => {
    if (selectedSubcategoria) {
      setSelectedSubcategoria(null);
    } else {
      setSelectedCategoria(null);
    }
  };

  const handleGoHome = () => {
    setSelectedCategoria(null);
    setSelectedSubcategoria(null);
  };

  const handleAddToCart = (product) => {
    if (product.cantidad_inventario <= 0) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    setAddedItems(prev => ({ ...prev, [product.libro_id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.libro_id]: false }));
    }, 1500);
  };

  const isInCart = (libroId) => items.some(item => item.libro_id === libroId);
  const getCartQuantity = (libroId) => {
    const item = items.find(item => item.libro_id === libroId);
    return item ? item.quantity : 0;
  };

  const getStockStatus = (cantidad) => {
    if (cantidad <= 0) return { label: 'Agotado', color: 'destructive', canBuy: false };
    if (cantidad < 10) return { label: `Solo ${cantidad}`, color: 'warning', canBuy: true };
    return { label: 'Disponible', color: 'success', canBuy: true };
  };

  const getCategoryInfo = (categoriaId) => {
    const cat = categorias.find(c => c.categoria_id === categoriaId);
    return cat || { nombre: categoriaId, icono: categoryIcons[categoriaId] || '📦' };
  };

  // Get current navigation title
  const getCurrentTitle = () => {
    if (selectedSubcategoria) {
      const grado = grados.find(g => g.id === selectedSubcategoria);
      return grado?.nombre || selectedSubcategoria;
    }
    if (selectedCategoria) {
      const cat = getCategoryInfo(selectedCategoria);
      return `${cat.icono} ${cat.nombre}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold">
                {storeInfo?.nombre || 'Unatienda'}
              </h1>
              <p className="text-muted-foreground">
                {storeInfo?.descripcion || 'Tu tienda de confianza'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mb-6">
          {/* Navigation Pills - Single Row */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Home/All button - always first */}
            <Button
              variant={!selectedCategoria ? 'default' : 'outline'}
              size="sm"
              onClick={handleGoHome}
              className="rounded-full gap-1.5"
            >
              <Home className="h-4 w-4" />
              Todos
            </Button>

            {/* Back button - only when in a category/subcategory */}
            {(selectedCategoria || selectedSubcategoria) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="rounded-full gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Regresar
              </Button>
            )}

            {/* Separator when in category */}
            {selectedCategoria && (
              <span className="text-muted-foreground/50 mx-1">|</span>
            )}

            {/* Current category title or category pills */}
            {!selectedCategoria ? (
              // Main categories
              categorias.map((cat) => (
                <Button
                  key={cat.categoria_id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCategoria(cat.categoria_id)}
                  className="rounded-full"
                >
                  <span className="mr-1.5">{cat.icono}</span>
                  {cat.nombre}
                </Button>
              ))
            ) : hasSubcategories && !selectedSubcategoria ? (
              // Subcategories (grades for books)
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSelectedSubcategoria(null)}
                  className="rounded-full"
                >
                  Todos los grados
                </Button>
                {subcategories.map((sub) => (
                  <Button
                    key={sub.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectSubcategoria(sub.id)}
                    className="rounded-full"
                  >
                    {sub.nombre}
                  </Button>
                ))}
              </>
            ) : hasSubcategories && selectedSubcategoria ? (
              // When subcategory is selected, show siblings for easy switching
              subcategories.map((sub) => (
                <Button
                  key={sub.id}
                  variant={selectedSubcategoria === sub.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectSubcategoria(sub.id)}
                  className="rounded-full"
                >
                  {sub.nombre}
                </Button>
              ))
            ) : null}
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        </p>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.cantidad_inventario);
              const inCart = isInCart(product.libro_id);
              const cartQty = getCartQuantity(product.libro_id);
              const justAdded = addedItems[product.libro_id];
              const catInfo = getCategoryInfo(product.categoria);
              
              return (
                <div
                  key={product.libro_id}
                  className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  {/* Product Image */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center overflow-hidden">
                    {product.imagen_url ? (
                      <img 
                        src={product.imagen_url} 
                        alt={product.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-5xl">{catInfo.icono}</span>
                    )}
                    
                    {/* Quick Add Button (overlay) */}
                    {stockStatus.canBuy && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          size="lg"
                          className="rounded-full shadow-lg"
                          onClick={() => handleAddToCart(product)}
                        >
                          {justAdded ? (
                            <><Check className="h-4 w-4 mr-2" /> Agregado</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-2" /> Agregar</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={stockStatus.color === 'success' ? 'default' : 
                               stockStatus.color === 'warning' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {stockStatus.label}
                    </Badge>
                  </div>

                  {/* Cart Quantity Badge */}
                  {inCart && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="default" className="bg-primary text-xs">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {cartQty}
                      </Badge>
                    </div>
                  )}

                  {/* Requires Preparation Badge */}
                  {product.requiere_preparacion && (
                    <div className="absolute top-12 right-3">
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Preparación
                      </Badge>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-5">
                    {/* Category & Grade Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        <span className="mr-1">{catInfo.icono}</span>
                        {catInfo.nombre}
                      </Badge>
                      {product.categoria === 'libros' && product.grado && (
                        <Badge variant="secondary" className="text-xs">
                          {grados.find(g => g.id === product.grado)?.nombre || product.grado}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.nombre}
                    </h3>
                    
                    {/* Description */}
                    {product.descripcion && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.descripcion}
                      </p>
                    )}
                    
                    {/* Price & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          ${product.precio?.toFixed(2)}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant={inCart ? "secondary" : "default"}
                        className="rounded-full"
                        onClick={() => inCart ? openCart() : handleAddToCart(product)}
                        disabled={!stockStatus.canBuy}
                      >
                        {inCart ? (
                          <><ShoppingCart className="h-4 w-4 mr-1" /> Ver</>
                        ) : (
                          <><Plus className="h-4 w-4 mr-1" /> Agregar</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
