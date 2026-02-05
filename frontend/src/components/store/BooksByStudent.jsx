/**
 * BooksByStudent - View of books grouped by linked student
 * Shows textbooks available for each linked student based on their grade
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import axios from 'axios';
import {
  GraduationCap,
  BookOpen,
  ShoppingCart,
  Check,
  Plus,
  Loader2,
  User,
  Package,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BooksByStudent({ onNavigateToBook }) {
  const { token } = useAuth();
  const { addItem, items } = useCart();
  const navigate = useNavigate();
  
  const [resumen, setResumen] = useState([]);
  const [productosPorGrado, setProductosPorGrado] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingGrados, setLoadingGrados] = useState({});
  const [addingAll, setAddingAll] = useState({});

  useEffect(() => {
    fetchResumen();
  }, [token]);

  const fetchResumen = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/store/private-catalog/resumen`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResumen(response.data.resumen || []);
      
      // Fetch products for each grade
      const grados = [...new Set(response.data.resumen.map(r => r.estudiante.grade))];
      for (const grado of grados) {
        fetchProductosPorGrado(grado);
      }
    } catch (error) {
      console.error('Error fetching resumen:', error);
      toast.error('Error al cargar el resumen de libros');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductosPorGrado = async (grado) => {
    setLoadingGrados(prev => ({ ...prev, [grado]: true }));
    try {
      const response = await axios.get(
        `${API_URL}/api/store/private-catalog/por-grado/${encodeURIComponent(grado)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductosPorGrado(prev => ({
        ...prev,
        [grado]: response.data
      }));
    } catch (error) {
      console.error('Error fetching productos por grado:', error);
    } finally {
      setLoadingGrados(prev => ({ ...prev, [grado]: false }));
    }
  };

  const isInCart = (libroId) => items.some(item => item.book_id === libroId);
  
  const getBooksInCartCount = (grado) => {
    const gradoProducts = productosPorGrado[grado]?.productos || [];
    return gradoProducts.filter(p => isInCart(p.book_id)).length;
  };

  const handleAddAllToCart = async (estudiante) => {
    const grado = estudiante.grade;
    const productos = productosPorGrado[grado]?.productos || [];
    
    if (productos.length === 0) {
      toast.error('No hay libros disponibles para este grado');
      return;
    }

    setAddingAll(prev => ({ ...prev, [estudiante.sync_id]: true }));
    
    let added = 0;
    for (const producto of productos) {
      if (!isInCart(producto.book_id)) {
        const productToAdd = {
          ...producto,
          is_private_catalog: true,
          inventory_quantity: 999
        };
        addItem(productToAdd, 1);
        added++;
      }
    }

    setTimeout(() => {
      setAddingAll(prev => ({ ...prev, [estudiante.sync_id]: false }));
      if (added > 0) {
        toast.success(`${added} libro${added > 1 ? 's' : ''} agregado${added > 1 ? 's' : ''} al carrito para ${estudiante.nombre}`);
      } else {
        toast.info('Todos los libros ya están en el carrito');
      }
    }, 500);
  };

  const handleAddSingleBook = (producto) => {
    if (isInCart(producto.book_id)) {
      toast.info('Este libro ya está en el carrito');
      return;
    }
    
    const productToAdd = {
      ...producto,
      is_private_catalog: true,
      inventory_quantity: 999
    };
    addItem(productToAdd, 1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (resumen.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No hay estudiantes vinculados</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vincula a tus estudiantes para ver los libros que necesitan
          </p>
          <Button variant="outline" onClick={() => navigate('/mi-cuenta?tab=exclusive')}>
            Vincular Estudiante
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Libros por Estudiante
          </h2>
          <p className="text-muted-foreground">
            Encuentra rápidamente todos los libros que necesita cada estudiante
          </p>
        </div>
      </div>

      {/* Students Accordion */}
      <Accordion type="multiple" defaultValue={resumen.map(r => r.estudiante.sync_id)} className="space-y-4">
        {resumen.map(({ estudiante, productos_disponibles, total_estimado }) => {
          const grado = estudiante.grade;
          const gradoData = productosPorGrado[grado];
          const productos = gradoData?.productos || [];
          const isLoadingGrado = loadingGrados[grado];
          const booksInCart = getBooksInCartCount(grado);
          const allInCart = booksInCart === productos.length && productos.length > 0;
          const isAdding = addingAll[estudiante.sync_id];

          return (
            <AccordionItem
              key={estudiante.sync_id}
              value={estudiante.sync_id}
              className="border rounded-xl overflow-hidden bg-card shadow-sm"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {estudiante.nombre.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{estudiante.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        <span>{estudiante.grade}</span>
                        {estudiante.seccion && (
                          <>
                            <span>•</span>
                            <span>Sección {estudiante.seccion}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      {productos_disponibles} libros
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      ${total_estimado.toFixed(2)}
                    </Badge>
                    {booksInCart > 0 && (
                      <Badge variant="outline" className="gap-1 bg-purple-50 text-purple-700 border-purple-200">
                        <ShoppingCart className="h-3 w-3" />
                        {booksInCart} en carrito
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-6 pb-6">
                <Separator className="mb-4" />
                
                {/* Add All Button */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {allInCart 
                      ? '✅ Todos los libros están en el carrito'
                      : `Agrega todos los libros de ${estudiante.nombre} con un clic`
                    }
                  </p>
                  <Button
                    onClick={() => handleAddAllToCart(estudiante)}
                    disabled={isAdding || allInCart || isLoadingGrado}
                    className="gap-2"
                    variant={allInCart ? "secondary" : "default"}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Agregando...
                      </>
                    ) : allInCart ? (
                      <>
                        <Check className="h-4 w-4" />
                        Todo Agregado
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        Agregar Todos (${total_estimado.toFixed(2)})
                      </>
                    )}
                  </Button>
                </div>

                {/* Books List */}
                {isLoadingGrado ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : productos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay libros disponibles para este grado</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {productos.map(producto => {
                      const inCart = isInCart(producto.book_id);
                      
                      return (
                        <div
                          key={producto.book_id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            inCart 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                              : 'bg-muted/30 hover:bg-muted/50 cursor-pointer'
                          }`}
                          onClick={() => !inCart && onNavigateToBook?.(producto.book_id)}
                        >
                          {/* Book Icon */}
                          <div className={`h-14 w-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            inCart ? 'bg-green-100 dark:bg-green-800' : 'bg-purple-100 dark:bg-purple-900/50'
                          }`}>
                            {inCart ? (
                              <Check className="h-6 w-6 text-green-600" />
                            ) : (
                              <BookOpen className={`h-6 w-6 ${
                                inCart ? 'text-green-600' : 'text-purple-600'
                              }`} />
                            )}
                          </div>

                          {/* Book Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{producto.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {producto.subject && (
                                <Badge variant="outline" className="text-xs">
                                  {producto.subject}
                                </Badge>
                              )}
                              {producto.publisher && (
                                <span>{producto.publisher}</span>
                              )}
                              {producto.code && (
                                <span className="text-xs">• {producto.code}</span>
                              )}
                            </div>
                          </div>

                          {/* Price & Action */}
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">
                              ${producto.price?.toFixed(2)}
                            </span>
                            
                            {inCart ? (
                              <Badge variant="secondary" className="gap-1">
                                <Check className="h-3 w-3" />
                                En carrito
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddSingleBook(producto);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                Agregar
                              </Button>
                            )}
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToBook?.(producto.book_id);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
