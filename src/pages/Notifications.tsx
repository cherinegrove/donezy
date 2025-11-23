
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MessageSquare, CheckCircle, Clock, User, ExternalLink, Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Notifications() {
  const { messages, users, projects, tasks, currentUser, markMessageAsRead, clients } = useAppContext();
  const navigate = useNavigate();
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

    if (message.content.toLowerCase().includes('you were mentioned')) {
      return 'Mention';
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
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedNotification ? (
          <div className="max-w-4xl mx-auto">
            {/* Notification Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={users.find(user => user.auth_user_id === selectedNotification.senderId)?.avatar} />
                      <AvatarFallback>
                        {users.find(user => user.auth_user_id === selectedNotification.senderId)?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(selectedNotification)}
                        <h3 className="font-semibold">
                          {users.find(user => user.auth_user_id === selectedNotification.senderId)?.name}
                        </h3>
                        {!selectedNotification.read && <Badge variant="destructive">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(selectedNotification.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{getNotificationContext(selectedNotification)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{selectedNotification.content}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedNotification.timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Task Details - Only show if notification is task-related */}
            {selectedNotification.taskId && (() => {
              const task = tasks.find(t => t.id === selectedNotification.taskId);
              if (!task) return <div className="text-center py-8 text-muted-foreground">Task not found</div>;
              
              const project = projects.find(p => p.id === task.projectId);
              const client = project ? clients.find(c => c.id === project.clientId) : null;
              const assignee = task.assigneeId ? users.find(u => u.id === task.assigneeId || u.auth_user_id === task.assigneeId) : null;
              const collaborators = (task.collaboratorIds || []).map(id => 
                users.find(u => u.id === id || u.auth_user_id === id)
              ).filter(Boolean);

              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Task Details
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Task
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Task Title & Description */}
                    <div>
                      <h4 className="font-semibold text-lg mb-2">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Task Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Priority</p>
                        <Badge 
                          variant="outline" 
                          className={
                            task.priority === 'high' ? 'border-red-500 text-red-500' :
                            task.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                            'border-green-500 text-green-500'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Calendar className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className={`text-sm font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                            {format(new Date(task.dueDate), 'PPP')}
                            {isOverdue && <span className="ml-2">(Overdue)</span>}
                          </p>
                        </div>
                        {isOverdue && <AlertCircle className="h-5 w-5 text-red-500" />}
                      </div>
                    )}

                    <Separator />

                    {/* Project & Client */}
                    <div className="space-y-2">
                      {project && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Project</p>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm font-medium"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            {project.name}
                          </Button>
                        </div>
                      )}
                      {client && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Client</p>
                          <p className="text-sm">{client.name}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Assignee & Collaborators */}
                    <div className="space-y-3">
                      {assignee && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Assignee</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback>{assignee.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{assignee.name}</span>
                          </div>
                        </div>
                      )}
                      
                      {collaborators.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Collaborators</p>
                          <div className="flex flex-wrap gap-2">
                            {collaborators.map((collab) => (
                              <div key={collab.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={collab.avatar} />
                                  <AvatarFallback className="text-xs">{collab.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{collab.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hours */}
                    {(task.estimatedHours || task.actualHours) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          {task.estimatedHours && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Estimated Hours</p>
                              <p className="text-sm font-medium">{task.estimatedHours}h</p>
                            </div>
                          )}
                          {task.actualHours && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Actual Hours</p>
                              <p className="text-sm font-medium">{task.actualHours}h</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Project Details - Only show if notification is project-related and not task-related */}
            {selectedNotification.projectId && !selectedNotification.taskId && (() => {
              const project = projects.find(p => p.id === selectedNotification.projectId);
              if (!project) return <div className="text-center py-8 text-muted-foreground">Project not found</div>;
              
              const client = clients.find(c => c.id === project.clientId);
              const owner = project.ownerId ? users.find(u => u.id === project.ownerId || u.auth_user_id === project.ownerId) : null;

              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Project Details
                      </CardTitle>
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
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge variant="outline">{project.status}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Service Type</p>
                        <Badge variant="outline">{project.serviceType}</Badge>
                      </div>
                    </div>

                    {client && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Client</p>
                          <p className="text-sm font-medium">{client.name}</p>
                        </div>
                      </>
                    )}

                    {owner && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Owner</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={owner.avatar} />
                              <AvatarFallback>{owner.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{owner.name}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Notification</h3>
              <p className="text-sm">Choose a notification from the sidebar to view its details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
