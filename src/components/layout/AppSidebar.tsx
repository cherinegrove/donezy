
import { useLocation, Link } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  Users, 
  MessageSquare, 
  Building2, 
  BarChart3,
  StickyNote,
  Shield
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();
  const { currentUser } = useAppContext();

  const navigationItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FolderOpen,
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Time Tracking",
      url: "/time-tracking",
      icon: Clock,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Building2,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Notes",
      url: "/notes",
      icon: StickyNote,
    },
  ];

  // Add Admin link only for admin users
  if (currentUser?.role === 'admin') {
    navigationItems.push({
      title: "Admin",
      url: "/admin",
      icon: Shield,
    });
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="font-bold text-lg">ProjectHub</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-sm text-muted-foreground">
          {currentUser?.name || "User"}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
