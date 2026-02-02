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
import { OneSignalProvider } from '@/contexts/OneSignalContext';

// Layout
import { Header } from '@/components/layout/Header';
import { NotificationBar } from '@/components/layout/NotificationBar';

// Pages
import SuperAppLanding from '@/pages/SuperAppLanding';
import RapidPinPublicPage from '@/pages/RapidPinPublicPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AuthCallback from '@/pages/AuthCallback';
import LaoPanCallback from '@/pages/LaoPanCallback';
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
import PrivateBookDetail from '@/pages/PrivateBookDetail';
import AgentPanel from '@/pages/AgentPanel';

// PinpanClub Module
import PingPongDashboard from '@/modules/pinpanclub/pages/PingPongDashboard';
import PingPongMatch from '@/modules/pinpanclub/pages/PingPongMatch';
import PingPongArbiter from '@/modules/pinpanclub/pages/PingPongArbiter';
import PingPongSpectator from '@/modules/pinpanclub/pages/PingPongSpectator';
import PingPongTV from '@/modules/pinpanclub/pages/PingPongTV';
import PingPongMobileArbiter from '@/modules/pinpanclub/pages/PingPongMobileArbiter';
import SponsorsAdmin from '@/modules/pinpanclub/pages/SponsorsAdmin';
import PingPongCanvas from '@/modules/pinpanclub/pages/PingPongCanvas';
import PingPongMondayIntegration from '@/modules/pinpanclub/pages/PingPongMondayIntegration';

// Super Pin Module
import { SuperPinAdmin, SuperPinLeagueDetail, SuperPinMatch, SuperPinRanking, SuperPinTournament, PlayerProfile, PlayerComparison } from '@/modules/pinpanclub/pages/superpin';

// Rapid Pin Module
import { RapidPinDashboard, RapidPinSeason } from '@/modules/pinpanclub/pages/rapidpin';

// Weekly Challenges Page
import WeeklyChallengesPage from '@/modules/pinpanclub/pages/WeeklyChallengesPage';

// Analytics Dashboard
import AnalyticsDashboard from '@/modules/pinpanclub/pages/AnalyticsDashboard';

// Seasons Page
import SeasonsPage from '@/modules/pinpanclub/pages/SeasonsPage';

// Account Module (User's personal portal)
import AccountDashboard from '@/modules/account/pages/AccountDashboard';
// Admin Users Module
import AdminMemberships from '@/modules/admin/users/components/AdminMemberships';

// Notifications Module (Admin)
import AdminNotifications from '@/modules/notifications/pages/AdminNotifications';
import AdminPosts from '@/modules/notifications/pages/AdminPosts';

// Book Orders Module (Admin)
// BookOrdersAdmin removed - functionality moved to Unatienda module
// import BookOrdersAdmin from '@/modules/store/BookOrdersAdmin';
import MisPedidosLibros from '@/modules/store/MisPedidosLibros';

// Bulk Import Page
import BulkImportBooksPage from '@/pages/BulkImportBooksPage';

// Components
import CartDrawer from '@/components/cart/CartDrawer';
// CXGenieWidget removed - access via header support button instead

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
    return <Navigate to="/mi-cuenta" replace />;
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
      <Route path="/" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/login" element={<><Header /><Login /></>} />
      <Route path="/registro" element={<><Header /><Register /></>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/laopan/callback" element={<LaoPanCallback />} />
      
      {/* Community Routes - All use SuperAppLanding which handles community content */}
      <Route path="/comunidad" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/post/:postId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/evento/:eventoId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/galeria/:albumId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/eventos" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/galeria" element={<><Header /><SuperAppLanding /></>} />
      
      {/* PinpanClub Routes */}
      <Route path="/pinpanclub" element={<><Header /><PingPongDashboard /></>} />
      <Route path="/pinpanclub/match/new" element={<><Header /><PingPongMatch /></>} />
      <Route path="/pinpanclub/match/:matchId" element={<><Header /><PingPongMatch /></>} />
      <Route path="/pinpanclub/arbiter/:matchId" element={<><Header /><PingPongArbiter /></>} />
      <Route path="/pinpanclub/spectator/:matchId" element={<><Header /><PingPongSpectator /></>} />
      <Route path="/pinpanclub/sponsors" element={<><Header /><SponsorsAdmin /></>} />
      <Route path="/pinpanclub/monday" element={<><Header /><PingPongMondayIntegration /></>} />
      
      {/* PinpanClub TV Display - Public URL for TVs - NO Header for TV mode */}
      <Route path="/tv/pinpanclub" element={<PingPongTV />} />
      <Route path="/tv" element={<PingPongTV />} />
      
      {/* PinpanClub Canvas - Customizable Widget Layout - NO Header for canvas */}
      <Route path="/canvas" element={<PingPongCanvas />} />
      <Route path="/tv/canvas" element={<PingPongCanvas />} />
      
      {/* PinpanClub Mobile Arbiter */}
      <Route path="/pinpanclub/mobile-arbiter/:matchId" element={<><Header /><PingPongMobileArbiter /></>} />
      
      {/* Super Pin Routes */}
      <Route path="/pinpanclub/superpin/admin" element={<><Header /><SuperPinAdmin /></>} />
      <Route path="/pinpanclub/superpin/league/:ligaId" element={<><Header /><SuperPinLeagueDetail /></>} />
      <Route path="/pinpanclub/superpin/match/:partidoId" element={<><Header /><SuperPinMatch /></>} />
      <Route path="/pinpanclub/superpin/ranking" element={<><Header /><SuperPinRanking /></>} />
      <Route path="/pinpanclub/superpin/ranking/:ligaId" element={<><Header /><SuperPinRanking /></>} />
      <Route path="/pinpanclub/superpin/tournament/:torneoId" element={<><Header /><SuperPinTournament /></>} />
      <Route path="/pinpanclub/superpin/player/:jugadorId" element={<><Header /><PlayerProfile /></>} />
      <Route path="/pinpanclub/superpin/compare" element={<><Header /><PlayerComparison /></>} />
      
      {/* Rapid Pin Routes */}
      <Route path="/rapidpin" element={<><Header /><RapidPinPublicPage /></>} />
      <Route path="/pinpanclub/rapidpin" element={<><Header /><RapidPinDashboard /></>} />
      <Route path="/pinpanclub/rapidpin/season/:seasonId" element={<><Header /><RapidPinSeason /></>} />
      
      {/* Weekly Challenges Route */}
      <Route path="/pinpanclub/challenges" element={<><Header /><WeeklyChallengesPage /></>} />
      
      {/* Analytics Dashboard Route */}
      <Route path="/pinpanclub/analytics" element={<><Header /><AnalyticsDashboard /></>} />
      
      {/* Seasons Page Routes */}
      <Route path="/pinpanclub/seasons" element={<><Header /><SeasonsPage /></>} />
      <Route path="/pinpanclub/seasons/:seasonId" element={<><Header /><SeasonsPage /></>} />
      
      {/* Account Module Routes (User's personal portal) */}
      <Route 
        path="/mi-cuenta" 
        element={
          <ProtectedRoute>
            <Header />
            <AccountDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/my-account" 
        element={
          <ProtectedRoute>
            <Header />
            <AccountDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Notifications Admin Routes */}
      <Route 
        path="/admin/notifications" 
        element={
          <ProtectedRoute adminOnly>
            <Header />
            <AdminNotifications />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/posts" 
        element={
          <ProtectedRoute adminOnly>
            <Header />
            <AdminPosts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/memberships" 
        element={
          <ProtectedRoute adminOnly>
            <Header />
            <AdminMemberships />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/bulk-import-books" 
        element={
          <ProtectedRoute adminOnly>
            <BulkImportBooksPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/mis-pedidos-libros" 
        element={
          <ProtectedRoute>
            <Header />
            <MisPedidosLibros />
          </ProtectedRoute>
        } 
      />
      
      {/* Legacy redirects for backward compatibility */}
      <Route path="/pingpong/*" element={<Navigate to="/pinpanclub" replace />} />
      <Route path="/tv/pingpong" element={<Navigate to="/tv/pinpanclub" replace />} />
      
      {/* Catalog route removed - Now integrated in Admin > Unatienda module */}
      <Route path="/catalogo" element={<Navigate to="/admin" replace />} />
      
      {/* Embed Route - No header */}
      <Route path="/embed/orden" element={<EmbedOrderForm />} />
      
      {/* Public Checkout Routes */}
      <Route path="/checkout/:pedidoId" element={<><Header /><Checkout /></>} />
      <Route path="/payment/result" element={<><Header /><PaymentResult /></>} />
      
      {/* Unatienda Store Routes */}
      <Route path="/unatienda" element={<><Header /><Unatienda /></>} />
      <Route path="/unatienda/producto/:productId" element={<><Header /><ProductDetail /></>} />
      <Route path="/unatienda/libro/:libroId" element={<><Header /><PrivateBookDetail /></>} />
      <Route path="/unatienda/checkout" element={<><Header /><UnatiendaCheckout /></>} />
      
      {/* Protected Routes */}
      {/* Redirect old /dashboard routes to /mi-cuenta */}
      <Route 
        path="/dashboard" 
        element={<Navigate to="/mi-cuenta" replace />}
      />
      <Route 
        path="/dashboard/estudiantes" 
        element={<Navigate to="/mi-cuenta?tab=exclusive" replace />}
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
      
      {/* Admin Routes - AdminDashboard has its own header */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Agent Panel - CXGenie Help Desk */}
      <Route 
        path="/admin/chat" 
        element={
          <ProtectedRoute adminOnly>
            <Header />
            <AgentPanel />
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
        <OneSignalProvider>
          <SiteConfigProvider>
            <InlineTranslationProvider>
              <CartProvider>
                <BrowserRouter>
                  <div className="App min-h-screen bg-background noise-bg">
                    <AppRouter />
                    <CartDrawer />
                    {/* CXGenie widget removed - access via header support button instead */}
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
        </OneSignalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
