
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageSquare, CheckCircle, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { messages, users, projects, tasks, currentUser, markMessageAsRead } = useAppContext();
  const [selectedNotification, setSelectedNotification] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all notifications for current user
  const allNotifications = currentUser 
    ? messages.filter(msg => 
        msg.recipientIds.includes(currentUser.auth_user_id)
      )
    : [];

  // Categorize notifications
  const unreadNotifications = allNotifications.filter(msg => !msg.read);
  const mentionNotifications = allNotifications.filter(msg => 
    msg.content.includes(`@${currentUser?.name}`)
  );
  const taskNotifications = allNotifications.filter(msg => msg.taskId);
  const projectNotifications = allNotifications.filter(msg => msg.projectId);

  // Filter by search query
  const filterNotifications = (notifications: Message[]) => {
    if (!searchQuery) return notifications;
    return notifications.filter(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getNotificationContext = (message: Message) => {
    if (message.projectId) {
      const project = projects.find(p => p.id === message.projectId);
      return project ? `Project: ${project.name}` : 'Unknown Project';
    }
    
    if (message.taskId) {
      const task = tasks.find(t => t.id === message.taskId);
      return task ? `Task: ${task.title}` : 'Unknown Task';
    }

    if (message.subject.toLowerCase().includes('you were mentioned by')) {
      return 'Mention'
    }
    
    return 'Direct Message';
  };

  const getNotificationIcon = (message: Message) => {
    if (message.content.includes(`@${currentUser?.name}`)) {
      return <User className="h-4 w-4 text-blue-500" />;
    }
    if (message.taskId) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (message.projectId) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    return <MessageSquare className="h-4 w-4 text-gray-500" />;
  };

  const handleNotificationClick = (notification: Message) => {
    if (!notification.read) {
      markMessageAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const NotificationsList = ({ notifications }: { notifications: Message[] }) => {
    const filteredNotifications = filterNotifications(notifications);
    
    return (
      <div className="space-y-2">
        {filteredNotifications.map(notification => {
          const sender = users.find(user => user.auth_user_id === notification.senderId);
          return (
            <Button
              key={notification.id}
              variant="ghost"
              className={`w-full justify-start p-4 h-auto ${selectedNotification?.id === notification.id ? 'bg-secondary' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={sender?.avatar} />
                  <AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getNotificationIcon(notification)}
                    <span className="text-sm font-medium truncate">{sender?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </span>
                    {!notification.read && <Badge variant="destructive" className="text-xs">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {getNotificationContext(notification)}
                  </p>
                  <p className="text-sm truncate">{notification.content}</p>
                </div>
              </div>
            </Button>
          );
        })}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Notifications List */}
      <div className="w-96 border-r p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive">{unreadNotifications.length}</Badge>
          )}
        </div>
        
        <Input 
          type="search" 
          placeholder="Search notifications..." 
          className="mb-4"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">ALL</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <TabsContent value="all" className="mt-0">
              <NotificationsList notifications={allNotifications} />
            </TabsContent>
            
            <TabsContent value="unread" className="mt-0">
              <NotificationsList notifications={unreadNotifications} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Notification Content */}
      <div className="flex-1 p-4">
        {selectedNotification ? (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {getNotificationIcon(selectedNotification)}
                <h3 className="text-xl font-semibold">
                  {users.find(user => user.auth_user_id === selectedNotification.senderId)?.name}
                </h3>
                {!selectedNotification.read && <Badge variant="destructive">New</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {getNotificationContext(selectedNotification)}
              </p>
            </div>
            <div className="mb-6 p-4 border rounded-md">
              <p className="whitespace-pre-wrap">{selectedNotification.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(selectedNotification.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Notification</h3>
              <p className="text-sm">Choose a notification from the sidebar to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
