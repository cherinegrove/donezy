import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AIChatbot } from "@/components/chat/AIChatbot";
import { useEffect } from "react";

export function AppLayout() {
  const navigate = useNavigate();
  
  // Listen for navigation event from notification click
  useEffect(() => {
    const handleNavigateToTask = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId } = customEvent.detail;
      if (taskId) {
        navigate(`/tasks/${taskId}`);
      }
    };

    window.addEventListener('navigateToTask', handleNavigateToTask);
    return () => window.removeEventListener('navigateToTask', handleNavigateToTask);
  }, [navigate]);
  
  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            
            <main className="flex-1 p-3 sm:p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>

        {/* AI Chatbot */}
        <AIChatbot />
      </SidebarProvider>
    </ThemeProvider>
  );
}
