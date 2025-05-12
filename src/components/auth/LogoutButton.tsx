
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { logout } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
      variant: "default",
    });
    navigate("/login", { replace: true });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      <span>Logout</span>
    </Button>
  );
}
