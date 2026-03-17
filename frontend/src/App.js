import { lazy, Suspense } from "react";
import "@/App.css";
import "@/i18n";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SportLayout } from "@/components/layout/SportLayout";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages
const SportDashboard = lazy(() => import("@/pages/sport/SportDashboard"));
const Rankings = lazy(() => import("@/pages/sport/Rankings"));
const PlayersList = lazy(() => import("@/pages/sport/PlayersList"));
const PlayerProfile = lazy(() => import("@/pages/sport/PlayerProfile"));
const LeaguesList = lazy(() => import("@/pages/sport/LeaguesList"));
const MatchesList = lazy(() => import("@/pages/sport/MatchesList"));
const RecordMatch = lazy(() => import("@/pages/sport/RecordMatch"));
const TournamentsList = lazy(() => import("@/pages/sport/TournamentsList"));
const TournamentDetail = lazy(() => import("@/pages/sport/TournamentDetail"));
const LiveList = lazy(() => import("@/pages/sport/LiveList"));
const StartLive = lazy(() => import("@/pages/sport/StartLive"));
const LiveRefPanel = lazy(() => import("@/pages/sport/LiveRefPanel"));
const LiveSpectator = lazy(() => import("@/pages/sport/LiveSpectator"));
const SportTV = lazy(() => import("@/pages/sport/SportTV"));
const SportAdmin = lazy(() => import("@/pages/sport/SportAdmin"));
const Login = lazy(() => import("@/pages/sport/Login"));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public pages without layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/sport/tv" element={<SportTV />} />

            {/* Pages with sport layout */}
            <Route element={<SportLayout />}>
              <Route path="/sport" element={<SportDashboard />} />
              <Route path="/sport/rankings" element={<Rankings />} />
              <Route path="/sport/players" element={<PlayersList />} />
              <Route path="/sport/player/:id" element={<PlayerProfile />} />
              <Route path="/sport/leagues" element={<LeaguesList />} />
              <Route path="/sport/matches" element={<MatchesList />} />
              <Route path="/sport/match/new" element={<RecordMatch />} />
              <Route path="/sport/tournaments" element={<TournamentsList />} />
              <Route path="/sport/tournament/:id" element={<TournamentDetail />} />
              <Route path="/sport/live" element={<LiveList />} />
              <Route path="/sport/live/new" element={<StartLive />} />
              <Route path="/sport/live/:id" element={<LiveSpectator />} />
              <Route path="/sport/live/:id/referee" element={<LiveRefPanel />} />
              <Route path="/sport/admin" element={<SportAdmin />} />
            </Route>

            {/* Redirect root to sport dashboard */}
            <Route path="/" element={<Navigate to="/sport" replace />} />
            <Route path="*" element={<Navigate to="/sport" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;
