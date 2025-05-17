
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { 
  Building, 
  Calendar, 
  ClipboardList, 
  Clock, 
  FileText, 
  Home, 
  MessageSquare, 
  Settings, 
  Users, 
  ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const location = useLocation();
  const { currentUser } = useAppContext();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isClient = currentUser?.role === 'client';

  return (
    <Sidebar>
      <div className="px-3 py-2">
        <h2 className="text-lg font-semibold mb-5 px-4">Manex</h2>
        
        <div className="space-y-1">
          <NavButton to="/" isActive={isActive('/')} icon={<Home className="h-5 w-5" />}>
            Dashboard
          </NavButton>
          
          <NavButton to="/messages" isActive={isActive('/messages')} icon={<MessageSquare className="h-5 w-5" />}>
            Messages
          </NavButton>

          <NavButton to="/tasks" isActive={isActive('/tasks')} icon={<ClipboardList className="h-5 w-5" />}>
            Tasks
          </NavButton>

          <NavButton to="/projects" isActive={isActive('/projects')} icon={<FileText className="h-5 w-5" />}>
            Projects
          </NavButton>

          {!isClient && (
            <NavButton to="/clients" isActive={isActive('/clients')} icon={<Building className="h-5 w-5" />}>
              Clients
            </NavButton>
          )}

          {(isAdmin || currentUser?.role === 'manager') && (
            <NavButton to="/team" isActive={isActive('/team')} icon={<Users className="h-5 w-5" />}>
              Team
            </NavButton>
          )}

          <NavButton to="/time" isActive={isActive('/time')} icon={<Clock className="h-5 w-5" />}>
            Time Tracking
          </NavButton>
          
          <NavButton to="/reports" isActive={isActive('/reports')} icon={<Calendar className="h-5 w-5" />}>
            Reports
          </NavButton>
          
          {isAdmin && (
            <NavButton to="/admin" isActive={isActive('/admin')} icon={<ShieldCheck className="h-5 w-5" />}>
              Admin
            </NavButton>
          )}

          <NavButton to="/settings" isActive={isActive('/settings')} icon={<Settings className="h-5 w-5" />}>
            Settings
          </NavButton>
        </div>
      </div>
    </Sidebar>
  );
}

function NavButton({ 
  to, 
  isActive, 
  icon, 
  children 
}: { 
  to: string; 
  isActive: boolean; 
  icon: React.ReactNode; 
  children: React.ReactNode 
}) {
  return (
    <Button
      asChild
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start',
        isActive && 'bg-muted text-foreground'
      )}
    >
      <Link to={to}>
        <span className="mr-3">{icon}</span>
        {children}
      </Link>
    </Button>
  );
}
