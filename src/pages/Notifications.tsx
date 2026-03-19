
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageSquare, CheckCircle, Clock, User, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NotificationReplySection } from "@/components/notifications/NotificationReplySection";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import type { Task } from "@/types";

export default function Notifications() {
  const { messages, users, projects, tasks, currentUser, markMessageAsRead } = useAppContext();
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTaskOpen, setEditTaskOpen] = useState(false);

  // Get all notifications for current user
  const allNotifications = currentUser
    ? messages.filter(msg => msg.recipientIds.includes(currentUser.auth_user_id))
    : [];

  const unreadNotifications = allNotifications.filter(msg => !msg.read);

  const filterNotifications = (notifications: Message[]) => {
    if (!searchQuery) return notifications;
    return notifications.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getNotificationContext = (message: Message) => {
    if (message.projectId) {
      const project = projects.find(p => p.id === message.projectId);
      return project ? `Project: ${project.name}` : "Unknown Project";
    }
    if (message.taskId) {
      const task = tasks.find(t => t.id === message.taskId);
      return task ? `Task: ${task.title}` : "Unknown Task";
    }
    if (message.content.toLowerCase().includes("you were mentioned")) return "Mention";
    return "Direct Message";
  };

  const getNotificationIcon = (message: Message) => {
    if (message.content.includes(`@${currentUser?.name}`)) return <User className="h-4 w-4 text-blue-500" />;
    if (message.taskId) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (message.projectId) return <Clock className="h-4 w-4 text-orange-500" />;
    return <MessageSquare className="h-4 w-4 text-gray-500" />;
  };

  const handleNotificationClick = (notification: Message) => {
    if (!notification.read) markMessageAsRead(notification.id);
    setSelectedNotification(notification);

    // If task-related, open the EditTaskDialog directly
    if (notification.taskId) {
      const task = tasks.find(t => t.id === notification.taskId);
      if (task) {
        setEditTask(task);
        setEditTaskOpen(true);
      }
    }
  };

  const NotificationsList = ({ notifications }: { notifications: Message[] }) => {
    const filtered = filterNotifications(notifications);
    return (
      <div className="space-y-2">
        {filtered.map(notification => {
          const sender = users.find(u => u.auth_user_id === notification.senderId);
          return (
            <Button
              key={notification.id}
              variant="ghost"
              className={`w-full justify-start p-4 h-auto ${selectedNotification?.id === notification.id ? "bg-secondary" : ""}`}
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
                  <p className="text-xs text-muted-foreground mb-1">{getNotificationContext(notification)}</p>
                  <p className="text-sm truncate">{notification.content}</p>
                </div>
              </div>
            </Button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        )}
      </div>
    );
  };

  // For non-task notifications (project-only), show inline detail panel
  const showDetailPanel = selectedNotification && !selectedNotification.taskId;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Notifications List */}
      <div className="w-96 border-r flex flex-col overflow-hidden">
        <div className="p-4 pb-0 flex-shrink-0">
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
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden px-4">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="all">ALL</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto mt-4 pb-4">
            <TabsContent value="all" className="mt-0">
              <NotificationsList notifications={allNotifications} />
            </TabsContent>
            <TabsContent value="unread" className="mt-0">
              <NotificationsList notifications={unreadNotifications} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Right panel — only for project-only notifications */}
      <div className="flex-1 overflow-y-auto">
        {showDetailPanel ? (
          <div className="max-w-4xl mx-auto p-6 pb-12">
            {selectedNotification.projectId && !selectedNotification.taskId && (() => {
              const project = projects.find(p => p.id === selectedNotification.projectId);
              if (!project) return <div className="text-center py-8 text-muted-foreground">Project not found</div>;
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <h3 className="font-semibold">{project.name}</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Project
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </CardContent>
                </Card>
              );
            })()}
            <NotificationReplySection taskId={selectedNotification.taskId || ""} />
          </div>
        ) : !editTaskOpen && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Notification</h3>
              <p className="text-sm">Choose a notification from the sidebar to view its details</p>
            </div>
          </div>
        )}
      </div>

      {/* Single unified EditTaskDialog for task notifications */}
      {editTask && (
        <EditTaskDialog
          task={editTask}
          open={editTaskOpen}
          onOpenChange={(open) => {
            setEditTaskOpen(open);
            if (!open) setEditTask(null);
          }}
        />
      )}
    </div>
  );
}
