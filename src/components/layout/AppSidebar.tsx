import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useRbac } from "@/hooks/useRbac";
import { useSidebar, MobileSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  BarChart,
  Clock,
  Bell,
  Briefcase,
  ListTodo,
  ShieldAlert,
  Settings,
  Users,
} from "lucide-react";

function NavSkeleton() {
  return (
    <div className="px-2 space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

function SidebarContent() {
  const { currentUser, session } = useAppContext();
  const { isAdmin: checkIsAdmin, can } = useRbac();
  const { setMobileOpen, isMobile } = useSidebar();

  const isLoading = !!session && !currentUser;
  const isAdmin = checkIsAdmin();

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, show: true },
    { to: "/projects", icon: Briefcase, label: "Projects", show: can("projects", "view") },
    { to: "/tasks", icon: ListTodo, label: "Tasks", show: can("tasks", "view") },
    { to: "/clients", icon: Users, label: "Clients", show: can("clients", "view") },
    { to: "/time", icon: Clock, label: "Time Tracking", show: can("time_entries", "view") },
    { to: "/notifications", icon: Bell, label: "Notifications", show: can("notifications", "view") },
    { to: "/analytics", icon: BarChart, label: "Analytics", show: can("analytics", "view") },
    { to: "/settings", icon: Settings, label: "Integrations", show: can("integrations", "view") },
  ].filter((item) => item.show);
  
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 flex items-center px-4 gap-4 border-b">
        <NavLink to="/" className="flex items-center gap-2 font-semibold" onClick={handleNavClick}>
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary">
            <span className="text-primary-foreground text-sm">DZ</span>
          </div>
          <span className="text-lg">donezy</span>
        </NavLink>
      </div>
      
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="py-4">
          {isLoading ? (
            <NavSkeleton />
          ) : (
          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )
                }
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}
          </nav>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function AppSidebar() {
  const { isMobile } = useSidebar();
  
  // On mobile, render sidebar inside a Sheet (drawer)
  if (isMobile) {
    return (
      <MobileSidebar>
        <SidebarContent />
      </MobileSidebar>
    );
  }
  
  // On desktop, render fixed sidebar
  return (
    <div className="w-[280px] flex-shrink-0 border-r border-border sticky top-0 h-screen">
      <SidebarContent />
    </div>
  );
}
