
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';

type LogoutButtonProps = {
  variant?: 'button' | 'menuItem';
};

const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if present
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export function LogoutButton({ variant = 'button' }: LogoutButtonProps) {
  const { logout } = useAppContext();

  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Sign out from Supabase with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
      // Also log out locally to maintain compatibility
      logout();
      
      console.log("Logout completed, redirecting...");
      
      // Force page reload to ensure clean state
      window.location.href = '/';
      
    } catch (error) {
      console.error("Error during logout:", error);
      
      // Even if there's an error, clean up and redirect
      cleanupAuthState();
      logout();
      window.location.href = '/';
    }
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
