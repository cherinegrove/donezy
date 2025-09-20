
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { AppLayout } from "./components/layout/AppLayout";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Team from "./pages/Team";
import TimeTracking from "./pages/TimeTracking";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import Dashboards from "./pages/Dashboards";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";
import ConfirmInvite from "./pages/ConfirmInvite";

// Simplified Protected route component
const ProtectedRoute = ({ 
  element, 
  allowedRoles = ['admin', 'manager', 'developer', 'client']
}: {
  element: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'developer' | 'client'>;
}) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Session check error:", error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{element}</>;
};

// Simplified Public route component
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (session) {
    return <Navigate to="/" replace />;
  }
  
  return <>{element}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Error boundary component
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error caught:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// The AppRoutes component needs to be inside the AppProvider
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes - always accessible, no auth checks */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/set-password" element={
        (() => {
          console.log("🔧 SetPassword route accessed!");
          console.log("🔧 Current URL:", window.location.href);
          return <SetPassword />;
        })()
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/email-confirmation" element={<EmailConfirmation />} />
      <Route path="/confirm" element={<ConfirmInvite />} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute element={<AppLayout />} />}>
        <Route index element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notes" element={<Notes />} />
        <Route 
          path="/clients" 
          element={
            <ProtectedRoute 
              element={<Clients />} 
              allowedRoles={['admin', 'manager', 'developer']} 
            />
          } 
        />
        <Route path="/clients/:clientId" element={<ClientDetails />} />
        <Route 
          path="/team" 
          element={
            <ProtectedRoute 
              element={<Team />} 
              allowedRoles={['admin', 'manager']} 
            />
          } 
        />
        <Route path="/time" element={<TimeTracking />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/dashboards" element={<Dashboards />} />
        <Route path="/settings" element={<Settings />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute 
              element={<Admin />} 
              allowedRoles={['admin']} 
            />
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AppProvider>
              <Routes>
                {/* Critical auth route - completely isolated */}
                <Route path="/set-password" element={
                  <>
                    <Toaster />
                    <Sonner />
                    {(() => {
                      console.log("🔧 SetPassword route hit directly!");
                      console.log("🔧 Current URL:", window.location.href);
                      console.log("🔧 Hash:", window.location.hash);
                      console.log("🔧 Search:", window.location.search);
                      return <SetPassword />;
                    })()}
                  </>
                } />
                
                {/* All other routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route path="/confirm" element={<ConfirmInvite />} />
                
                {/* Protected routes */}
                <Route path="/*" element={<AppRoutes />} />
              </Routes>
              <Toaster />
              <Sonner />
            </AppProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
