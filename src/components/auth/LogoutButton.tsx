
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback values
// You should set these environment variables in your Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

type LogoutButtonProps = {
  variant?: 'button' | 'menuItem';
};

export function LogoutButton({ variant = 'button' }: LogoutButtonProps) {
  const { logout } = useAppContext();

  const handleLogout = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Also log out locally to maintain compatibility with the existing app
    logout();
  };

  if (variant === 'menuItem') {
    return (
      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
        <LogOut className="mr-2 h-4 w-4" />
        <span>Logout</span>
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Logout</span>
    </Button>
  );
}
