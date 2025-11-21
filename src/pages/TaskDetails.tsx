import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileSection } from "@/components/tasks/FileSection";
import { TimerSection } from "@/components/tasks/TimerSection";
import { TaskLogsSection } from "@/components/tasks/TaskLogsSection";
import { ChecklistSection } from "@/components/tasks/ChecklistSection";
import { CommentSection } from "@/components/tasks/CommentSection";
import { RelatedTasksSection } from "@/components/tasks/RelatedTasksSection";
import { format } from "date-fns";

export default function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks, users, projects } = useAppContext();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Add safety checks for arrays
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const task = safeTasks.find(t => t && t.id === taskId);
  const assignee = safeUsers.find(u => u && u.auth_user_id === task?.assigneeId);
  const project = safeProjects.find(p => p && p.id === task?.projectId);
  const collaborators = safeUsers.filter(u => u && task?.collaboratorIds?.includes(u.auth_user_id));

  if (!task) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Task not found</h1>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
        <Button onClick={() => setIsEditOpen(true)}>
          Edit Task
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={
                task.status === 'done' ? 'default' :
                task.status === 'in-progress' ? 'secondary' : 'outline'
              }>
                {task.status}
              </Badge>
              <Badge variant={
                task.priority === 'high' ? 'destructive' :
                task.priority === 'medium' ? 'default' : 'secondary'
              }>
                {task.priority} priority
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {project && (
              <div>
                <span className="text-muted-foreground">Project:</span>
                <p className="font-medium">{project.name}</p>
              </div>
            )}
            {assignee && (
              <div>
                <span className="text-muted-foreground">Assignee:</span>
                <p className="font-medium">{assignee.name}</p>
              </div>
            )}
            {task.dueDate && (
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <p className="font-medium">{format(new Date(task.dueDate), 'PPP')}</p>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="logs">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="space-y-4">
              {task.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-muted-foreground whitespace-pre-wrap mt-2">{task.description}</p>
                </div>
              )}

              {collaborators.length > 0 && (
                <div>
                  <Label>Collaborators</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    {collaborators.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold mb-4">Checklist</h3>
                <ChecklistSection taskId={task.id} />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Comments</h3>
                <CommentSection taskId={task.id} />
              </div>

              <div>
                <RelatedTasksSection taskId={task.id} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="files">
            <FileSection taskId={task.id} />
          </TabsContent>
          
          <TabsContent value="time">
            <TimerSection taskId={task.id} />
          </TabsContent>
          
          <TabsContent value="logs">
            <TaskLogsSection taskId={task.id} />
          </TabsContent>
        </Tabs>
      </Card>

      <EditTaskDialog
        task={task}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
}