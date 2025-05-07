
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Briefcase, 
  List,
  Clock,
  Users,
  User,
  Settings,
  FileChart,
  MessageSquare
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, clients, projects, getUnreadMessageCount } = useAppContext();
  
  const unreadMessages = getUnreadMessageCount(currentUser?.id || "");
  
  const mainMenuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: List,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Briefcase,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: List,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
    },
    {
      title: "Time Tracking",
      url: "/time",
      icon: Clock,
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileChart,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center px-4 py-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="ml-2 text-lg font-semibold">Manex</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    active={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Clients</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clients.slice(0, 5).map((client) => (
                <SidebarMenuItem key={client.id}>
                  <SidebarMenuButton asChild>
                    <button
                      className="w-full"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <User className="h-5 w-5" />
                      <span>{client.name}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {clients.length > 5 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      className="w-full"
                      onClick={() => navigate("/clients")}
                    >
                      <span className="text-sm text-muted-foreground">View all clients</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.slice(0, 5).map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild>
                    <button
                      className="w-full"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <List className="h-5 w-5" />
                      <span>{project.name}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {projects.length > 5 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      className="w-full"
                      onClick={() => navigate("/projects")}
                    >
                      <span className="text-sm text-muted-foreground">View all projects</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center p-2 gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.avatar || ""} />
              <AvatarFallback>{currentUser?.name?.slice(0, 2) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
