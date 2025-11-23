
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Settings,
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();
  const { currentUser, customRoles } = useAppContext();
  
  // Check if user is admin - handle both role ID and direct role string
  const userRole = currentUser && customRoles.find(r => r.id === currentUser.roleId);
  const directRoleCheck = currentUser?.roleId?.toLowerCase().includes('admin');
  const customRoleCheck = userRole?.name?.toLowerCase().includes('admin');
  const isAdmin = directRoleCheck || customRoleCheck;
  
  // Temporary debug logging
  console.log('🔍 Sidebar Debug:', {
    currentUser: currentUser?.id,
    roleId: currentUser?.roleId,
    userRole: userRole?.name,
    directRoleCheck,
    customRoleCheck,
    isAdmin,
    customRolesCount: customRoles.length
  });
  
  return (
    <div className="w-[280px] flex flex-col bg-background border-r border-border">
      <div className="h-14 flex items-center px-4 gap-4 border-b">
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          {/* Logo */}
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary">
            <span className="text-primary-foreground text-sm">DZ</span>
          </div>
          <span className="text-lg">donezy</span>
        </NavLink>
      </div>
      
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="py-4">
          <nav className="px-2 space-y-1">
            {/* Dashboard */}
            <NavLink
              to="/"
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
              <span>Dashboard</span>
            </NavLink>
            
            {/* Projects */}
            <NavLink
              to="/projects"
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
              <span>Projects</span>
            </NavLink>
            
            {/* Tasks */}
            <NavLink
              to="/tasks"
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
              <span>Tasks</span>
            </NavLink>
            
            {/* Time */}
            <NavLink
              to="/time"
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
              <span>Time Tracking</span>
            </NavLink>
            
            {/* Notifications */}
            <NavLink
              to="/notifications"
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
              <span>Notifications</span>
            </NavLink>
            
            {/* Analytics */}
            <NavLink
              to="/analytics"
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
              <span>Analytics</span>
            </NavLink>
            
            {/* Integrations */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )
              }
            >
              <Settings className="h-4 w-4" />
              <span>Integrations</span>
            </NavLink>
            
            {/* Admin Dashboard - only shown to admin users */}
            {isAdmin && (
              <NavLink
                to="/admin"
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
