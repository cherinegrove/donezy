import { useAppContext } from "@/contexts/AppContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";

export function TopBar() {
  const { currentUser } = useAppContext();
  const { theme, setTheme } = useTheme();
  const { isOpen, toggle } = useSidebar();
  
  return (
    <header className="border-b bg-background px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggle} className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[200px] lg:w-[300px] pl-8 bg-background"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <NotificationsPopover>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
            </Button>
          </NotificationsPopover>
          
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.role}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {currentUser.name.charAt(0)}
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
