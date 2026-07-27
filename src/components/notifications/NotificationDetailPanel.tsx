import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message, Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotificationReplySection } from "@/components/notifications/NotificationReplySection";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  MessageSquare,
  AtSign,
  ExternalLink,
  Flag,
  Calendar,
  Users,
  Activity,
  Bell,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface NotificationDetailPanelProps {
  notification: Message;
}

export function NotificationDetailPanel({ notification }: NotificationDetailPanelProps) {
  const { users, tasks, projects, currentUser, updateTask, createMessage } = useAppContext();
  const navigate = useNavigate();
  const [isMarking, setIsMarking] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);

  const sender = users.find(u => u.auth_user_id === notification.senderId);
  const task = notification.taskId ? tasks.find(t => t.id === notification.taskId) : null;
  const project = notification.projectId ? projects.find(p => p.id === notification.projectId) : null;

  // Determine notification type
  const isTaskNotification = !!notification.taskId;
  const isProjectNotification = !!notification.projectId;
  const isMentionNotification = notification.content?.toLowerCase().includes('mentioned') ||
    notification.content?.toLowerCase().includes(`@${currentUser?.name}`);

  // Get notification type info
  const getTypeInfo = () => {
    if (isMentionNotification) {
      return { label: "Mention", icon: AtSign, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20" };
    }
    if (isTaskNotification) {
      return { label: "Task", icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950/20" };
    }
    if (isProjectNotification) {
      return { label: "Project", icon: Clock, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/20" };
    }
    return { label: "Message", icon: MessageSquare, color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-950/20" };
  };

  const typeInfo = getTypeInfo();
  const IconComponent = typeInfo.icon;

  const handleViewTask = () => {
    if (task) {
      navigate(`/tasks/${task.id}`);
    }
  };

  const handleMarkDone = async () => {
    if (!task) return;
    setIsMarking(true);
    try {
      await updateTask(task.id, { status: "done" });
    } catch (error) {
      console.error("Error marking task as done:", error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleSnooze = () => {
    // Toggle snooze visual state
    setIsSnoozed(!isSnoozed);
    // In a real implementation, this would interact with a notification snooze system
  };

  const handleViewProject = () => {
    if (project) {
      navigate(`/projects/${project.id}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "text-green-600 dark:text-green-400";
      case "in-progress":
        return "text-blue-600 dark:text-blue-400";
      case "review":
        return "text-purple-600 dark:text-purple-400";
      case "awaiting-feedback":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const taskAssignee = task && task.assigneeId ? users.find(u => u.auth_user_id === task.assigneeId) : null;
  const taskProject = task ? projects.find(p => p.id === task.projectId) : null;

  return (
    <div className="max-w-2xl mx-auto p-3 space-y-3">
      {/* Main Notification Card */}
      <Card className={`border-l-4 shadow-sm ${
        isMentionNotification ? 'border-l-blue-500' :
        isTaskNotification ? 'border-l-green-500' :
        isProjectNotification ? 'border-l-orange-500' :
        'border-l-gray-500'
      }`}>
        {/* Header */}
        <CardHeader className={`pb-2 ${typeInfo.bgColor}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-1.5 flex-1">
              <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                <AvatarImage src={sender?.avatar} />
                <AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{sender?.name || "Unknown User"}</span>
                  <Badge variant="outline" className="text-xs">
                    <IconComponent className="h-3 w-3 mr-1" />
                    {typeInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="pt-2">
          <div className="space-y-2">
            {/* Notification Message */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notification</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{notification.content}</p>
            </div>

            {/* Task Details (if task notification) */}
            {isTaskNotification && task && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Task Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-muted/30 p-2 rounded-lg">
                    {/* Task Title */}
                    <div className="md:col-span-2">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">TASK</p>
                      <p className="text-sm font-medium">{task.title}</p>
                    </div>

                    {/* Task Status */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">STATUS</p>
                      <Badge variant="outline" className={getTaskStatusColor(task.status)}>
                        {task.status.replace('-', ' ').charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                      </Badge>
                    </div>

                    {/* Task Priority */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">PRIORITY</p>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        <Flag className="h-3 w-3" />
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </div>
                    </div>

                    {/* Due Date */}
                    {task.dueDate && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">DUE DATE</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    )}

                    {/* Assignee */}
                    {taskAssignee && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">ASSIGNEE</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={taskAssignee.avatar} />
                            <AvatarFallback className="text-xs">{taskAssignee.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{taskAssignee.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Project */}
                    {taskProject && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">PROJECT</p>
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <span className="text-sm font-medium">{taskProject.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/projects/${taskProject.id}`)}
                            className="h-auto p-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Project Details (if project notification) */}
            {isProjectNotification && project && !isTaskNotification && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Project Details
                  </h3>

                  <div className="bg-muted/30 p-2 rounded-lg space-y-1.5">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">PROJECT NAME</p>
                      <p className="text-base font-medium">{project.name}</p>
                    </div>
                    {project.description && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">DESCRIPTION</p>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">STATUS</p>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Activity Timeline */}
            <Separator />
            <div className="space-y-1.5">
              <h3 className="font-semibold text-xs flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Activity
              </h3>
              <div className="pl-2 border-l-2 border-muted space-y-1.5">
                <div className="relative -ml-4 pl-4">
                  <div className="absolute -left-2 top-1.5 w-3 h-3 bg-primary rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Notification Created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.timestamp), 'MMMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {isTaskNotification && task && (
          <>
            <Button
              onClick={handleViewTask}
              variant="default"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Task
            </Button>

            {task.status !== "done" && (
              <Button
                onClick={handleMarkDone}
                variant="outline"
                disabled={isMarking}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isMarking ? "Marking..." : "Mark Done"}
              </Button>
            )}
          </>
        )}

        {isProjectNotification && project && (
          <Button
            onClick={handleViewProject}
            variant="default"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Project
          </Button>
        )}

        <Button
          onClick={handleSnooze}
          variant="outline"
          className={`gap-2 ${isSnoozed ? 'ring-2 ring-primary' : ''}`}
        >
          <Clock className="h-4 w-4" />
          {isSnoozed ? "Snoozed" : "Snooze"}
        </Button>
      </div>

      {/* Comments & Reply Section */}
      {notification.taskId && (
        <NotificationReplySection taskId={notification.taskId} />
      )}
    </div>
  );
}
