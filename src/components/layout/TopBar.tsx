
import { useAppContext } from "@/contexts/AppContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu, Moon, Plus, Search, Sun, Timer, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { UserProfileDialog } from "@/components/users/UserProfileDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { TimerBox } from "@/components/time/TimerBox";
import { getRoleName } from "@/utils/roleUtils";

export function TopBar() {
  const { currentUser, clients, customRoles, activeTimeEntry } = useAppContext();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isTimerBoxOpen, setIsTimerBoxOpen] = useState(false);
  
  // Toggle between light and dark mode
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          
          {/* Timer Box Toggle */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTimerBoxOpen(!isTimerBoxOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Timer className="h-5 w-5" />
              <span className="sr-only">Toggle timer box</span>
            </Button>
            
            <TimerBox 
              isOpen={isTimerBoxOpen} 
              onClose={() => setIsTimerBoxOpen(false)} 
            />
          </div>
          
          {/* Quick Action Plus Button - DEBUGGING VERSION */}
          
          {/* Test 1: Simple button to bypass DropdownMenu */}
          <Button 
            variant="default" 
            size="icon" 
            className="rounded-full bg-red-500 text-white ml-2 mr-2"
            onClick={() => {
              console.log('🟥 SIMPLE BUTTON CLICKED - THIS SHOULD WORK');
              setIsTimerDialogOpen(true);
            }}
            data-testid="simple-plus-button"
          >
            <Plus className="h-5 w-5" />
          </Button>
          
          {/* Test 2: Original DropdownMenu with extra debugging */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className="rounded-full bg-primary text-primary-foreground ml-2"
                data-testid="dropdown-plus-button"
                onClick={(e) => {
                  console.log('🔵 DROPDOWN TRIGGER CLICKED - Direct click handler');
                  console.log('🔍 Click event details:', {
                    target: e.target,
                    currentTarget: e.currentTarget,
                    elementFromPoint: document.elementFromPoint(e.clientX, e.clientY)
                  });
                }}
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Quick actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="bg-background border shadow-md z-50"
            >
              <DropdownMenuItem onClick={() => {
                console.log('🔘 Plus button clicked - Start Timer option selected');
                console.log('🔍 Current state before opening dialog:', {
                  isTimerDialogOpen,
                  hasActiveTimer: !!activeTimeEntry,
                  activeTimerId: activeTimeEntry?.id
                });
                setIsTimerDialogOpen(true);
                console.log('🔄 Timer dialog should now be open:', true);
              }}>
                <Timer className="mr-2 h-4 w-4" />
                <span>Start Timer</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsProjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Task</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Test 3: Add debugging script for DOM element detection */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Auto-run click detection test
                setTimeout(() => {
                  const rect = document.querySelector('[data-testid="dropdown-plus-button"]')?.getBoundingClientRect();
                  if (rect) {
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const elementAtPoint = document.elementFromPoint(centerX, centerY);
                    console.log('🎯 Element detection test:', {
                      buttonRect: rect,
                      centerCoords: [centerX, centerY],
                      elementAtPoint: elementAtPoint,
                      isButtonItself: elementAtPoint?.closest('[data-testid="dropdown-plus-button"]') !== null
                    });
                  }
                }, 1000);
              `
            }}
          />
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

          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{getRoleName(currentUser, customRoles)}</p>
              </div>
              
              {/* User Avatar - Click to open profile dialog */}
              <Button
                variant="outline"
                size="icon"
                title="Open Profile Settings"
                onClick={handleAvatarClick}
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground border-2 border-primary hover:scale-110 text-lg font-bold transition-all duration-200 cursor-pointer"
              >
                {currentUser.name.charAt(0)}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-red-500 bg-red-100 p-2 rounded">
              ⚠️ User not loaded - you may need to refresh
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
      
      <CreateProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
      />

      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
      />


      {currentUser && (
        <UserProfileDialog
          open={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          userId={currentUser.id}
        />
      )}
    </header>
  );
}
