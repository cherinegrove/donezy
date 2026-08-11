import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useSidebar, MobileSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BarChart,
  Clock,
  Bell,
  Briefcase,
  ListTodo,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/projects", icon: Briefcase, label: "Projects" },
  { to: "/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/ai-assistant", icon: Sparkles, label: "AI Assistant" },
  { to: "/time", icon: Clock, label: "Time Tracking" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/analytics", icon: BarChart, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({ collapsed }: { collapsed?: boolean }) {
  const { currentUser } = useAppContext();

  const isAdmin = currentUser?.systemRoles?.includes('platform_admin') ||
                  currentUser?.systemRoles?.includes('support_admin');

  const items = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ to: "/admin", icon: ShieldAlert, label: "Admin Dashboard" }] : []),
  ];

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="py-4">
        <nav className={cn("space-y-1", collapsed ? "px-1" : "px-2")}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                  collapsed && "justify-center"
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </ScrollArea>
  );
}

export function AppSidebar() {
  const { isMobile, collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  // On mobile, render sidebar inside a Sheet (drawer)
  if (isMobile) {
    return (
      <MobileSidebar>
        <div className="flex flex-col h-full bg-background">
          <div className="h-14 flex items-center justify-between px-2 border-b">
            <NavLink to="/" className="flex items-center gap-2 font-semibold flex-1 min-w-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary flex-shrink-0">
                <span className="text-primary-foreground text-sm">DZ</span>
              </div>
              <span className="text-lg truncate">donezy</span>
            </NavLink>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8 flex-shrink-0"
              title="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SidebarContent />
        </div>
      </MobileSidebar>
    );
  }

  // On desktop, render fixed sidebar with collapse option
  return (
    <div className={cn(
      "flex-shrink-0 border-r border-border sticky top-0 h-screen flex flex-col transition-all duration-200",
      collapsed ? "w-[70px]" : "w-[280px]"
    )}>
      <div className="h-14 flex items-center justify-between px-2 border-b">
        {!collapsed && (
          <NavLink to="/" className="flex items-center gap-2 font-semibold flex-1 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary flex-shrink-0">
              <span className="text-primary-foreground text-sm">DZ</span>
            </div>
            <span className="text-lg truncate">donezy</span>
          </NavLink>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarContent collapsed={collapsed} />
    </div>
  );
}
