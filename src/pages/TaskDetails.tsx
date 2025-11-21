import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useState, useEffect, Component, ReactNode } from "react";
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

// Error boundary component for child sections
class SectionErrorBoundary extends Component<
  { children: ReactNode; sectionName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; sectionName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Error in ${this.props.sectionName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Error loading {this.props.sectionName}</span>
          </div>
          <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function TaskDetails() {
  console.log('🔵 TaskDetails component rendering');
  
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  
  console.log('🔵 TaskId from params:', taskId);
  
  let contextData;
  try {
    contextData = useAppContext();
    console.log('🔵 Context loaded successfully');
  } catch (err) {
    console.error('🔴 Failed to load context:', err);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading context</h1>
          <p className="text-muted-foreground mb-4">{String(err)}</p>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }
  
  const { tasks, users, projects } = contextData;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔵 useEffect running');
    try {
      console.log('TaskDetails - Loading task:', taskId);
      console.log('TaskDetails - Tasks:', tasks);
      console.log('TaskDetails - Tasks length:', tasks?.length);
      console.log('TaskDetails - Users available:', users?.length);
      console.log('TaskDetails - Projects available:', projects?.length);
      
      // Add safety checks for arrays
      const safeTasks = Array.isArray(tasks) ? tasks : [];
      const task = safeTasks.find(t => t && t.id === taskId);
      
      console.log('🔵 Found task:', task);
      
      if (!task && safeTasks.length > 0) {
        console.log('🔴 Task not found');
        setError('Task not found');
      }
      
      setLoading(false);
      console.log('🔵 Loading complete');
    } catch (err) {
      console.error('🔴 TaskDetails - Error in useEffect:', err);
      setError('Failed to load task details');
      setLoading(false);
    }
  }, [taskId, tasks, users, projects]);

  console.log('🔵 Before safety checks');

  // Add safety checks for arrays
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  console.log('🔵 After safety checks');

  const task = safeTasks.find(t => t && t.id === taskId);
  const assignee = safeUsers.find(u => u && u.auth_user_id === task?.assigneeId);
  const project = safeProjects.find(p => p && p.id === task?.projectId);
  const collaborators = safeUsers.filter(u => u && task?.collaboratorIds?.includes(u.auth_user_id));
  
  console.log('🔵 Task data:', { task, assignee, project, collaborators });

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Task not found'}</h1>
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
              <SectionErrorBoundary sectionName="Checklist">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Checklist</h3>
                  <ChecklistSection taskId={task.id} />
                </div>
              </SectionErrorBoundary>

              <SectionErrorBoundary sectionName="Comments">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Comments</h3>
                  <CommentSection taskId={task.id} />
                </div>
              </SectionErrorBoundary>

              <SectionErrorBoundary sectionName="Related Tasks">
                <div>
                  <RelatedTasksSection taskId={task.id} />
                </div>
              </SectionErrorBoundary>
            </div>
          </TabsContent>
          
          <TabsContent value="files">
            <SectionErrorBoundary sectionName="Files">
              <FileSection taskId={task.id} />
            </SectionErrorBoundary>
          </TabsContent>
          
          <TabsContent value="time">
            <SectionErrorBoundary sectionName="Time Tracking">
              <TimerSection taskId={task.id} />
            </SectionErrorBoundary>
          </TabsContent>
          
          <TabsContent value="logs">
            <SectionErrorBoundary sectionName="Activity Log">
              <TaskLogsSection taskId={task.id} />
            </SectionErrorBoundary>
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