import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Menu, Moon, Plus, Search, Sun, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { EditTimeEntryDialog } from "@/components/time/EditTimeEntryDialog";
import { GlobalSearch } from "@/components/search/GlobalSearch";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { UserProfileDialog } from "@/components/users/UserProfileDialog";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { TimerBox } from "@/components/time/TimerBox";
import { getRoleName } from "@/utils/roleUtils";

export function TopBar() {
  const { currentUser, customRoles } = useAppContext();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar, isMobile } = useSidebar();
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isTimerBoxOpen, setIsTimerBoxOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsProfileDialogOpen(true);
  };
  
  return (
    <header className="sticky top-0 z-50 border-b bg-background px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {/* Mobile menu button */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="flex-shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}
          
          {/* Search - hidden on mobile, shown on larger screens */}
          <div className="relative hidden sm:flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search tasks... (Ctrl+K)"
              className="w-[180px] lg:w-[300px] pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
          </div>

          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden flex-shrink-0"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          
          {/* Notifications */}
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
          
          {/* Quick Action Plus Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className="rounded-full bg-primary text-primary-foreground flex-shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Quick Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsTimerDialogOpen(true)}>
                <Timer className="mr-2 h-4 w-4" />
                Start Timer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManualEntryDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manual Entry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsProjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{getRoleName(currentUser, customRoles)}</p>
              </div>
              
              <Avatar 
                className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary hover:scale-110 transition-all duration-200 cursor-pointer"
                onClick={handleAvatarClick}
                title="Open Profile Settings"
              >
                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-lg font-bold">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-destructive bg-destructive/10 p-1 sm:p-2 rounded">
              ⚠️ User not loaded
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      <StartTimerDialog 
        open={isTimerDialogOpen} 
        onOpenChange={setIsTimerDialogOpen}
        onStartTimer={() => setIsTimerDialogOpen(false)}
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

      <GlobalSearch 
        externalOpen={isSearchOpen}
        onExternalOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
        initialQuery={searchQuery}
      />
    </header>
  );
}
