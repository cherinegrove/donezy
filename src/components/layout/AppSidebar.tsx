
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger
} from "@/components/ui/sidebar";
import {
  Clock,
  Home,
  Briefcase,
  BarChart,
  Building,
  Settings,
  FileText,
  MessageSquare,
  CheckSquare
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export function AppSidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { currentUser, getUnreadMessageCount, customRoles } = useAppContext();
  
  const unreadMessages = currentUser ? getUnreadMessageCount(currentUser.id) : 0;
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Check if the user has access to a specific feature
  const hasAccess = (feature: string) => {
    if (!currentUser) return false;
    
    // Admin always has access to everything
    if (currentUser.role === 'admin') return true;
    
    // Check custom role permissions if user has a custom role
    if (currentUser.customRoleId) {
      const userRole = customRoles.find(role => role.id === currentUser.customRoleId);
      if (userRole) {
        const permission = userRole.permissions[feature as keyof typeof userRole.permissions];
        return permission !== 'none';
      }
    }
    
    // Default permissions based on built-in roles
    if (currentUser.role === 'manager') return true;
    if (currentUser.role === 'developer' && 
        (feature === 'tasks' || feature === 'timeTracking' || feature === 'projects')) {
      return true;
    }
    if (currentUser.role === 'client' && feature === 'projects') {
      return true;
    }
    
    return false;
  };
  
  const navItems = [
    {
      name: "Dashboard",
      icon: Home,
      path: "/",
      feature: "accountSettings" // Dashboard is part of account settings
    },
    {
      name: "Projects",
      icon: Briefcase,
      path: "/projects",
      feature: "projects"
    },
    {
      name: "Tasks",
      icon: CheckSquare,
      path: "/tasks",
      feature: "tasks"
    },
    {
      name: "Clients",
      icon: Building,
      path: "/clients",
      feature: "clients"
    },
    {
      name: "Time Tracking",
      icon: Clock,
      path: "/time",
      feature: "timeTracking"
    },
    {
      name: "Reports",
      icon: BarChart,
      path: "/reports",
      feature: "reports"
    },
    {
      name: "Messages",
      icon: MessageSquare,
      path: "/messages",
      feature: "accountSettings", // Messages is part of general account settings
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    }
  ];

  // Filter out items the user doesn't have access to
  const accessibleItems = navItems.filter(item => hasAccess(item.feature));

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-6">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="h-6 w-6" />
          <span className="text-xl">Manex</span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center">
          {accessibleItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isActive(item.path) && "bg-secondary/50"
              )}
              onClick={() => window.location.href = item.path}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </Button>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        {hasAccess("accountSettings") && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => window.location.href = "/settings"}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
