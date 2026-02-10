import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Book, Search, Filter, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { STORE_ENDPOINTS, buildUrl } from '@/config/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Catalog() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const [books, setBooks] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('all');
  const [selectedMateria, setSelectedMateria] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [booksRes, gradosRes, materiasRes] = await Promise.all([
        axios.get(buildUrl(STORE_ENDPOINTS.products)),
        axios.get(buildUrl(STORE_ENDPOINTS.grades)),
        axios.get(buildUrl(STORE_ENDPOINTS.subjects))
      ]);
      
      setBooks(booksRes.data);
      setGrados(gradosRes.data.grades);
      setMaterias(materiasRes.data.subjects);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrado = selectedGrado === 'all' || book.grade === selectedGrado;
    const matchesMateria = selectedMateria === 'all' || book.subject === selectedMateria;
    
    return matchesSearch && matchesGrado && matchesMateria;
  });

  const getStockStatus = (cantidad) => {
    if (cantidad <= 0) return { label: t('catalog.outOfStock'), color: 'destructive' };
    if (cantidad < 10) return { label: t('catalog.lowStock'), color: 'warning' };
    return { label: t('catalog.inStock'), color: 'success' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl" data-testid="catalog-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
          {t('catalog.title')}
        </h1>
        <p className="text-muted-foreground">
          Encuentre todos los books de texto organizados por grado y materia
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-lg"
            data-testid="catalog-search"
          />
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedGrado} onValueChange={setSelectedGrado}>
            <SelectTrigger className="w-[180px] h-12" data-testid="grade-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('catalog.filterByGrade')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('catalog.allGrades')}</SelectItem>
              {grados.map((grado) => (
                <SelectItem key={grado.id} value={grado.id}>
                  {grado.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedMateria} onValueChange={setSelectedMateria}>
            <SelectTrigger className="w-[180px] h-12" data-testid="subject-filter">
              <SelectValue placeholder={t('catalog.filterBySubject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('catalog.allSubjects')}</SelectItem>
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
        {filteredBooks.length} books encontrados
      </p>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const stockStatus = getStockStatus(book.inventory_quantity);
            
            return (
              <div
                key={book.book_id}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-colors duration-300"
                data-testid={`book-card-${book.book_id}`}
              >
                {/* Book Image/Placeholder */}
                <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden">
                  {book.image_url ? (
                    <img 
                      src={book.image_url} 
                      alt={book.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Book className="h-16 w-16 text-muted-foreground/50" />
                  )}
                </div>
                
                {/* Content */}
                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {t(`grades.${book.grade}`)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t(`subjects.${book.subject}`)}
                    </Badge>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2">
                    {book.name}
                  </h3>
                  
                  {/* Description */}
                  {book.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {book.description}
                    </p>
                  )}
                  
                  {/* Publisher */}
                  {book.publisher && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {book.publisher}
                    </p>
                  )}
                  
                  {/* Price & Stock */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xl font-bold text-primary">
                        ${book.price.toFixed(2)}
                      </p>
                      <div className={`flex items-center gap-1 text-xs ${
                        stockStatus.color === 'success' ? 'text-green-600 dark:text-green-400' :
                        stockStatus.color === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {stockStatus.color !== 'success' && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {stockStatus.label} ({book.inventory_quantity})
                      </div>
                    </div>
                    
                    {isAuthenticated && book.inventory_quantity > 0 && (
                      <Button 
                        size="sm" 
                        className="rounded-full"
                        onClick={() => toast.info('Agregue este book desde el formulario de orden')}
                        data-testid={`add-to-cart-${book.book_id}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
