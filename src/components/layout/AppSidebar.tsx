
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
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
  Users,
  Settings,
  FileText,
  MessageSquare
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

export function AppSidebar() {
  const location = useLocation();
  const isMobile = useMobile();
  const { currentUser, getUnreadMessageCount } = useAppContext();
  
  const unreadMessages = currentUser ? getUnreadMessageCount(currentUser.id) : 0;
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  const navItems = [
    {
      name: "Dashboard",
      icon: Home,
      path: "/",
    },
    {
      name: "Projects",
      icon: Briefcase,
      path: "/projects",
    },
    {
      name: "Clients",
      icon: Building,
      path: "/clients",
    },
    {
      name: "Time Tracking",
      icon: Clock,
      path: "/time",
    },
    {
      name: "Team",
      icon: Users,
      path: "/team",
    },
    {
      name: "Reports",
      icon: BarChart,
      path: "/reports",
    },
    {
      name: "Messages",
      icon: MessageSquare,
      path: "/messages",
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    }
  ];

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
          {navItems.map((item) => (
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
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => window.location.href = "/settings"}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
