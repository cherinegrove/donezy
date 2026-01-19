
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { AppLayout } from "./components/layout/AppLayout";
import { GlobalSearch } from "./components/search/GlobalSearch";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Team from "./pages/Team";
import TimeTracking from "./pages/TimeTracking";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import Notes from "./pages/Notes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import Dashboards from "./pages/Dashboards";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";
import ConfirmInvite from "./pages/ConfirmInvite";
import { AuthVerify } from '@/components/auth/AuthVerify';

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
  const location = useLocation();
  
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
    // Preserve the original URL (including query params) for post-login redirect
    const currentPath = location.pathname + location.search;
    const loginUrl = currentPath !== '/' 
      ? `/login?redirect=${encodeURIComponent(currentPath)}`
      : '/login';
    return <Navigate to={loginUrl} replace />;
  }
  
  return <>{element}</>;
};

// Simplified Public route component
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        // Parse redirect from URL if session exists
        if (session) {
          const searchParams = new URLSearchParams(window.location.search);
          const redirect = searchParams.get('redirect') || '/';
          setRedirectPath(redirect);
        }
      } catch (error) {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    
    // Listen for auth state changes like ProtectedRoute does
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect') || '/';
        setRedirectPath(redirect);
      }
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
  
  if (session && redirectPath) {
    return <Navigate to={redirectPath} replace />;
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
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-6 max-w-md">
            <h1 className="text-2xl font-bold mb-4 text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AppProvider>
              <GlobalSearch />
              <Routes>
                {/* Standalone auth routes - no protection needed */}
                <Route path="/set-password" element={
                  <>
                    <Toaster />
                    <Sonner />
                    <SetPassword />
                  </>
                } />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route path="/confirm" element={<ConfirmInvite />} />
                
                {/* Public routes - accessible without authentication */}
                <Route path="/login" element={<PublicRoute element={<Login />} />} />
                <Route path="/signup" element={<PublicRoute element={<Signup />} />} />
                <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />
                <Route path="/reset-password" element={<PublicRoute element={<ResetPassword />} />} />
                <Route path="/auth/v1/verify" element={<AuthVerify />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute element={<AppLayout />} />}>
                  <Route index element={<Home />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:projectId" element={<ProjectDetails />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/tasks/:taskId" element={<TaskDetails />} />
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
                  <Route path="/reports" element={<Navigate to="/analytics" replace />} />
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
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
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
