import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { STORE_ENDPOINTS, buildUrl } from '@/config/api';
import {
  Search,
  ShoppingCart,
  Loader2,
  Store,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  Home,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  Lock,
  User,
  AlertCircle,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import FloatingStoreNav from '@/components/store/FloatingStoreNav';
import CategoryLanding from '@/components/store/CategoryLanding';
import LibrosPorEstudiante from '@/components/store/LibrosPorEstudiante';
import TextbookOrderPage from '@/modules/account/orders/TextbookOrderPage';

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
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { addItem, items, openCart } = useCart();
  
  // Main state
  const [activeView, setActiveView] = useState('public'); // 'public' or 'private'
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Private catalog state
  const [catalogoPrivadoAcceso, setCatalogoPrivadoAcceso] = useState(null);
  const [productosPrivados, setProductosPrivados] = useState([]);
  const [loadingPrivado, setLoadingPrivado] = useState(false);
  const [selectedGradoPrivado, setSelectedGradoPrivado] = useState('');
  const [selectedMateriaPrivado, setSelectedMateriaPrivado] = useState('');
  
  // Hierarchical navigation state (for public catalog)
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  const [showLandingView, setShowLandingView] = useState(true);
  
  const [addedItems, setAddedItems] = useState({});

  // Read category and search from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const search = params.get('search');
    const tab = params.get('tab');
    
    if (categoria) setSelectedCategoria(categoria);
    if (search) setSearchTerm(decodeURIComponent(search));
    if (tab === 'private') setActiveView('privado');
    
    // Clean up URL
    if (categoria || search || tab) {
      window.history.replaceState({}, '', '/unatienda');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Check private catalog access when user changes
  useEffect(() => {
    if (isAuthenticated && token) {
      checkPrivateCatalogAccess();
    } else {
      setCatalogoPrivadoAcceso(null);
    }
  }, [isAuthenticated, token]);

  // Fetch private products when access is granted and view changes
  useEffect(() => {
    if (activeView === 'privado' && catalogoPrivadoAcceso?.tiene_acceso) {
      fetchPrivateProducts();
    }
  }, [activeView, catalogoPrivadoAcceso, selectedGradoPrivado, selectedMateriaPrivado]);

  const fetchData = async () => {
    try {
      const [productsRes, storeRes, categoriasRes, gradosRes, materiasRes] = await Promise.all([
        axios.get(`${API_URL}/api/store/products`),
        axios.get(`${API_URL}/api/platform-store`),
        axios.get(buildUrl(STORE_ENDPOINTS.categories)),
        axios.get(`${API_URL}/api/store/products/grades`),
        axios.get(`${API_URL}/api/store/products/subjects`)
      ]);
      
      // Filter only public products (not private catalog)
      const allProducts = productsRes.data || [];
      const publicProducts = allProducts.filter(p => !p.es_catalogo_privado);
      setProducts(publicProducts);
      setStoreInfo(storeRes.data);
      setCategorias(categoriasRes.data || []);
      setGrados(gradosRes.data.grados || []);
      setMaterias(materiasRes.data.materias || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPrivateCatalogAccess = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/store/catalogo-privado/acceso`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogoPrivadoAcceso(response.data);
    } catch (error) {
      console.error('Error checking private catalog access:', error);
      setCatalogoPrivadoAcceso({ tiene_acceso: false, estudiantes: [], grados: [] });
    }
  };

  const fetchPrivateProducts = async () => {
    if (!token) return;
    
    setLoadingPrivado(true);
    try {
      let url = `${API_URL}/api/store/catalogo-privado/productos?limit=200`;
      if (selectedGradoPrivado) url += `&grado=${encodeURIComponent(selectedGradoPrivado)}`;
      if (selectedMateriaPrivado) url += `&materia=${encodeURIComponent(selectedMateriaPrivado)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductosPrivados(response.data.productos || []);
    } catch (error) {
      console.error('Error fetching private products:', error);
      toast.error('Error al cargar catálogo privado');
    } finally {
      setLoadingPrivado(false);
    }
  };

  // Filter products based on hierarchical selection (public catalog)
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedCategoria) return matchesSearch;
    
    const matchesCategoria = product.categoria === selectedCategoria;
    
    if (selectedSubcategoria && selectedCategoria === 'libros') {
      const matchesGrado = product.grado === selectedSubcategoria || 
        product.grados?.includes(selectedSubcategoria);
      return matchesSearch && matchesCategoria && matchesGrado;
    }
    
    return matchesSearch && matchesCategoria;
  });

  // Filter private products
  const filteredPrivateProducts = productosPrivados.filter(product => {
    if (!searchTerm) return true;
    return (
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.editorial?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Navigation helpers
  const hasSubcategories = selectedCategoria === 'libros';
  const subcategories = hasSubcategories ? grados.map(g => ({ id: g, nombre: g })) : [];
  const shouldShowLanding = selectedCategoria && !selectedSubcategoria && showLandingView && !searchTerm;

  const handleSelectCategoria = (categoriaId) => {
    setSelectedCategoria(categoriaId);
    setSelectedSubcategoria(null);
    setShowLandingView(true);
  };

  const handleSelectSubcategoria = (subcategoriaId) => {
    setSelectedSubcategoria(subcategoriaId);
    setShowLandingView(false);
  };

  const handleViewAllProducts = () => setShowLandingView(false);

  const handleGoBack = () => {
    if (!showLandingView && selectedCategoria && !selectedSubcategoria) {
      setShowLandingView(true);
    } else if (selectedSubcategoria) {
      setSelectedSubcategoria(null);
      setShowLandingView(true);
    } else {
      setSelectedCategoria(null);
      setShowLandingView(true);
    }
  };

  const handleGoHome = () => {
    setSelectedCategoria(null);
    setSelectedSubcategoria(null);
    setShowLandingView(true);
  };

  const handleAddToCart = (product) => {
    if (product.cantidad_inventario <= 0 && !product.es_catalogo_privado) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    setAddedItems(prev => ({ ...prev, [product.libro_id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.libro_id]: false }));
    }, 1500);
    toast.success('Producto agregado al carrito');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Product Card Component
  const ProductCard = ({ product, isPrivate = false }) => {
    const stockStatus = getStockStatus(product.cantidad_inventario);
    const inCart = isInCart(product.libro_id);
    const cartQty = getCartQuantity(product.libro_id);
    const justAdded = addedItems[product.libro_id];
    const catInfo = isPrivate ? { nombre: 'Libro de Texto', icono: '📚' } : getCategoryInfo(product.categoria);
    
    return (
      <div
        data-testid={`product-card-${product.libro_id}`}
        className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => navigate(isPrivate ? `/unatienda/libro/${product.libro_id}` : `/unatienda/producto/${product.libro_id}`)}
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
        </div>
        
        {/* Private Badge */}
        {isPrivate && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-purple-600 text-xs">
              <GraduationCap className="h-3 w-3 mr-1" />
              PCA
            </Badge>
          </div>
        )}

        {/* Stock Badge */}
        {!isPrivate && (
          <div className="absolute top-3 right-3">
            <Badge 
              variant={stockStatus.color === 'success' ? 'default' : 
                       stockStatus.color === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {stockStatus.label}
            </Badge>
          </div>
        )}

        {/* Cart Quantity Badge */}
        {inCart && (
          <div className="absolute top-3 right-3">
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
            {isPrivate ? (
              <>
                <Badge variant="secondary" className="text-xs">
                  {product.grado}
                </Badge>
                {product.materia && (
                  <Badge variant="outline" className="text-xs">
                    {product.materia}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">{catInfo.icono}</span>
                  {catInfo.nombre}
                </Badge>
                {product.categoria === 'libros' && product.grado && (
                  <Badge variant="secondary" className="text-xs">
                    {product.grado}
                  </Badge>
                )}
              </>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.nombre}
          </h3>
          
          {/* Description or Editorial */}
          {isPrivate && product.editorial ? (
            <p className="text-sm text-muted-foreground mb-3">
              Editorial: {product.editorial}
            </p>
          ) : product.descripcion && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.descripcion}
            </p>
          )}
          
          {/* Price & Action */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div>
              {product.precio_oferta ? (
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${product.precio_oferta.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground line-through">
                    ${product.precio?.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">
                  ${product.precio?.toFixed(2)}
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                inCart ? openCart() : handleAddToCart(product);
              }}
              disabled={!isPrivate && !stockStatus.canBuy}
            >
              {justAdded ? (
                <><Check className="h-4 w-4 mr-1" /> Listo</>
              ) : inCart ? (
                <><ShoppingCart className="h-4 w-4 mr-1" /> Ver</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Agregar</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Students Info Section (for private catalog) - simplified version
  const StudentsInfo = () => {
    if (!catalogoPrivadoAcceso?.estudiantes?.length) return null;

    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <span className="font-semibold">Tus Estudiantes Vinculados:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {catalogoPrivadoAcceso.estudiantes.map((est) => (
            <Badge 
              key={est.sync_id} 
              variant="secondary"
              className="cursor-pointer hover:bg-purple-100"
              onClick={() => setSelectedGradoPrivado(est.grado)}
            >
              {est.nombre} - {est.grado}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

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

        {/* Students Info - Show if user has linked students */}
        {catalogoPrivadoAcceso?.tiene_acceso && catalogoPrivadoAcceso?.estudiantes?.length > 0 && (
          <StudentsInfo />
        )}

        {/* Category Navigation - includes private catalog as a category for authorized users */}
        <div className="mb-6" data-category-nav>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              variant={!selectedCategoria ? 'default' : 'outline'}
              size="icon"
              onClick={handleGoHome}
              className="h-9 w-9 rounded-full"
              title="Inicio - Todas las categorías"
            >
              <Home className="h-4 w-4" />
            </Button>

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

            {selectedCategoria && (
              <span className="text-muted-foreground/50 mx-1">|</span>
            )}

            {!selectedCategoria ? (
              <>
                {categorias.map((cat) => (
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
                ))}
                {/* Show "Textos Escolares" category only for users with access */}
                {catalogoPrivadoAcceso?.tiene_acceso && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveView('privado')}
                    className="rounded-full border-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700"
                  >
                    <GraduationCap className="h-4 w-4 mr-1.5 text-purple-600" />
                    <span className="text-purple-700 dark:text-purple-300">Textos Escolares</span>
                    <Badge variant="secondary" className="ml-1.5 text-xs bg-purple-200 dark:bg-purple-800">
                      {catalogoPrivadoAcceso.estudiantes?.length || 0}
                    </Badge>
                  </Button>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold text-sm flex items-center gap-1">
                  {getCategoryInfo(selectedCategoria).icono} {getCategoryInfo(selectedCategoria).nombre}
                </span>
                {!showLandingView && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredProducts.length} productos
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content - Public or Private */}
        {activeView === 'privado' && catalogoPrivadoAcceso?.tiene_acceso ? (
          <>
            {/* Private Catalog Header */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="font-bold">Textos Escolares</h3>
                    <p className="text-sm text-muted-foreground">
                      Catálogo exclusivo para estudiantes vinculados
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveView('publico')}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Ver tienda general
                </Button>
              </div>
            </div>

            {/* Private Catalog Tabs */}
            <Tabs defaultValue="mis-pedidos" className="mb-6">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="mis-pedidos" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Mis Pedidos
                </TabsTrigger>
                <TabsTrigger value="por-estudiante" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Por Estudiante
                </TabsTrigger>
                <TabsTrigger value="todos" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Catálogo
                </TabsTrigger>
              </TabsList>
              
              {/* Tab: My Textbook Orders */}
              <TabsContent value="mis-pedidos" className="mt-6">
                <TextbookOrderPage embedded={true} />
              </TabsContent>
              
              {/* Tab: Books by Student */}
              <TabsContent value="por-estudiante" className="mt-6">
                <LibrosPorEstudiante 
                  onNavigateToBook={(libroId) => navigate(`/unatienda/libro/${libroId}`)}
                />
              </TabsContent>
              
              {/* Tab: All Books Grid */}
              <TabsContent value="todos" className="mt-6">
                {/* Students badges */}
                {catalogoPrivadoAcceso?.estudiantes?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Filtrar por estudiante:</span>
                    {catalogoPrivadoAcceso.estudiantes.map((est) => (
                      <Badge 
                        key={est.sync_id} 
                        variant={selectedGradoPrivado === est.grado ? "default" : "secondary"}
                        className="cursor-pointer hover:bg-purple-100"
                        onClick={() => setSelectedGradoPrivado(selectedGradoPrivado === est.grado ? '' : est.grado)}
                      >
                        {est.nombre} - {est.grado}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Filters for Private Catalog */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <select
                    value={selectedGradoPrivado}
                    onChange={(e) => setSelectedGradoPrivado(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="">Todos los grados</option>
                    {catalogoPrivadoAcceso?.grados?.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMateriaPrivado}
                    onChange={(e) => setSelectedMateriaPrivado(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="">Todas las materias</option>
                    {materias.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  
                  {(selectedGradoPrivado || selectedMateriaPrivado) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedGradoPrivado('');
                        setSelectedMateriaPrivado('');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>

                {/* Private Products Count */}
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredPrivateProducts.length} libro{filteredPrivateProducts.length !== 1 ? 's' : ''} encontrado{filteredPrivateProducts.length !== 1 ? 's' : ''}
                </p>

                {/* Private Products Grid */}
                {loadingPrivado ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredPrivateProducts.length === 0 ? (
                  <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No se encontraron libros</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Intenta con otros filtros o busca por nombre
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPrivateProducts.map((product) => (
                      <ProductCard key={product.libro_id} product={product} isPrivate />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <>
            {/* Public Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.libro_id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Navigation Component */}
      <FloatingStoreNav
        categorias={categorias}
        grados={grados.map(g => ({ id: g, nombre: g }))}
        selectedCategoria={selectedCategoria}
        selectedSubcategoria={selectedSubcategoria}
        onSelectCategoria={handleSelectCategoria}
        onSelectSubcategoria={handleSelectSubcategoria}
        onGoHome={handleGoHome}
        onGoBack={handleGoBack}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
}
