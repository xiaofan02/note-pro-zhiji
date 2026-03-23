import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Workspace from "./pages/Workspace.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import Upgrade from "./pages/Upgrade.tsx";
import DesktopAuthCallback from "./pages/DesktopAuthCallback.tsx";
import SharedNote from "./pages/SharedNote.tsx";

const queryClient = new QueryClient();

// Tauri 桌面端用 HashRouter，Web 用 BrowserRouter
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const RouterComponent = isTauri ? HashRouter : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterComponent>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/desktop-auth-callback" element={<DesktopAuthCallback />} />
            <Route path="/s/:token" element={<SharedNote />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </RouterComponent>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
