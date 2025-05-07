
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateTaskDialog } from "../tasks/CreateTaskDialog";
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";

export function TopBar() {
  const navigate = useNavigate();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const { messages, currentUser } = useAppContext();
  
  // Get unread messages for the current user
  const unreadMessages = messages.filter(
    msg => msg.recipientIds.includes(currentUser?.id || "") && !msg.read
  );

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        <SidebarTrigger />
        <div className="ml-auto flex items-center space-x-4">
          <Button
            onClick={() => setIsCreateTaskOpen(true)}
            className="hidden md:flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadMessages.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {unreadMessages.length === 0 ? (
                <DropdownMenuItem>
                  <span>No new notifications</span>
                </DropdownMenuItem>
              ) : (
                unreadMessages.slice(0, 5).map((msg) => (
                  <DropdownMenuItem key={msg.id} onClick={() => navigate(`/messages/${msg.id}`)}>
                    <span className="font-medium">{msg.subject}</span>
                  </DropdownMenuItem>
                ))
              )}
              {unreadMessages.length > 5 && (
                <DropdownMenuItem onClick={() => navigate("/messages")}>
                  <span className="text-primary">View all messages</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full md:hidden"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
    </header>
  );
}
