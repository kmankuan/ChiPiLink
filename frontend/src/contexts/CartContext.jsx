import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'chipilink_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.libro_id === product.libro_id);
      
      if (existingIndex >= 0) {
        // Update quantity if already in cart
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        
        // Check stock (skip for private catalog items)
        const isPrivate = product.es_catalogo_privado || updated[existingIndex].es_catalogo_privado;
        if (!isPrivate && newQty > product.cantidad_inventario) {
          toast.error('No hay suficiente stock disponible');
          return prev;
        }
        
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty
        };
        toast.success(`${product.nombre} actualizado en el carrito`);
        return updated;
      }
      
      // Add new item
      toast.success(`${product.nombre} agregado al carrito`);
      return [...prev, {
        libro_id: product.libro_id,
        nombre: product.nombre,
        precio: product.precio_oferta || product.precio,
        precio_original: product.precio,
        imagen_url: product.imagen_url,
        grado: product.grado,
        materia: product.materia,
        cantidad_inventario: product.cantidad_inventario,
        es_catalogo_privado: product.es_catalogo_privado || false,
        editorial: product.editorial,
        codigo: product.codigo,
        quantity
      }];
    });
  };

  const removeItem = (libroId) => {
    setItems(prev => prev.filter(item => item.libro_id !== libroId));
    toast.success('Producto eliminado del carrito');
  };

  const updateQuantity = (libroId, quantity) => {
    if (quantity < 1) {
      removeItem(libroId);
      return;
    }
    
    setItems(prev => prev.map(item => {
      if (item.libro_id === libroId) {
        if (quantity > item.cantidad_inventario) {
          toast.error('No hay suficiente stock disponible');
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Carrito vaciado');
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen(prev => !prev);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
  
  // Separate private and public items
  const privateItems = items.filter(item => item.es_catalogo_privado);
  const publicItems = items.filter(item => !item.es_catalogo_privado);
  const hasPrivateItems = privateItems.length > 0;
  const hasPublicItems = publicItems.length > 0;
  const hasMixedCart = hasPrivateItems && hasPublicItems;

  const value = {
    items,
    itemCount,
    subtotal,
    isOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    // New helpers for private catalog
    privateItems,
    publicItems,
    hasPrivateItems,
    hasPublicItems,
    hasMixedCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
