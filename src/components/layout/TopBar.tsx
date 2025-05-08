
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Plus, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateTaskDialog } from "../tasks/CreateTaskDialog";
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { StartTimerDialog } from "../time/StartTimerDialog";

export function TopBar() {
  const navigate = useNavigate();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isStartTimerOpen, setIsStartTimerOpen] = useState(false);
  const { messages, currentUser, customRoles, activeTimeEntry, startTimeTracking, stopTimeTracking } = useAppContext();
  
  // Get unread messages for the current user
  const unreadMessages = messages.filter(
    msg => msg.recipientIds.includes(currentUser?.id || "") && !msg.read
  );

  // Sort notifications by timestamp (newest first)
  const sortedUnreadMessages = [...unreadMessages].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Check if the user has edit permission for tasks
  const hasTaskEditPermission = () => {
    if (!currentUser) return false;
    
    // Admin always has permission
    if (currentUser.role === 'admin') return true;
    
    // Check custom role permissions
    if (currentUser.customRoleId) {
      const userRole = customRoles.find(role => role.id === currentUser.customRoleId);
      if (userRole && userRole.permissions.tasks === 'edit') {
        return true;
      }
    }
    
    // Default permissions based on built-in roles
    return currentUser.role === 'manager' || currentUser.role === 'developer';
  };

  // Check if timer is currently running
  const isTimerRunning = !!activeTimeEntry;

  // Handle timer toggle
  const handleTimerToggle = () => {
    if (isTimerRunning) {
      stopTimeTracking("Time tracking stopped from header");
    } else {
      // Open the start timer dialog
      setIsStartTimerOpen(true);
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        <SidebarTrigger />
        <div className="ml-auto flex items-center space-x-4">
          {hasTaskEditPermission() && (
            <Button
              onClick={() => setIsCreateTaskOpen(true)}
              className="hidden md:flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
          <Button
            onClick={handleTimerToggle}
            variant={isTimerRunning ? "destructive" : "default"}
            className="hidden md:flex"
          >
            {isTimerRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Timer
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Timer
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {sortedUnreadMessages.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {sortedUnreadMessages.length === 0 ? (
                <DropdownMenuItem>
                  <span>No new notifications</span>
                </DropdownMenuItem>
              ) : (
                sortedUnreadMessages.slice(0, 5).map((msg) => (
                  <DropdownMenuItem key={msg.id} onClick={() => navigate(`/messages/${msg.id}`)}>
                    <div className="flex flex-col w-full">
                      <span className="font-medium">{msg.content.slice(0, 30)}{msg.content.length > 30 ? '...' : ''}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              {sortedUnreadMessages.length > 5 && (
                <DropdownMenuItem onClick={() => navigate("/messages")}>
                  <span className="text-primary">View all notifications ({sortedUnreadMessages.length})</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex md:hidden">
            {isTimerRunning ? (
              <Button
                size="icon"
                variant="destructive"
                className="rounded-full"
                onClick={handleTimerToggle}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className="rounded-full"
                onClick={handleTimerToggle}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
          {hasTaskEditPermission() && (
            <Button
              size="icon"
              variant="outline"
              className="rounded-full md:hidden"
              onClick={() => setIsCreateTaskOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
      <StartTimerDialog 
        open={isStartTimerOpen}
        onOpenChange={setIsStartTimerOpen}
        onStartTimer={() => {}}
      />
    </header>
  );
}
