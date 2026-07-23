
import { useState, lazy, Suspense } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageSquare, CheckCircle, Clock, User, ExternalLink, AtSign, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const mentionNotifications = allNotifications.filter(msg =>
    msg.subject?.toLowerCase().includes('mentioned') ||
    msg.content.toLowerCase().includes('you were mentioned')
  );

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

  const getNotificationTypeInfo = (message: Message) => {
    if (message.content.includes(`@${currentUser?.name}`)) {
      return { color: "from-blue-500/20 to-blue-600/20", borderColor: "border-l-blue-500", label: "Mention", icon: AtSign };
    }
    if (message.taskId) {
      return { color: "from-green-500/20 to-green-600/20", borderColor: "border-l-green-500", label: "Task", icon: CheckCircle };
    }
    if (message.projectId) {
      return { color: "from-orange-500/20 to-orange-600/20", borderColor: "border-l-orange-500", label: "Project", icon: Clock };
    }
    return { color: "from-gray-500/20 to-gray-600/20", borderColor: "border-l-gray-500", label: "Message", icon: MessageSquare };
  };

  const NotificationsList = ({ notifications }: { notifications: Message[] }) => {
    const filtered = filterNotifications(notifications);
    return (
      <div className="space-y-2">
        {filtered.map(notification => {
          const sender = users.find(u => u.auth_user_id === notification.senderId);
          const typeInfo = getNotificationTypeInfo(notification);
          const IconComponent = typeInfo.icon;
          return (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${typeInfo.borderColor} bg-gradient-to-r ${typeInfo.color} ${selectedNotification?.id === notification.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0 border border-border">
                  <AvatarImage src={sender?.avatar} />
                  <AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                    <span className="text-sm font-medium truncate">{sender?.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">{typeInfo.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{getNotificationContext(notification)}</p>
                  <p className="text-sm leading-snug mb-2 line-clamp-2">{notification.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</span>
                    {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs">You're all caught up!</p>
          </div>
        )}
      </div>
    );
  };

  // For non-task notifications (project-only), show inline detail panel
  const showDetailPanel = selectedNotification && !selectedNotification.taskId;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Notifications List */}
      <div className="w-96 border-r flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex-shrink-0 border-b">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Stay updated on mentions and activity</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 flex-shrink-0">
          <Input
            type="search"
            placeholder="Search notifications..."
            className="mb-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 flex-shrink-0">
            <div className="flex items-center gap-1 border-b bg-muted/30 rounded-lg p-1">
              <TabsList className="bg-transparent border-0 w-full">
                <TabsTrigger value="all" className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground flex-1">
                  <Bell className="h-4 w-4 mr-2" />
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground flex-1">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Unread
                  {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">{unreadNotifications.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="mentions" className="text-sm data-[state=active]:bg-background data-[state=active]:text-foreground flex-1">
                  <AtSign className="h-4 w-4 mr-2" />
                  Mentions
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto mt-4 pb-4 px-4">
            <TabsContent value="all" className="mt-0">
              <NotificationsList notifications={allNotifications} />
            </TabsContent>
            <TabsContent value="unread" className="mt-0">
              <NotificationsList notifications={unreadNotifications} />
            </TabsContent>
            <TabsContent value="mentions" className="mt-0">
              <NotificationsList notifications={mentionNotifications} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Right panel — only for project-only notifications */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/20">
        {showDetailPanel ? (
          <div className="max-w-4xl mx-auto p-8 pb-12">
            {selectedNotification.projectId && !selectedNotification.taskId && (() => {
              const project = projects.find(p => p.id === selectedNotification.projectId);
              if (!project) return (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Project not found</p>
                </div>
              );
              return (
                <Card className="border-l-4 border-l-orange-500 shadow-sm mb-6">
                  <CardHeader className="pb-3 bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-950/40 rounded-lg">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">Project Notification</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Project
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </CardContent>
                </Card>
              );
            })()}
            <NotificationReplySection taskId={selectedNotification.taskId || ""} />
          </div>
        ) : !editTaskOpen && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-4">
              <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto">
                <Bell className="h-10 w-10 opacity-30" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Select a Notification</h3>
                <p className="text-sm max-w-xs">Choose a notification from the list to view its details and reply</p>
              </div>
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
