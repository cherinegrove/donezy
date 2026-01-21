import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useSidebar, MobileSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart,
  Clock,
  Bell,
  Briefcase,
  ListTodo,
  ShieldAlert,
  Settings,
} from "lucide-react";

function SidebarContent() {
  const location = useLocation();
  const { currentUser } = useAppContext();
  const { setMobileOpen, isMobile } = useSidebar();
  
  // Check if user is admin using systemRoles (consolidated role system)
  const isAdmin = currentUser?.systemRoles?.includes('platform_admin') || 
                  currentUser?.systemRoles?.includes('support_admin');

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/projects", icon: Briefcase, label: "Projects" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
    { to: "/time", icon: Clock, label: "Time Tracking" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/analytics", icon: BarChart, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Integrations" },
  ];
  
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
