
import { useAppContext } from "@/contexts/AppContext";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu, Moon, Plus, Search, Sun, Timer, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { EditTimeEntryDialog } from "@/components/time/EditTimeEntryDialog";

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
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  
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
    <header className="sticky top-0 z-50 border-b bg-background px-6 py-3">
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
          
          {/* Quick Action Plus Button - FIXED VERSION */}
          
          {/* Quick Action Plus Button with React debugging */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className="rounded-full bg-primary text-primary-foreground"
                onClick={(e) => {
                  console.log('🟢 DROPDOWN TRIGGER CLICKED');
                }}
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Quick Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={(e) => {
                  console.log('🚀 START TIMER MENU ITEM CLICKED');
                  setIsTimerDialogOpen(true);
                }}
              >
                <Timer className="mr-2 h-4 w-4" />
                Start Timer
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  console.log('📝 ADD MANUAL ENTRY MENU ITEM CLICKED');
                  setIsManualEntryDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Manual Entry
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  console.log('📋 CREATE TASK MENU ITEM CLICKED');
                  setIsTaskDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  console.log('📁 CREATE PROJECT MENU ITEM CLICKED');
                  setIsProjectDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Project
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
        onStartTimer={() => {
          console.log('✅ Timer started from TopBar');
          setIsTimerDialogOpen(false);
        }}
      />
      
      <CreateProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
      />

      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
      />

      <EditTimeEntryDialog
        isOpen={isManualEntryDialogOpen}
        onClose={() => setIsManualEntryDialogOpen(false)}
        timeEntry={undefined}
        isNewEntry={true}
      />

      {currentUser && (
        <UserProfileDialog
          open={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          userId={currentUser.auth_user_id}
        />
      )}
    </header>
  );
}
