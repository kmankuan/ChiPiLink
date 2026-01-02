import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

// i18n
import '@/i18n';

// Contexts
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import { InlineTranslationProvider } from '@/contexts/InlineTranslationContext';
import { CartProvider } from '@/contexts/CartContext';

// Layout
import { Header } from '@/components/layout/Header';
import { NotificationBar } from '@/components/layout/NotificationBar';

// Pages
import Landing from '@/pages/Landing';
import CommunityLanding from '@/pages/CommunityLanding';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import Catalog from '@/pages/Catalog';
import OrderForm from '@/pages/OrderForm';
import Orders from '@/pages/Orders';
import Receipt from '@/pages/Receipt';
import AdminDashboard from '@/pages/AdminDashboard';
import EmbedOrderForm from '@/pages/EmbedOrderForm';
import Checkout from '@/pages/Checkout';
import PaymentResult from '@/pages/PaymentResult';
import Unatienda from '@/pages/Unatienda';
import UnatiendaCheckout from '@/pages/UnatiendaCheckout';
import ProductDetail from '@/pages/ProductDetail';

// Components
import CartDrawer from '@/components/cart/CartDrawer';

import '@/App.css';

// Admin Layout with Notification Bar
function AdminLayout({ children }) {
  return (
    <>
      <Header />
      <NotificationBar />
      {children}
    </>
  );
}

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// App Router - Handles session_id detection synchronously
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  // This prevents race conditions with ProtectedRoute
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<CommunityLanding />} />
      <Route path="/landing-editor" element={<><Header /><Landing /></>} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Community Routes */}
      <Route path="/comunidad" element={<CommunityLanding />} />
      <Route path="/comunidad/post/:postId" element={<CommunityLanding />} />
      <Route path="/comunidad/evento/:eventoId" element={<CommunityLanding />} />
      <Route path="/comunidad/galeria/:albumId" element={<CommunityLanding />} />
      <Route path="/eventos" element={<CommunityLanding />} />
      <Route path="/galeria" element={<CommunityLanding />} />
      
      {/* Ping Pong Club Routes */}
      <Route path="/pingpong" element={<PingPongDashboard />} />
      <Route path="/pingpong/match/new" element={<PingPongMatch />} />
      <Route path="/pingpong/match/:matchId" element={<PingPongMatch />} />
      <Route path="/pingpong/arbiter/:matchId" element={<PingPongArbiter />} />
      <Route path="/pingpong/spectator/:matchId" element={<PingPongSpectator />} />
      
      {/* Catalog - Admin only */}
      <Route 
        path="/catalogo" 
        element={
          <ProtectedRoute adminOnly>
            <Header />
            <Catalog />
          </ProtectedRoute>
        } 
      />
      
      {/* Embed Route - No header */}
      <Route path="/embed/orden" element={<EmbedOrderForm />} />
      
      {/* Public Checkout Routes */}
      <Route path="/checkout/:pedidoId" element={<Checkout />} />
      <Route path="/payment/result" element={<PaymentResult />} />
      
      {/* Unatienda Store Routes */}
      <Route path="/unatienda" element={<><Header /><Unatienda /></>} />
      <Route path="/unatienda/producto/:productId" element={<><Header /><ProductDetail /></>} />
      <Route path="/unatienda/checkout" element={<UnatiendaCheckout />} />
      
      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Header />
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/estudiantes" 
        element={
          <ProtectedRoute>
            <Header />
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orden" 
        element={
          <ProtectedRoute>
            <Header />
            <OrderForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pedidos" 
        element={
          <ProtectedRoute>
            <Header />
            <Orders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/recibo/:pedidoId" 
        element={
          <ProtectedRoute>
            <Header />
            <Receipt />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteConfigProvider>
          <InlineTranslationProvider>
            <CartProvider>
              <BrowserRouter>
                <div className="App min-h-screen bg-background noise-bg">
                  <AppRouter />
                  <CartDrawer />
                  <Toaster 
                    position="top-right" 
                    richColors 
                    closeButton
                    toastOptions={{
                      className: 'font-sans'
                    }}
                  />
                </div>
              </BrowserRouter>
            </CartProvider>
          </InlineTranslationProvider>
        </SiteConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
