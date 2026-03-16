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
import { LayoutProvider } from '@/contexts/LayoutContext';
import { CartProvider } from '@/contexts/CartContext';
import { OneSignalProvider } from '@/contexts/OneSignalContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';

// Layout
import { Header } from '@/components/layout/Header';
import { NotificationBar } from '@/components/layout/NotificationBar';
import BottomNav from '@/components/layout/BottomNav';

// Pages
import SuperAppLanding from '@/pages/SuperAppLanding';
import RapidPinPublicPage from '@/pages/RapidPinPublicPage';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
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
import EmbedWidget from '@/pages/EmbedWidget';
import WidgetAuthComplete from '@/pages/WidgetAuthComplete';
import Checkout from '@/pages/Checkout';
import PaymentResult from '@/pages/PaymentResult';
import Unatienda from '@/pages/Unatienda';
import UnatiendaCheckout from '@/pages/UnatiendaCheckout';
import ProductDetail from '@/pages/ProductDetail';
import PrivateBookDetail from '@/pages/PrivateBookDetail';
import AgentPanel from '@/pages/AgentPanel';
import PaymentStatus from '@/pages/PaymentStatus';

// PinpanClub Module
import PingPongDashboard from '@/modules/pinpanclub/pages/PingPongDashboard';
import CompetitionsHub from '@/modules/pinpanclub/pages/CompetitionsHub';
import PingPongMatch from '@/modules/pinpanclub/pages/PingPongMatch';
import PingPongArbiter from '@/modules/pinpanclub/pages/PingPongArbiter';
import PingPongSpectator from '@/modules/pinpanclub/pages/PingPongSpectator';
import PingPongTV from '@/modules/pinpanclub/pages/PingPongTV';
import PingPongMobileArbiter from '@/modules/pinpanclub/pages/PingPongMobileArbiter';
import SponsorsAdmin from '@/modules/pinpanclub/pages/SponsorsAdmin';
import PingPongCanvas from '@/modules/pinpanclub/pages/PingPongCanvas';
import PingPongMondayIntegration from '@/modules/pinpanclub/pages/PingPongMondayIntegration';

// Sport Module (new — replaces PinPanClub league system)
import SportDashboard from '@/modules/sport/SportDashboard';
import RecordMatch from '@/modules/sport/RecordMatch';
import SportRankings from '@/modules/sport/Rankings';
import SportLeagueDetail from '@/modules/sport/LeagueDetail';
import StartLive from '@/modules/sport/StartLive';
import LiveRefPanel from '@/modules/sport/LiveRefPanel';
import LiveSpectator from '@/modules/sport/LiveSpectator';
import LiveOverlay from '@/modules/sport/LiveOverlay';
import SportTV from '@/modules/sport/SportTV';
import TournamentDetail from '@/modules/sport/TournamentDetail';
import CreateTournament from '@/modules/sport/CreateTournament';
import SportAdmin from '@/modules/sport/SportAdmin';
import PlayerProfile from '@/modules/sport/PlayerProfile';
import HallOfFame from '@/modules/sport/HallOfFame';

// Tutor Module
import TutorDashboard from '@/modules/tutor/TutorDashboard';
import StudentDetail from '@/modules/tutor/StudentDetail';
import AgentChat from '@/modules/tutor/AgentChat';
import BoardMapper from '@/modules/tutor/BoardMapper';


// Rapid Pin Module
import { RapidPinDashboard, RapidPinSeason } from '@/modules/pinpanclub/pages/rapidpin';

// PinPan Arena Module
import { ArenaHub, ArenaCreate, ArenaDetail, ArenaPublic } from '@/modules/pinpanclub/pages/arena';

// Hall of Fame & Referee
// import HallOfFame from '@/modules/pinpanclub/pages/HallOfFame'; // DEPRECATED
import RefereeSettings from '@/modules/pinpanclub/pages/RefereeSettings';

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
// MisPedidosLibros removed - redirected to /unatienda?tab=private
// import BookOrdersAdmin from '@/modules/store/BookOrdersAdmin';

// Bulk Import Page
import BulkImportBooksPage from '@/pages/BulkImportBooksPage';
import HelpGuide from '@/pages/HelpGuide';

// Components
import CartDrawer from '@/components/cart/CartDrawer';
import { ImpersonationBanner } from '@/components/shared/ImpersonationBanner';
import PushNotificationManager from '@/components/notifications/PushNotificationManager';
import PerfBeacon from '@/components/common/PerfBeacon';
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
      <Route path="/payment-status" element={<PaymentStatus />} />
      <Route path="/" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/login" element={<><Header /><Login /></>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/registro" element={<Navigate to="/login" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/laopan/callback" element={<LaoPanCallback />} />
      
      {/* Community Routes - All use SuperAppLanding which handles community content */}
      <Route path="/comunidad" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/post/:postId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/evento/:eventoId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/comunidad/galeria/:albumId" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/eventos" element={<><Header /><SuperAppLanding /></>} />
      <Route path="/galeria" element={<><Header /><SuperAppLanding /></>} />
      
      {/* PinpanClub Routes — DEPRECATED, redirecting to Sport module */}
      {/* Keep TV and Canvas routes as they still work independently */}
      <Route path="/tv/pinpanclub" element={<PingPongTV />} />
      <Route path="/tv" element={<PingPongTV />} />
      <Route path="/canvas" element={<PingPongCanvas />} />
      <Route path="/tv/canvas" element={<PingPongCanvas />} />
      
      {/* All pinpanclub routes redirect to sport */}
      <Route path="/pinpanclub/*" element={<Navigate to="/sport" replace />} />
      <Route path="/rapidpin" element={<Navigate to="/sport" replace />} />
      <Route path="/arena/:tournamentId" element={<ArenaPublic />} />
      
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
        path="/my-book-orders" 
        element={<Navigate to="/unatienda?tab=private" replace />}
      />
      
      {/* Legacy redirects */}
      <Route path="/pingpong/*" element={<Navigate to="/sport" replace />} />

      {/* Sport Module (Table Tennis) */}
      <Route path="/sport" element={<><Header /><SportDashboard /></>} />
      <Route path="/sport/match/new" element={<><Header /><RecordMatch /></>} />
      <Route path="/sport/rankings" element={<><Header /><SportRankings /></>} />
      <Route path="/sport/league/:leagueId" element={<><Header /><SportLeagueDetail /></>} />
      <Route path="/sport/live/new" element={<><Header /><StartLive /></>} />
      <Route path="/sport/live/:sessionId" element={<LiveRefPanel />} />
      <Route path="/sport/live/:sessionId/spectator" element={<LiveSpectator />} />
      <Route path="/sport/overlay/:sessionId" element={<LiveOverlay />} />
      <Route path="/sport/tv" element={<SportTV />} />
      <Route path="/sport/tournament/new" element={<><Header /><CreateTournament /></>} />
      <Route path="/sport/tournament/:tid" element={<TournamentDetail />} />
      <Route path="/sport/admin" element={<><Header /><SportAdmin /></>} />
      <Route path="/sport/player/:playerId" element={<><Header /><PlayerProfile /></>} />
      <Route path="/sport/hall-of-fame" element={<><Header /><HallOfFame /></>} />

      {/* Tutor Module */}
      <Route path="/tutor" element={<><Header /><TutorDashboard /></>} />
      <Route path="/tutor/student/new" element={<><Header /><StudentDetail /></>} />
      <Route path="/tutor/student/:studentId" element={<><Header /><StudentDetail /></>} />
      <Route path="/tutor/student/:studentId/chat" element={<AgentChat />} />
      <Route path="/tutor/board-mapper" element={<><Header /><BoardMapper /></>} />

      
      {/* Catalog route removed - Now integrated in Admin > Unatienda module */}
      <Route path="/catalogo" element={<Navigate to="/admin" replace />} />
      
      {/* Embed Routes - No header */}
      <Route path="/embed/orden" element={<EmbedOrderForm />} />
      <Route path="/embed/widget" element={<EmbedWidget />} />
      <Route path="/auth/widget-complete" element={<WidgetAuthComplete />} />
      
      {/* Hidden Help Guide - for chatbot training */}
      <Route path="/help-guide" element={<HelpGuide />} />
      
      {/* Public Checkout Routes */}
      <Route path="/checkout/:pedidoId" element={<><Header /><Checkout /></>} />
      <Route path="/payment/result" element={<><Header /><PaymentResult /></>} />
      
      {/* Unatienda Store Routes */}
      <Route path="/unatienda" element={<><Header /><Unatienda /></>} />
      <Route path="/unatienda/producto/:productId" element={<><Header /><ProductDetail /></>} />
      <Route path="/unatienda/book/:bookId" element={<><Header /><PrivateBookDetail /></>} />
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
        path="/orders" 
        element={
          <ProtectedRoute>
            <Header />
            <Orders />
          </ProtectedRoute>
        } 
      />
      {/* Redirect old Spanish route to English */}
      <Route path="/pedidos" element={<Navigate to="/orders" replace />} />
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
        <RealtimeProvider>
        <OneSignalProvider>
          <SiteConfigProvider>
            <InlineTranslationProvider>
              <CartProvider>
                <BrowserRouter>
                  <LayoutProvider>
                    <div className="App min-h-screen bg-background noise-bg app-content pb-[60px]">
                      <ImpersonationBanner />
                      <AppRouter />
                      <BottomNav />
                      <PushNotificationManager />
                      <PerfBeacon />
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
                  </LayoutProvider>
                </BrowserRouter>
              </CartProvider>
            </InlineTranslationProvider>
          </SiteConfigProvider>
        </OneSignalProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
