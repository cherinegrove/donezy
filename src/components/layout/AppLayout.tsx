
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ActiveTimeTracker } from "../time/ActiveTimeTracker";
import { useAppContext } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export function AppLayout() {
  const { activeTimeEntry } = useAppContext();
  
  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <TopBar />
            {activeTimeEntry && <ActiveTimeTracker />}
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
