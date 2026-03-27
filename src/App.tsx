
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppProvider } from "./contexts/AppContext";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";
import ConfirmInvite from "./pages/ConfirmInvite";
import { AuthVerify } from '@/components/auth/AuthVerify';

// Auth & lightweight pages - safe to import statically
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

// Lazy-load ALL pages that directly or transitively import EditTaskDialog
// This breaks the circular dependency (TDZ) when navigating directly to /tasks/:taskId
const AppLayout = lazy(() => import("./components/layout/AppLayout").then(m => ({ default: m.AppLayout })));
const GlobalSearch = lazy(() => import("./components/search/GlobalSearch").then(m => ({ default: m.GlobalSearch })));
const Home = lazy(() => import("./pages/Home"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const Team = lazy(() => import("./pages/Team"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));
const Notes = lazy(() => import("./pages/Notes"));
const Admin = lazy(() => import("./pages/Admin"));
const Dashboards = lazy(() => import("./pages/Dashboards"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Activity = lazy(() => import("./pages/Activity"));

// Admin Portal (multi-tenant)
const AdminPortalLayout = lazy(() => import("./components/admin-portal/AdminPortalLayout").then(m => ({ default: m.AdminPortalLayout })));
const AdminPortalDashboard = lazy(() => import("./pages/admin-portal/AdminPortalDashboard"));
const AdminPortalAccounts = lazy(() => import("./pages/admin-portal/AdminPortalAccounts"));
const AdminPortalAccountDetail = lazy(() => import("./pages/admin-portal/AdminPortalAccountDetail"));
const AdminPortalFinancials = lazy(() => import("./pages/admin-portal/AdminPortalFinancials"));
const AdminPortalNotifications = lazy(() => import("./pages/admin-portal/AdminPortalNotifications"));
const AdminPortalAuditLog = lazy(() => import("./pages/admin-portal/AdminPortalAuditLog"));
const AdminPortalSettings = lazy(() => import("./pages/admin-portal/AdminPortalSettings"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Simplified Protected route component - avoid useLocation to prevent initialization errors
const ProtectedRoute = ({ 
  element, 
  allowedRoles = ['admin', 'manager', 'developer', 'client']
}: {
  element: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'developer' | 'client'>;
}) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState<string>('/login');
  
  useEffect(() => {
    // Capture current path for redirect BEFORE any async operations
    const currentPath = window.location.pathname + window.location.search;
    const redirectUrl = currentPath !== '/' 
      ? `/login?redirect=${encodeURIComponent(currentPath)}`
      : '/login';
    setLoginRedirectUrl(redirectUrl);

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
    return <Navigate to={loginRedirectUrl} replace />;
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
    console.error('React Error Boundary caught:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
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
              <Suspense fallback={null}>
                <GlobalSearch />
              </Suspense>
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/portal/:token" element={<ClientPortal />} />
                  
                  {/* Admin Portal (multi-tenant) - separate layout */}
                  <Route path="/admin-portal" element={<ProtectedRoute element={<AdminPortalLayout />} />}>
                    <Route index element={<AdminPortalDashboard />} />
                    <Route path="accounts" element={<AdminPortalAccounts />} />
                    <Route path="accounts/:accountId" element={<AdminPortalAccountDetail />} />
                    <Route path="financials" element={<AdminPortalFinancials />} />
                    <Route path="notifications" element={<AdminPortalNotifications />} />
                    <Route path="audit-log" element={<AdminPortalAuditLog />} />
                    <Route path="settings" element={<AdminPortalSettings />} />
                  </Route>
                  
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
              </Suspense>
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
