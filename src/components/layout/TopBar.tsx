
import { useAppContext } from "@/contexts/AppContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu, Moon, Plus, Search, Sun, Timer, Settings, User, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { useNavigate } from "react-router-dom";
import { UserProfileDialog } from "@/components/users/UserProfileDialog";

export function TopBar() {
  const { currentUser, clients } = useAppContext();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  // Toggle between light and dark mode
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Avatar clicked, opening profile dialog");
    console.log("Current user:", currentUser);
    console.log("Setting isProfileDialogOpen to true");
    setIsProfileDialogOpen(true);
  };
  
  return (
    <header className="border-b bg-background px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
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
          
          {/* Messages Notifications */}
          <NotificationsPopover />
          
          {/* Quick Action Plus Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className="rounded-full bg-primary text-primary-foreground ml-2"
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Quick actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsTimerDialogOpen(true)}>
                <Timer className="mr-2 h-4 w-4" />
                <span>Start Timer</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Task</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNoteDialogOpen(true)}>
                <StickyNote className="mr-2 h-4 w-4" />
                <span>Create Note</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.role}</p>
              </div>
              
              {/* User Avatar - Click to open profile dialog */}
              <button 
                onClick={handleAvatarClick}
                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {currentUser.name.charAt(0)}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      <StartTimerDialog 
        open={isTimerDialogOpen} 
        onOpenChange={setIsTimerDialogOpen}
        onStartTimer={() => {}}
      />
      
      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
      />

      <CreateNoteDialog
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
      />

      {currentUser && (
        <UserProfileDialog
          open={isProfileDialogOpen}
          onOpenChange={(open) => {
            console.log("Profile dialog onOpenChange called with:", open);
            setIsProfileDialogOpen(open);
          }}
          userId={currentUser.id}
        />
      )}
    </header>
  );
}
