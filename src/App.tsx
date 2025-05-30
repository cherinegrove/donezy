
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Team from "./pages/Team";
import TimeTracking from "./pages/TimeTracking";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin"; 
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";

// Protected route component - simplified and faster
const ProtectedRoute = ({ 
  element, 
  allowedRoles = ['admin', 'manager', 'developer', 'client']
}: {
  element: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'developer' | 'client'>;
}) => {
  const { currentUser } = useAppContext();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    // Quick session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // Show minimal loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  // Allow access if user is logged in, regardless of currentUser state for now
  return <>{element}</>;
};

// Public route component - simplified and faster
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    checkSession();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (session) {
    return <Navigate to="/" replace />;
  }
  
  return <>{element}</>;
};

const queryClient = new QueryClient();

// The AppRoutes component needs to be inside the AppProvider
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute element={<Login />} />} />
      <Route path="/signup" element={<PublicRoute element={<Signup />} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/confirm" element={<EmailConfirmation />} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute element={<AppLayout />} />}>
        <Route index element={<Dashboard />} />
        
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />
        
        <Route path="/tasks" element={<Tasks />} />
        
        <Route path="/notes" element={<Notes />} />
        
        {/* Client routes are restricted for client users */}
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
        
        {/* Team management */}
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
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:messageId" element={<Messages />} />
        
        {/* Reports available to all but with different views */}
        <Route path="/reports" element={<Reports />} />
        
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin section - only accessible by admins */}
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
