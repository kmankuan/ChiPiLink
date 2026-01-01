import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Book,
  Search,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Store,
  Filter,
  Plus,
  Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Unatienda() {
  const { t } = useTranslation();
  const { addItem, items, openCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('all');
  const [selectedMateria, setSelectedMateria] = useState('all');
  const [addedItems, setAddedItems] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, storeRes, gradosRes, materiasRes] = await Promise.all([
        axios.get(`${API_URL}/api/platform-store/products`),
        axios.get(`${API_URL}/api/platform-store`),
        axios.get(`${API_URL}/api/grados`),
        axios.get(`${API_URL}/api/materias`)
      ]);
      
      setProducts(productsRes.data.products || []);
      setStoreInfo(storeRes.data);
      setGrados(gradosRes.data.grados || []);
      setMaterias(materiasRes.data.materias || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrado = selectedGrado === 'all' || product.grado === selectedGrado;
    const matchesMateria = selectedMateria === 'all' || product.materia === selectedMateria;
    
    return matchesSearch && matchesGrado && matchesMateria;
  });

  const handleAddToCart = (product) => {
    if (product.cantidad_inventario <= 0) {
      toast.error('Producto sin stock');
      return;
    }
    addItem(product, 1);
    // Show visual feedback
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
                {storeInfo?.descripcion || 'Tu tienda de libros de texto'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 p-4 rounded-2xl bg-card border border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedGrado} onValueChange={setSelectedGrado}>
              <SelectTrigger className="w-[160px] h-11">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grados</SelectItem>
                {grados.map((grado) => (
                  <SelectItem key={grado.id} value={grado.id}>
                    {grado.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMateria} onValueChange={setSelectedMateria}>
              <SelectTrigger className="w-[160px] h-11">
                <SelectValue placeholder="Materia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las materias</SelectItem>
                {materias.map((materia) => (
                  <SelectItem key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        </p>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Book className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.cantidad_inventario);
              const inCart = isInCart(product.libro_id);
              const cartQty = getCartQuantity(product.libro_id);
              const justAdded = addedItems[product.libro_id];
              
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
                      <Book className="h-16 w-16 text-muted-foreground/30" />
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
                  
                  {/* Content */}
                  <div className="p-5">
                    {/* Category Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.grado && (
                        <Badge variant="outline" className="text-xs">
                          {grados.find(g => g.id === product.grado)?.nombre || product.grado}
                        </Badge>
                      )}
                      {product.materia && (
                        <Badge variant="secondary" className="text-xs">
                          {materias.find(m => m.id === product.materia)?.nombre || product.materia}
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
