
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import Login from "./pages/Login";
import { AppProvider, useAppContext } from "./contexts/AppContext";

// Protected route component to handle role-based access and authentication
const ProtectedRoute = ({ 
  element, 
  allowedRoles = ['admin', 'manager', 'developer', 'client']
}: {
  element: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'developer' | 'client'>;
}) => {
  const { currentUser } = useAppContext();
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has permission
  const hasPermission = allowedRoles.includes(currentUser.role);
  
  return hasPermission ? element : <Navigate to="/" replace />;
};

// Public route component to handle already authenticated users
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  const { currentUser } = useAppContext();
  
  // Redirect to dashboard if already authenticated
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return element;
};

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { currentUser } = useAppContext();
  const isClient = currentUser?.role === 'client';
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute element={<Login />} />} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute element={<AppLayout />} />}>
        <Route index element={<Dashboard />} />
        
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />
        
        <Route path="/tasks" element={<Tasks />} />
        
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
        
        {/* Team management restricted for client users */}
        <Route 
          path="/team" 
          element={
            <ProtectedRoute 
              element={<Team />} 
              allowedRoles={['admin', 'manager', 'developer']} 
            />
          } 
        />
        
        <Route path="/time" element={<TimeTracking />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:messageId" element={<Messages />} />
        
        {/* Reports available to all but with different views */}
        <Route path="/reports" element={<Reports />} />
        
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
