import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DailyMetricsDialog } from "@/components/dashboard/DailyMetricsDialog";
import { useState, useEffect } from "react";

export function AppLayout() {
  const [showDailyMetrics, setShowDailyMetrics] = useState(false);
  const location = useLocation();

  // Don't show daily metrics when a task is open via deep link — it would
  // render on top of the task dialog and block all pointer events.
  const isTaskDeepLink = /^\/tasks\/[^/]+$/.test(location.pathname);

  // Close the dialog immediately if user navigates to a task deep link
  useEffect(() => {
    if (isTaskDeepLink) {
      setShowDailyMetrics(false);
      return;
    }

    const lastShown = localStorage.getItem("dailyMetricsLastShown");
    const today = new Date().toDateString();

    if (lastShown !== today) {
      const timer = setTimeout(() => {
        setShowDailyMetrics(true);
        localStorage.setItem("dailyMetricsLastShown", today);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isTaskDeepLink]);
  
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

        <DailyMetricsDialog 
          open={showDailyMetrics} 
          onOpenChange={setShowDailyMetrics} 
        />
      </SidebarProvider>
    </ThemeProvider>
  );
}

