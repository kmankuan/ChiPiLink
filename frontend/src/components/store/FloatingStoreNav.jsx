import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Home,
  ChevronLeft,
  Search,
  X,
  ChevronUp
} from 'lucide-react';

const categoryIcons = {
  'libros': '📚',
  'snacks': '🍫',
  'bebidas': '🥤',
  'preparados': '🌭',
  'uniformes': '👕',
  'servicios': '🔧'
};

export default function FloatingStoreNav({
  categorias = [],
  grados = [],
  selectedCategoria,
  selectedSubcategoria,
  onSelectCategoria,
  onSelectSubcategoria,
  onGoHome,
  onGoBack,
  searchTerm = '',
  onSearchChange,
  showBackToStore = false,
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Show floating nav when category navigation is out of view
  useEffect(() => {
    // Look for the category navigation element
    const checkVisibility = () => {
      const categoryNav = document.querySelector('[data-category-nav]');
      if (categoryNav) {
        const rect = categoryNav.getBoundingClientRect();
        // Show floating nav when category nav is completely above viewport
        setShowFloating(rect.bottom < 0);
      } else {
        // Fallback: show when scrolled past 350px (for product detail page)
        setShowFloating(window.scrollY > 350);
      }
    };

    window.addEventListener('scroll', checkVisibility);
    checkVisibility(); // Check on mount
    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Focus search input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Sync local search with parent
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const getCategoryInfo = (categoriaId) => {
    const cat = categorias.find(c => c.categoria_id === categoriaId);
    return cat || { nombre: categoriaId, icono: categoryIcons[categoriaId] || '📦' };
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCategorySelect = (categoriaId) => {
    if (onSelectCategoria) {
      onSelectCategoria(categoriaId);
      setIsExpanded(false);
    } else if (showBackToStore) {
      // If we're on product detail page, navigate to store with category
      navigate(`/unatienda?categoria=${categoriaId}`);
    }
    setIsExpanded(false);
  };

  const handleSubcategorySelect = (subcategoriaId) => {
    if (onSelectSubcategoria) {
      onSelectSubcategoria(subcategoriaId);
    }
    setIsExpanded(false);
  };

  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else if (showBackToStore) {
      // If we're on product detail page, navigate to store home
      navigate('/unatienda');
    }
    setIsExpanded(false);
  };

  const handleBackClick = () => {
    if (onGoBack) {
      onGoBack();
    }
    setIsExpanded(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(localSearch);
    }
    setIsExpanded(false);
  };

  const handleBackToStore = () => {
    navigate('/unatienda');
  };

  const hasSubcategories = selectedCategoria === 'libros';

  // Don't render if not scrolled enough
  if (!showFloating) return null;

  return (
    <div 
      ref={containerRef}
      className={`fixed top-16 left-3 z-50 transition-all duration-300 ${
        showFloating 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      {/* Collapsed State - Compact Button */}
      {!isExpanded && (
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-background/95 backdrop-blur-sm border shadow-md">
          {/* Back to Store (for product detail page) */}
          {showBackToStore && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToStore}
              className="h-7 w-7 rounded-full"
              title="Volver a la tienda"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Main toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="h-7 rounded-full gap-1.5 px-2.5 text-xs"
          >
            {selectedCategoria ? (
              <>
                <span>{getCategoryInfo(selectedCategoria).icono}</span>
                <span className="max-w-[80px] truncate">
                  {selectedSubcategoria 
                    ? grados.find(g => g.id === selectedSubcategoria)?.nombre 
                    : getCategoryInfo(selectedCategoria).nombre
                  }
                </span>
              </>
            ) : (
              <>
                <Home className="h-3.5 w-3.5" />
                <span>Navegar</span>
              </>
            )}
            <ChevronUp className={`h-3 w-3 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      )}

      {/* Expanded State - Full Navigation */}
      {isExpanded && (
        <div className="bg-background/98 backdrop-blur-md border rounded-2xl shadow-xl p-3 min-w-[280px] max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Navegar tienda</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search Bar */}
          {onSearchChange && (
            <form onSubmit={handleSearchSubmit} className="mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar productos..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="h-9 pl-8 pr-3 text-sm rounded-full"
                />
              </div>
            </form>
          )}

          {/* Category Pills */}
          <div className="space-y-2">
            {/* Main Categories or Subcategories */}
            {!selectedCategoria || !hasSubcategories ? (
              // Show main categories
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={!selectedCategoria ? 'default' : 'outline'}
                  size="icon"
                  onClick={handleHomeClick}
                  className="h-8 w-8 rounded-full"
                  title="Inicio"
                >
                  <Home className="h-4 w-4" />
                </Button>
                {categorias.map((cat) => (
                  <Button
                    key={cat.categoria_id}
                    variant={selectedCategoria === cat.categoria_id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategorySelect(cat.categoria_id)}
                    className="h-8 rounded-full text-xs"
                  >
                    <span className="mr-1">{cat.icono}</span>
                    {cat.nombre}
                  </Button>
                ))}
              </div>
            ) : (
              // Show subcategories (grades for books)
              <div className="space-y-2">
                {/* Category header with back button */}
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium flex items-center gap-1">
                    <span>{getCategoryInfo(selectedCategoria).icono}</span>
                    <span>{getCategoryInfo(selectedCategoria).nombre}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHomeClick}
                    className="h-6 text-xs gap-1 text-muted-foreground px-2"
                  >
                    <Home className="h-3 w-3" />
                    Categorías
                  </Button>
                </div>
                
                {/* Subcategory pills */}
                <div className="flex flex-wrap gap-1.5">
                  {grados.map((grado) => (
                    <Button
                      key={grado.id}
                      variant={selectedSubcategoria === grado.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSubcategorySelect(grado.id)}
                      className="h-8 rounded-full text-xs"
                    >
                      {grado.nombre}
                    </Button>
                  ))}
                </div>

                {/* Show all grades button */}
                {selectedSubcategoria && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSubcategorySelect(null)}
                    className="w-full h-7 text-xs text-muted-foreground"
                  >
                    Ver todos los grados
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick Home Button - only when in category WITHOUT subcategories view */}
          {selectedCategoria && !hasSubcategories && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHomeClick}
                className="w-full h-8 rounded-full text-xs gap-1.5 text-muted-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                Ver todas las categorías
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
