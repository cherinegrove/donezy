
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Building2, DollarSign, Bell, Users, Settings, 
  ChevronLeft, ChevronRight, LogOut, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { to: "/admin-portal", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin-portal/accounts", icon: Building2, label: "Accounts" },
  { to: "/admin-portal/financials", icon: DollarSign, label: "Financials" },
  { to: "/admin-portal/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin-portal/audit-log", icon: Shield, label: "Audit Log" },
  { to: "/admin-portal/settings", icon: Settings, label: "Settings" },
];

export function AdminPortalLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">Donezy Admin</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
