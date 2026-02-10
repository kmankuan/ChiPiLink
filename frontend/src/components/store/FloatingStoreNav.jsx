import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Home,
  ChevronLeft,
  Search,
  X,
  ChevronUp,
  GripVertical
} from 'lucide-react';

const categoryIcons = {
  'books': '📚',
  'snacks': '🍫',
  'bebidas': '🥤',
  'preparados': '🌭',
  'uniformes': '👕',
  'servicios': '🔧'
};

// Storage key for position
const POSITION_STORAGE_KEY = 'floating-nav-position';

// Get saved position from localStorage
const getSavedPosition = () => {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading saved position:', e);
  }
  return null;
};

// Save position to localStorage
const savePosition = (position) => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch (e) {
    console.error('Error saving position:', e);
  }
};

export default function FloatingStoreNav({
  categories = [],
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
  
  // Dragging state
  const [position, setPosition] = useState(() => getSavedPosition() || { x: 12, y: 64 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

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
        // Fallback for product detail page: show when scrolled past 100px
        setShowFloating(window.scrollY > 100);
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

  // Drag handlers
  const handleDragStart = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
      dragStartPos.current = { x: clientX, y: clientY };
      hasMoved.current = false;
      setIsDragging(true);
    }
  }, []);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;
    
    // Check if we've moved enough to consider it a drag
    const dx = Math.abs(clientX - dragStartPos.current.x);
    const dy = Math.abs(clientY - dragStartPos.current.y);
    if (dx > 5 || dy > 5) {
      hasMoved.current = true;
    }
    
    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 100);
    const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 40);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      savePosition(position);
      // Reset hasMoved after a short delay to allow click events to complete
      setTimeout(() => {
        hasMoved.current = false;
      }, 100);
    }
  }, [isDragging, position]);

  // Mouse events
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleDragEnd();
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch events
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (isDragging && e.touches[0]) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => handleDragEnd();
    
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const getCategoryInfo = (categoriaId) => {
    const cat = categories.find(c => c.category_id === categoriaId);
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
    } else if (showBackToStore) {
      // On product detail page, go back in browser history
      navigate(-1);
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

  const hasSubcategories = selectedCategoria === 'books';

  // Don't render if not scrolled enough
  if (!showFloating) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-50 transition-opacity duration-300 ${
        showFloating 
          ? 'opacity-100' 
          : 'opacity-0 pointer-events-none'
      } ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      {/* Collapsed State - Compact Button */}
      {!isExpanded && (
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-background/95 backdrop-blur-sm border shadow-md">
          {/* Drag handle */}
          <div
            className="flex items-center justify-center h-7 w-5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
            onMouseDown={(e) => {
              e.preventDefault();
              handleDragStart(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            title="Arrastra para mover"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {/* Home button (for product detail page) - goes to store main - FIRST */}
          {showBackToStore && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToStore}
              className="h-7 w-7 rounded-full"
              title="Ir a la tienda principal"
            >
              <Home className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Back arrow button - goes to previous page/category - SECOND */}
          {(showBackToStore || selectedCategoria || selectedSubcategoria) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="h-7 w-7 rounded-full"
              title="Regresar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Main toggle button - no Home icon, just text + arrow */}
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
              <span>Navegar</span>
            )}
            <ChevronUp className={`h-3 w-3 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      )}

      {/* Expanded State - Full Navigation */}
      {isExpanded && (
        <div className="bg-background/98 backdrop-blur-md border rounded-2xl shadow-xl p-3 min-w-[280px] max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header with drag handle and close button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Drag handle - always visible */}
              <div
                className="flex items-center justify-center h-6 w-5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDragStart(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                title="Arrastra para mover"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Navegar tienda</span>
            </div>
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
                {categories.map((cat) => (
                  <Button
                    key={cat.category_id}
                    variant={selectedCategoria === cat.category_id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategorySelect(cat.category_id)}
                    className="h-8 rounded-full text-xs"
                  >
                    <span className="mr-1">{cat.icono}</span>
                    {cat.name}
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
