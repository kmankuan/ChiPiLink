/**
 * Private Book Detail - Product detail page for the private catalog
 * Solo accesible para usuarios con estudiantes vinculados
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BookOpen,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Loader2,
  GraduationCap,
  Building2,
  Hash,
  Tag,
  Lock,
  AlertCircle,
  Users
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PrivateBookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { addItem, items, openCart } = useCart();
  
  const [book, setBook] = useState(null);
  const [acceso, setAcceso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('You must log in to view this product');
      navigate('/login', { state: { from: `/unatienda/book/${bookId}` } });
      return;
    }
    fetchBook();
  }, [bookId, isAuthenticated, token]);

  const fetchBook = async () => {
    try {
      const [bookRes, accesoRes] = await Promise.all([
        axios.get(`${API_URL}/api/store/private-catalog/products/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/store/private-catalog/access`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setBook(bookRes.data);
      setAcceso(accesoRes.data);
    } catch (error) {
      console.error('Error fetching book:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have access to this catalog');
      } else if (error.response?.status === 404) {
        toast.error('Book not found');
      } else {
        toast.error('Error loading book');
      }
    } finally {
      setLoading(false);
    }
  };

  const isInCart = () => items.some(item => item.book_id === book?.book_id);
  const getCartQuantity = () => {
    const item = items.find(item => item.book_id === book?.book_id);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = () => {
    if (!book) return;
    
    const productToAdd = {
      ...book,
      is_private_catalog: true,
      inventory_quantity: 999
    };
    
    addItem(productToAdd, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const incrementQuantity = () => {
    setQuantity(q => Math.min(q + 1, 10)); // Max 10 per order
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  // Check if this book is for any of the user's linked students
  const getMatchingStudents = () => {
    if (!acceso?.estudiantes || !libro?.grade) return [];
    return acceso.estudiantes.filter(e => e.grade === libro.grade);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!acceso?.tiene_acceso) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 w-fit mx-auto mb-6">
          <Lock className="h-12 w-12 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Acceso Restringido</h2>
        <p className="text-muted-foreground mb-6">
          Este catálogo es exclusivo para acudientes con estudiantes vinculados.
          Vincula a tu estudiante para acceder a los libros de texto.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/unatienda')}>
            Ir a Unatienda
          </Button>
          <Button onClick={() => navigate('/mi-cuenta')}>
            Vincular Estudiante
          </Button>
        </div>
      </div>
    );
  }

  if (!libro) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Libro no encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/unatienda?tab=privado')}>
          Volver al Catálogo
        </Button>
      </div>
    );
  }

  const matchingStudents = getMatchingStudents();
  const inCart = isInCart();
  const cartQty = getCartQuantity();
  const finalPrice = libro.sale_price || libro.price;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Book Image */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center overflow-hidden border">
              {libro.image_url ? (
                <img 
                  src={libro.image_url} 
                  alt={libro.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <BookOpen className="h-24 w-24 text-purple-400 mx-auto mb-4" />
                  <p className="text-purple-600 font-medium">{libro.subject || 'Libro de Texto'}</p>
                </div>
              )}
            </div>
            
            {/* Private Catalog Badge */}
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Lock className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700 dark:text-purple-300">
                Catálogo Exclusivo PCA
              </span>
            </div>
          </div>

          {/* Book Details */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <GraduationCap className="h-3 w-3 mr-1" />
                {libro.grade}
              </Badge>
              {libro.subject && (
                <Badge variant="secondary">
                  {libro.subject}
                </Badge>
              )}
              {libro.featured && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  Destacado
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{libro.name}</h1>
              {libro.publisher && (
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {libro.publisher}
                </p>
              )}
            </div>

            {/* Description */}
            {libro.description && (
              <p className="text-muted-foreground">{libro.description}</p>
            )}

            {/* Codes */}
            <div className="flex flex-wrap gap-4 text-sm">
              {libro.code && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>Código: {libro.code}</span>
                </div>
              )}
              {libro.isbn && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>ISBN: {libro.isbn}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Matching Students Info */}
            {matchingStudents.length > 0 && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300 mb-1">
                        Este libro es para:
                      </p>
                      <div className="space-y-1">
                        {matchingStudents.map(student => (
                          <p key={student.sync_id} className="text-sm text-green-600 dark:text-green-400">
                            {student.nombre} - {student.grade}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary">
                  ${finalPrice?.toFixed(2)}
                </span>
                {libro.sale_price && libro.sale_price < libro.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${libro.price?.toFixed(2)}
                  </span>
                )}
              </div>
              {libro.sale_price && libro.sale_price < libro.price && (
                <Badge className="bg-green-100 text-green-700">
                  Ahorras ${(libro.price - libro.sale_price).toFixed(2)}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={incrementQuantity}
                    disabled={quantity >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* In Cart Indicator */}
              {inCart && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>{cartQty} en tu carrito</span>
                </div>
              )}

              {/* Add to Cart Button */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                  disabled={added}
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5" />
                      Agregado
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Agregar al Carrito
                    </>
                  )}
                </Button>
                
                {inCart && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={openCart}
                    className="gap-2"
                  >
                    Ver Carrito
                  </Button>
                )}
              </div>
            </div>

            {/* Info Note */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Información de Compra</p>
                    <p>
                      Los libros del catálogo privado se procesan como pre-orden. 
                      Te contactaremos para coordinar la entrega y el pago una vez confirmado el pedido.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
