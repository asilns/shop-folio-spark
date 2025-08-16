import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { StoreSessionProvider } from "@/contexts/StoreSessionContext";
import { StoreAuthProvider } from "@/contexts/StoreAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import { ProtectedStoreRoute } from "@/components/ProtectedStoreRoute";

import Index from "./pages/Index";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import StoreLoginPage from "./pages/StoreLoginPage";
import StoreDashboard from "./pages/StoreDashboard";
import StoreSlugDashboard from "./pages/StoreSlugDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <StoreSessionProvider>
            <StoreAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin-login" element={<AdminLoginPage />} />
                  <Route path="/admin-panel" element={
                    <AdminProtectedRoute>
                      <AdminPanelPage />
                    </AdminProtectedRoute>
                  } />
                  <Route path="/store-login" element={<StoreLoginPage />} />
                  <Route path="/store" element={
                    <ProtectedStoreRoute>
                      <StoreDashboard />
                    </ProtectedStoreRoute>
                  } />
                  <Route path="/store/:slug/dashboard" element={
                    <ProtectedStoreRoute>
                      <StoreSlugDashboard />
                    </ProtectedStoreRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </StoreAuthProvider>
          </StoreSessionProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
