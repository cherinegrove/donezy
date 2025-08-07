import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const NotificationsCard = ({ onRemove, userId }: { onRemove?: () => void; userId?: string }) => {
  const { messages, currentUser } = useAppContext();

  // If userId is provided, show notifications for that user (for managers/admins viewing other users)
  // Otherwise show notifications for current user
  const targetUserId = userId || currentUser?.id;

  const unreadNotifications = messages.filter(msg => 
    msg.recipientIds?.includes(targetUserId) && 
    !msg.read
  ).slice(0, 4);

  return (
    <DashboardCard
      title="Unread Notifications"
      icon={<Bell className="h-4 w-4" />}
      onRemove={onRemove}
    >
      {unreadNotifications.length > 0 ? (
        <div className="space-y-2">
          {unreadNotifications.map((notification) => (
            <div key={notification.id} className="p-2 bg-muted rounded-md">
              <p className="text-sm font-medium">{notification.content}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No unread notifications</p>
      )}
    </DashboardCard>
  );
};