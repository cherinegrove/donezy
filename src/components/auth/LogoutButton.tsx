import React from "react";
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
      console.log("🚪 Force logout initiated...");
      
      // Clean up auth state immediately
      cleanupAuthState();
      
      // Sign out from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        console.warn("Supabase signOut error (continuing anyway):", signOutError);
      }
      
      // Also log out locally
      logout();
      
      console.log("✅ Force logout completed, redirecting...");
      
      // Force page reload to login
      window.location.href = '/login';
      
    } catch (error) {
      console.error("❌ Error during logout:", error);
      
      // Force cleanup and redirect even on error
      cleanupAuthState();
      logout();
      window.location.href = '/login';
    }
  };

  // Force logout immediately on component mount (for debugging)
  React.useEffect(() => {
    const forceLogout = new URLSearchParams(window.location.search).get('forceLogout');
    if (forceLogout === 'true') {
      handleLogout();
    }
  }, []);

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