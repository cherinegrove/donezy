import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Users } from "lucide-react";
import { TaskDetailTabs } from "@/components/tasks/TaskDetailTabs";
import { format } from "date-fns";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useState, useEffect } from "react";
import { ChecklistSection } from "@/components/tasks/ChecklistSection";
import { CommentSection } from "@/components/tasks/CommentSection";
import { RelatedTasksSection } from "@/components/tasks/RelatedTasksSection";
import { Separator } from "@/components/ui/separator";

export default function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks, users, projects } = useAppContext();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const task = tasks.find(t => t.id === taskId);
  const assignee = users.find(u => u.id === task?.assigneeId);
  const project = projects.find(p => p.id === task?.projectId);
  const collaborators = users.filter(u => task?.collaboratorIds?.includes(u.id));

  // Scroll to comments if hash is present
  useEffect(() => {
    if (window.location.hash === '#comments') {
      setTimeout(() => {
        const commentsTab = document.querySelector('[value="comments"]');
        if (commentsTab instanceof HTMLElement) {
          commentsTab.click();
        }
      }, 100);
    }
  }, []);

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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-3xl">{task.title}</CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Project:</span> {project.name}
                </span>
              </div>
            )}

            {assignee && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Owner:</span> {assignee.name}
                </span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Due:</span> {format(new Date(task.dueDate), 'PPP')}
                </span>
              </div>
            )}

            {collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Collaborators:</span> {collaborators.map(c => c.name).join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Checklist Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Checklist</h3>
            <ChecklistSection taskId={task.id} />
          </div>

          <Separator className="my-6" />

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Comments</h3>
            <CommentSection taskId={task.id} />
          </div>

          <Separator className="my-6" />

          {/* Related Tasks Section */}
          <div className="space-y-4">
            <RelatedTasksSection taskId={task.id} />
          </div>

          <Separator className="my-6" />

          {/* Other Tabs (Files, Timers, Logs) */}
          <TaskDetailTabs taskId={task.id} />
        </CardContent>
      </Card>

      <EditTaskDialog
        task={task}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
}
