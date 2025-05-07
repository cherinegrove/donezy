
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import { AppProvider } from "./contexts/AppContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId" element={<ClientDetails />} />
              <Route path="/team" element={<Team />} />
              <Route path="/time" element={<TimeTracking />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:messageId" element={<Messages />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
