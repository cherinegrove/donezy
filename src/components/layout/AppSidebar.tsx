
import { useLocation, Link } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <Card className="w-64 h-full border-r">
      <div className="p-4">
        <div className="font-bold text-lg mb-6">ProjectHub</div>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.url
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t">
        <div className="text-sm text-muted-foreground">
          {currentUser?.name || "User"}
        </div>
      </div>
    </Card>
  );
}
