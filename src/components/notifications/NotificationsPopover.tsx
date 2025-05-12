
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPopover({ children }: { children?: React.ReactNode }) {
  const { messages, currentUser } = useAppContext();
  
  // Get unread notifications for current user
  const unreadNotifications = currentUser 
    ? messages.filter(msg => 
        msg.recipientIds.includes(currentUser.id) && 
        !msg.read
      )
    : [];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b">
          <h4 className="text-sm font-medium">Notifications</h4>
        </div>
        <ScrollArea className="h-80">
          {unreadNotifications.length > 0 ? (
            <div className="space-y-1">
              {unreadNotifications.map(notification => (
                <div key={notification.id} className="p-4 border-b last:border-0 hover:bg-muted/50">
                  <p className="text-sm">{notification.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
