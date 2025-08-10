
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import {
  LayoutDashboard,
  BarChart,
  Clock,
  Bell,
  Briefcase,
  ListTodo,
  ShieldAlert,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  // Update to correctly handle the sidebar context
  const sidebar = useSidebar();
  // Provide defaults in case sidebar context is null
  const collapsed = sidebar?.collapsed ?? false;
  const setCollapsed = sidebar?.setCollapsed ?? (() => {});
  
  const location = useLocation();
  const { currentUser, customRoles } = useAppContext();
  const isMobile = useIsMobile();
  
  // If on mobile, and sidebar is open, clicking a nav link should close the sidebar
  const handleNavClick = () => {
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  };
  
  // Check if user is admin
  const isAdmin = currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin';
  
  return (
    <div
      className={cn(
        "fixed inset-y-0 z-30 md:relative flex-col bg-background border-r border-border transition-transform md:flex",
        collapsed ? "md:w-[90px] w-0" : "md:w-[280px] w-[280px]",
        !collapsed && !isMobile ? "flex translate-x-0" : "flex md:translate-x-0 -translate-x-full"
      )}
    >
      <div className="h-14 flex items-center px-4 gap-4 border-b">
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          {/* Logo */}
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary">
            <span className="text-primary-foreground text-sm">DZ</span>
          </div>
          {!collapsed && <span className="text-lg">donezy</span>}
        </NavLink>
      </div>
      
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="py-4">
          <nav className="px-2 space-y-1">
            {/* Dashboard */}
            <NavLink
              to="/"
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )
              }
              end
            >
              <LayoutDashboard className="h-4 w-4" />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
            
            {/* Projects */}
            <NavLink
              to="/projects"
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
              <Briefcase className="h-4 w-4" />
              {!collapsed && <span>Projects</span>}
            </NavLink>
            
            {/* Tasks */}
            <NavLink
              to="/tasks"
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
              <ListTodo className="h-4 w-4" />
              {!collapsed && <span>Tasks</span>}
            </NavLink>
            
            
            {/* Time */}
            <NavLink
              to="/time"
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
              <Clock className="h-4 w-4" />
              {!collapsed && <span>Time Tracking</span>}
            </NavLink>
            
            {/* Notifications (changed from Messages) */}
            <NavLink
              to="/notifications"
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
              <Bell className="h-4 w-4" />
              {!collapsed && <span>Notifications</span>}
            </NavLink>
            
            {/* Reports */}
            <NavLink
              to="/reports"
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
              <BarChart className="h-4 w-4" />
              {!collapsed && <span>Reports</span>}
            </NavLink>
            
            {/* Admin Dashboard - only shown to admin users */}
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
                {!collapsed && <span>Admin Dashboard</span>}
              </NavLink>
            )}
          </nav>
        </div>
      </ScrollArea>
      
      <div className="h-14 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 w-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            {collapsed ? (
              <path d="m9 18 6-6-6-6" />
            ) : (
              <path d="m15 18-6-6 6-6" />
            )}
          </svg>
        </Button>
      </div>
    </div>
  );
}
