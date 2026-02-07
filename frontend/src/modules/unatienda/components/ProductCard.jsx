/**
 * ProductCard — Product card for the public store catalog
 * Extracted from Unatienda.jsx for maintainability.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, GraduationCap, Plus, ShoppingCart } from 'lucide-react';

export default function ProductCard({
  product,
  isPrivate = false,
  stockStatus,
  inCart,
  cartQty,
  justAdded,
  categoryInfo,
  canBuy,
  onCardClick,
  onAddToCart,
  onOpenCart,
}) {
  return (
    <div
      data-testid={`product-card-${product.book_id}`}
      className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onCardClick(product)}
    >
      {/* Product Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-5xl">{categoryInfo.icono}</span>
        )}
      </div>

      {isPrivate && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-purple-600 text-xs">
            <GraduationCap className="h-3 w-3 mr-1" />
            PCA
          </Badge>
        </div>
      )}

      {!isPrivate && (
        <div className="absolute top-3 right-3">
          <Badge
            variant={stockStatus?.color === 'success' ? 'default' :
              stockStatus?.color === 'warning' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {stockStatus?.label}
          </Badge>
        </div>
      )}

      {inCart && (
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="bg-primary text-xs">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {cartQty}
          </Badge>
        </div>
      )}

      {product.requires_preparation && (
        <div className="absolute top-12 right-3">
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
            <Clock className="h-3 w-3 mr-1" />
            Preparación
          </Badge>
        </div>
      )}

      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {isPrivate ? (
            <>
              <Badge variant="secondary" className="text-xs">{product.grade}</Badge>
              {product.subject && (
                <Badge variant="outline" className="text-xs">{product.subject}</Badge>
              )}
            </>
          ) : (
            <>
              <Badge variant="outline" className="text-xs">
                <span className="mr-1">{categoryInfo.icono}</span>
                {categoryInfo.name}
              </Badge>
              {(product.categoria === 'libros' || product.categoria === 'books') && product.grade && (
                <Badge variant="secondary" className="text-xs">{product.grade}</Badge>
              )}
            </>
          )}
        </div>

        <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {isPrivate && product.publisher ? (
          <p className="text-sm text-muted-foreground mb-3">
            Editorial: {product.publisher}
          </p>
        ) : product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div>
            {product.sale_price ? (
              <div>
                <p className="text-2xl font-bold text-green-600">${product.sale_price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground line-through">${product.price?.toFixed(2)}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">${product.price?.toFixed(2)}</p>
            )}
          </div>
          <Button
            size="sm"
            variant={inCart ? 'secondary' : 'default'}
            className="rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              inCart ? onOpenCart() : onAddToCart(product);
            }}
            disabled={!isPrivate && !canBuy}
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
}
