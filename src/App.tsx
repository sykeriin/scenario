import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { SystemChat } from "@/components/SystemChat";
import { PomodoroGlobal } from "@/components/PomodoroGlobal";
import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { LOCAL_USER_ID } from "@/integrations/local/schema-extensions";
import { getAIConfig } from "@/lib/ai-config";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UniverseProvider } from "@/contexts/UniverseContext";
import { SystemChatProvider } from "@/contexts/SystemChatContext";
import { ensureSeeded } from "@/integrations/local/db";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Scenarios from "./pages/Scenarios";
import ScenarioNew from "./pages/ScenarioNew";
import ScenarioDetail from "./pages/ScenarioDetail";
import Templates from "./pages/Templates";
import Channels from "./pages/Channels";
import ChannelDetail from "./pages/ChannelDetail";
import Stats from "./pages/Stats";
import Lobby from "./pages/Lobby";
import LifePathPage from "./pages/LifePath";
import Training from "./pages/Training";
import MoodMap from "./pages/MoodMap";
import WeeklyReview from "./pages/WeeklyReview";
import SkillTreePage from "./pages/SkillTreePage";
import Vault from "./pages/Vault";
import PartyDetail from "./pages/PartyDetail";
import Novel from "./pages/Novel";
import ConstellationProfile from "./pages/ConstellationProfile";
import ConstellationDashboard from "./pages/ConstellationDashboard";
import Nebulae from "./pages/Nebulae";
import NebulaDetail from "./pages/NebulaDetail";
import DreamBoard from "./pages/DreamBoard";
import DemonBestiary from "./pages/DemonBestiary";
import OldestDream from "./pages/OldestDream";
import Roadmap from "./pages/Roadmap";
import Swot from "./pages/Swot";
import Settings from "./pages/Settings";
import ShadowArmy from "./pages/ShadowArmy";
import FounderResearch from "./pages/FounderResearch";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    let cancelled = false;
    setCheckingOnboarding(true);
    ensureSeeded()
      .then(() =>
        dataClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', LOCAL_USER_ID)
          .maybeSingle()
      )
      .then(({ data, error }) => {
        if (cancelled) return;
        const done = !error && data?.onboarding_completed === true;
        setNeedsOnboarding(!done);
        setCheckingOnboarding(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingOnboarding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ LOADING...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/dashboard" replace />;
  if (needsOnboarding && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
    <Route path="/scenarios/new" element={<ProtectedRoute><ScenarioNew /></ProtectedRoute>} />
    <Route path="/scenarios/:id" element={<ProtectedRoute><ScenarioDetail /></ProtectedRoute>} />
    <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
    <Route path="/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
    <Route path="/channels/:id" element={<ProtectedRoute><ChannelDetail /></ProtectedRoute>} />
    <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
    <Route path="/life-path" element={<ProtectedRoute><LifePathPage /></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
    <Route path="/skill-tree" element={<ProtectedRoute><SkillTreePage /></ProtectedRoute>} />
    <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
    <Route path="/mood" element={<ProtectedRoute><MoodMap /></ProtectedRoute>} />
    <Route path="/review" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
    <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
    <Route path="/party/:id" element={<ProtectedRoute><PartyDetail /></ProtectedRoute>} />
    <Route path="/novel" element={<ProtectedRoute><Novel /></ProtectedRoute>} />
    <Route path="/constellation/:id" element={<ProtectedRoute><ConstellationProfile /></ProtectedRoute>} />
    <Route path="/constellation-dashboard" element={<ProtectedRoute><ConstellationDashboard /></ProtectedRoute>} />
    <Route path="/nebulae" element={<ProtectedRoute><Nebulae /></ProtectedRoute>} />
    <Route path="/nebulae/:id" element={<ProtectedRoute><NebulaDetail /></ProtectedRoute>} />
    <Route path="/dream-board" element={<ProtectedRoute><DreamBoard /></ProtectedRoute>} />
    <Route path="/demons" element={<ProtectedRoute><DemonBestiary /></ProtectedRoute>} />
    <Route path="/oldest-dream" element={<ProtectedRoute><OldestDream /></ProtectedRoute>} />
    <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
    <Route path="/swot" element={<ProtectedRoute><Swot /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/shadow-army" element={<ProtectedRoute><ShadowArmy /></ProtectedRoute>} />
    <Route path="/research" element={<ProtectedRoute><FounderResearch /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const [aiReady, setAiReady] = useState(() => getAIConfig().configured || getAIConfig().skipAi);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UniverseProvider>
          <SystemChatProvider>
          <PomodoroProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {!aiReady && <ApiKeyGate onComplete={() => setAiReady(true)} />}
              <BrowserRouter>
                <AppRoutes />
                <SystemChat />
                <PomodoroGlobal />
                <InstallPrompt />
              </BrowserRouter>
            </TooltipProvider>
          </PomodoroProvider>
          </SystemChatProvider>
          </UniverseProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
