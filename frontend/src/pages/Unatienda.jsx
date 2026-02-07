/**
 * Unatienda — Store Main Page (Orchestrator)
 * Slim coordinator that delegates to focused sub-components:
 *   - PublicCatalog: categories, search, product grid
 *   - SchoolTextbooksView: student selection + textbook status
 *   - TextbookOrderView: textbook order flow for a student
 *
 * Refactored from 1,927 lines → ~320 lines.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import axios from 'axios';
import { buildUrl, STORE_ENDPOINTS } from '@/config/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, GraduationCap, Home, Loader2, Search, Store
} from 'lucide-react';
import FloatingStoreNav from '@/components/store/FloatingStoreNav';
import SchoolTextbooksView from '@/modules/unatienda/components/SchoolTextbooksView';
import TextbookOrderView from '@/modules/unatienda/components/TextbookOrderView';
import ProductCard from '@/modules/unatienda/components/ProductCard';
import { categoryIcons } from '@/modules/unatienda/constants/translations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Unatienda() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { addItem, items, openCart } = useCart();

  // Main state
  const [activeView, setActiveView] = useState('public');
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeConfig, setStoreConfig] = useState(null);
  const [privateCatalogAccess, setPrivateCatalogAccess] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showLandingView, setShowLandingView] = useState(true);
  const [addedItems, setAddedItems] = useState({});
  const [urlParams, setUrlParams] = useState(null);

  // ---- URL Parameter Handling ----

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const category = params.get('category');
    const search = params.get('search');
    const tab = params.get('tab');
    const studentId = params.get('student');

    if (category === 'textbooks' && !studentId) {
      setActiveView('textbooks');
      window.history.replaceState({}, '', '/unatienda');
    } else if (tab === 'textbooks') {
      setActiveView('textbooks');
      window.history.replaceState({}, '', '/unatienda');
    } else if (category === 'textbooks' && studentId) {
      setUrlParams({ category, studentId });
    }

    if (categoria) setSelectedCategory(categoria);
    if (search) setSearchTerm(decodeURIComponent(search));

    if (categoria || search) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('categoria');
      newUrl.searchParams.delete('search');
      window.history.replaceState({}, '', newUrl.pathname);
    }
  }, []);

  useEffect(() => {
    if (!urlParams || !privateCatalogAccess) return;
    const { category, studentId } = urlParams;

    if (category === 'textbooks' && studentId) {
      const student = privateCatalogAccess.students?.find(
        s => s.student_id === studentId || s.sync_id === studentId ||
          s.student_id?.includes(studentId) || studentId?.includes(s.student_id)
      );

      if (student && privateCatalogAccess.has_access) {
        setSelectedStudent(student);
        setActiveView('textbook-order');
      } else {
        setActiveView('textbooks');
      }

      window.history.replaceState({}, '', '/unatienda');
      setUrlParams(null);
    }
  }, [urlParams, privateCatalogAccess]);

  // ---- Data Loading ----

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      checkPrivateCatalogAccess();
    } else {
      setPrivateCatalogAccess(null);
    }
  }, [isAuthenticated, token]);

  const fetchData = async () => {
    try {
      const [productsRes, storeRes, categoriesRes, gradesRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/store/products`),
        axios.get(`${API_URL}/api/platform-store`),
        axios.get(buildUrl(STORE_ENDPOINTS.categories)),
        axios.get(`${API_URL}/api/store/products/grades`),
        axios.get(`${API_URL}/api/store/store-config/public`)
      ]);

      const allProducts = productsRes.data || [];
      setProducts(allProducts.filter(p => !p.is_private_catalog));
      setStoreInfo(storeRes.data);
      setCategories(categoriesRes.data || []);
      setGrades(gradesRes.data.grades || []);
      setStoreConfig(configRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPrivateCatalogAccess = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/store/private-catalog/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrivateCatalogAccess(response.data);
    } catch (error) {
      console.error('Error checking private catalog access:', error);
      setPrivateCatalogAccess({ has_access: false, students: [], grades: [] });
    }
  };

  // ---- Product Filtering ----

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!selectedCategory) return matchesSearch;
    const matchesCategory = product.categoria === selectedCategory;

    if (selectedSubcategory && (selectedCategory === 'books' || selectedCategory === 'libros')) {
      const matchesGrade = product.grade === selectedSubcategory || product.grades?.includes(selectedSubcategory);
      return matchesSearch && matchesCategory && matchesGrade;
    }

    return matchesSearch && matchesCategory;
  });

  // ---- Navigation Helpers ----

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setShowLandingView(true);
  };

  const handleSelectSubcategoria = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
    setShowLandingView(false);
  };

  const handleGoBack = () => {
    if (!showLandingView && selectedCategory && !selectedSubcategory) {
      setShowLandingView(true);
    } else if (selectedSubcategory) {
      setSelectedSubcategory(null);
      setShowLandingView(true);
    } else {
      setSelectedCategory(null);
      setShowLandingView(true);
    }
  };

  const handleGoHome = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setShowLandingView(true);
  };

  // ---- Cart Helpers ----

  const handleAddToCart = (product) => {
    if (product.inventory_quantity <= 0 && !product.is_private_catalog) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    setAddedItems(prev => ({ ...prev, [product.book_id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.book_id]: false }));
    }, 1500);
    toast.success('Producto agregado al carrito');
  };

  const isInCart = (id) => items.some(item => item.book_id === id);
  const getCartQuantity = (id) => {
    const item = items.find(item => item.book_id === id);
    return item ? item.quantity : 0;
  };

  const getStockStatus = (qty) => {
    if (qty <= 0) return { label: 'Agotado', color: 'destructive', canBuy: false };
    if (qty < 10) return { label: `Solo ${qty}`, color: 'warning', canBuy: true };
    return { label: 'Disponible', color: 'success', canBuy: true };
  };

  const getCategoryInfo = (categoryId) => {
    const cat = categories.find(c => c.category_id === categoryId);
    return cat || { name: categoryId, icono: categoryIcons[categoryId] || '📦' };
  };

  // ---- Render ----

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
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-4 sm:py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 shrink-0">
                <Store className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-xl sm:text-3xl md:text-4xl font-bold truncate">
                  {storeInfo?.name || 'Unatienda'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                  {storeInfo?.description || 'Tu tienda de confianza'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Search Bar - public view only */}
        {activeView === 'public' && (
          <div className="mb-4 sm:mb-6">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11 text-sm"
              />
            </div>
          </div>
        )}

        {/* Category Navigation - public view */}
        {activeView === 'public' && (
          <div className="mb-4 sm:mb-6" data-category-nav>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size="icon"
                onClick={handleGoHome}
                className="h-9 w-9 rounded-full"
                title="Inicio - Todas las categorías"
              >
                <Home className="h-4 w-4" />
              </Button>

              {(selectedCategory || selectedSubcategory) && (
                <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full gap-1 text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                  Regresar
                </Button>
              )}

              {selectedCategory && <span className="text-muted-foreground/50 mx-1">|</span>}

              {!selectedCategory ? (
                <>
                  {categories.map((cat) => (
                    <Button key={cat.category_id} variant="outline" size="sm" onClick={() => handleSelectCategory(cat.category_id)} className="rounded-full">
                      <span className="mr-1.5">{cat.icono}</span>
                      {cat.name}
                    </Button>
                  ))}

                  {storeConfig?.textbooks_category_enabled !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveView('textbooks')}
                      className="rounded-full border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
                      data-testid="textbooks-category-btn"
                    >
                      <GraduationCap className="h-4 w-4 mr-1.5" />
                      {storeConfig?.textbooks_category_label?.[i18n?.language] || 'School Textbooks'}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold text-sm flex items-center gap-1">
                    {getCategoryInfo(selectedCategory).icono} {getCategoryInfo(selectedCategory).name}
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
        )}

        {/* Content Router */}
        {activeView === 'textbooks' ? (
          <SchoolTextbooksView
            isAuthenticated={isAuthenticated}
            privateCatalogAccess={privateCatalogAccess}
            storeConfig={storeConfig}
            onSelectStudent={(student) => {
              setSelectedStudent(student);
              setActiveView('textbook-order');
            }}
            onLinkStudent={() => navigate('/my-account?tab=students')}
            onBack={() => setActiveView('public')}
          />
        ) : activeView === 'textbook-order' && selectedStudent ? (
          <TextbookOrderView
            privateCatalogAccess={privateCatalogAccess}
            selectedStudentId={selectedStudent.student_id}
            onBack={() => {
              setSelectedStudent(null);
              setActiveView('textbooks');
            }}
            onRefreshAccess={checkPrivateCatalogAccess}
          />
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.inventory_quantity);
                  const catInfo = getCategoryInfo(product.categoria);
                  return (
                    <ProductCard
                      key={product.book_id}
                      product={product}
                      stockStatus={stockStatus}
                      inCart={isInCart(product.book_id)}
                      cartQty={getCartQuantity(product.book_id)}
                      justAdded={addedItems[product.book_id]}
                      categoryInfo={catInfo}
                      canBuy={stockStatus.canBuy}
                      onCardClick={(p) => navigate(`/unatienda/producto/${p.book_id}`)}
                      onAddToCart={handleAddToCart}
                      onOpenCart={openCart}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <FloatingStoreNav
        categories={categories}
        grades={grades.map(g => ({ id: g, name: g }))}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategoria={handleSelectCategory}
        onSelectSubcategoria={handleSelectSubcategoria}
        onGoHome={handleGoHome}
        onGoBack={handleGoBack}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
}
