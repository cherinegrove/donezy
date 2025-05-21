
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';

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
import Admin from "./pages/Admin"; 
import { AppProvider, useAppContext } from "./contexts/AppContext";

// Initialize Supabase client with fallback values
// You should set these environment variables in your Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Protected route component to handle role-based access and authentication
const ProtectedRoute = ({ 
  element, 
  allowedRoles = ['admin', 'manager', 'developer', 'client']
}: {
  element: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'developer' | 'client'>;
}) => {
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  // Redirect to login if not authenticated with Supabase
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has permission based on app context
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  const hasPermission = allowedRoles.includes(currentUser.role);
  
  return hasPermission ? element : <Navigate to="/" replace />;
};

// Public route component to handle already authenticated users
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  // Redirect to dashboard if already authenticated with Supabase
  if (authenticated) {
    return <Navigate to="/" replace />;
  }
  
  return element;
};

const queryClient = new QueryClient();

// The AppRoutes component needs to be inside the AppProvider
const AppRoutes = () => {
  const { currentUser } = useAppContext();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute element={<Login />} />} />
      <Route path="/signup" element={<PublicRoute element={<Signup />} />} />
      
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
