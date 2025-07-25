import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Clock, AlertTriangle, User, Users } from "lucide-react";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ConvertToTemplateDialog } from "@/components/projects/ConvertToTemplateDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ProjectNotesSimple } from "@/components/projects/ProjectNotesSimple";
import { ProjectFilesAdvanced } from "@/components/projects/ProjectFilesAdvanced";

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, timeEntries, users } = useAppContext();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  
  // Update project when projects state changes
  useEffect(() => {
    console.log("Projects state updated:", projects.length);
    const foundProject = projects.find(p => p.id === projectId);
    console.log("Looking for project with ID:", projectId, "Found:", foundProject);
    setProject(foundProject || null);
  }, [projects, projectId]);
  
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = tasks.filter(task => task.projectId === projectId);
  const totalHours = timeEntries
    .filter(entry => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.duration, 0);

  // Calculate days left until due date
  const calculateDaysLeft = (dueDate: string | undefined) => {
    if (!dueDate || dueDate.trim() === "") return null;
    
    try {
      // Try parsing different date formats
      let date: Date;
      if (dueDate.includes('/') || dueDate.includes('-')) {
        date = new Date(dueDate);
      } else {
        date = parseISO(dueDate);
      }
      
      if (!isValid(date)) return null;
      
      const today = new Date();
      const diffDays = differenceInDays(date, today);
      return diffDays;
    } catch {
      return null;
    }
  };

  // Calculate overdue tasks
  const overdueTasks = projectTasks.filter(task => {
    if (!task.dueDate || task.dueDate.trim() === "" || task.status === 'done') return false;
    
    try {
      const dueDate = new Date(task.dueDate);
      if (!isValid(dueDate)) return false;
      
      const today = new Date();
      return dueDate < today;
    } catch {
      return false;
    }
  });

  const daysLeft = calculateDaysLeft(project?.dueDate);
  const totalHoursFormatted = Math.round((totalHours / 60) * 10) / 10;

  // Helper functions to get user details
  const getOwnerName = () => {
    if (!project?.ownerId) return "No owner assigned";
    const owner = users.find(user => user.id === project.ownerId);
    return owner ? owner.name : "Unknown user";
  };

  const getCollaboratorNames = () => {
    if (!project?.collaboratorIds || project.collaboratorIds.length === 0) {
      return [];
    }
    return project.collaboratorIds.map(id => {
      const collaborator = users.find(user => user.id === id);
      return collaborator ? collaborator.name : "Unknown user";
    });
  };

  // Show loading state while searching for project
  if (!project && projects.length > 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested project could not be found.</p>
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while projects are being loaded
  if (!project && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  const handleEditProject = () => {
    console.log("Opening edit dialog for project:", project);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    console.log("Closing edit dialog");
    setEditDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleEditProject}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            {project.dueDate ? (
              <span>
                {format(new Date(project.dueDate), "MMM dd, yyyy")}
                {daysLeft !== null && (
                  <span className={`ml-2 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-green-500'}`}>
                    ({daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`})
                  </span>
                )}
              </span>
            ) : "No due date"}
          </Button>
          <Button onClick={() => setConvertDialogOpen(true)}>
            Convert to Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Client:</span>
              <span className="font-medium">{client?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Service Type:</span>
              <span className="font-medium capitalize">{project.serviceType?.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Budget:</span>
              <span className="font-medium">{project.allocatedHours || 0}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {project.startDate ? format(new Date(project.startDate), "MMM dd, yyyy") : "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="font-medium">
                {project.dueDate ? format(new Date(project.dueDate), "MMM dd, yyyy") : "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Project Owner</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{getOwnerName()}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Collaborators</span>
              </div>
              <div className="ml-6">
                {getCollaboratorNames().length > 0 ? (
                  <div className="space-y-1">
                    {getCollaboratorNames().map((name, index) => (
                      <p key={index} className="text-sm text-muted-foreground">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No collaborators assigned</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Hours Summary</span>
              </div>
              <div className="ml-6 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracked:</span>
                  <span className="font-medium">{totalHoursFormatted}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allocated:</span>
                  <span className="font-medium">{project.allocatedHours || 0}h</span>
                </div>
                {project.allocatedHours && project.allocatedHours > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`font-medium ${
                      (project.allocatedHours - totalHoursFormatted) < 0 
                        ? 'text-red-500' 
                        : 'text-green-500'
                    }`}>
                      {Math.max(0, project.allocatedHours - totalHoursFormatted).toFixed(1)}h
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              {overdueTasks.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-green-500 font-medium">All tasks on track</p>
                    <p className="text-sm text-muted-foreground">No overdue tasks</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-4">
                    {overdueTasks.map((task) => (
                      <div key={task.id} className="p-2 border rounded-md bg-red-50 border-red-200">
                        <h4 className="font-medium text-sm text-red-800">{task.title}</h4>
                        <p className="text-xs text-red-600">
                          Due: {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "No due date"}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <KanbanBoard tasks={projectTasks} projectId={projectId} viewMode="kanban" />
        </TabsContent>
        
        <TabsContent value="notes">
          <ProjectNotesSimple projectId={projectId!} />
        </TabsContent>
        
        <TabsContent value="files">
          <ProjectFilesAdvanced projectId={projectId!} />
        </TabsContent>
      </Tabs>
      
      <ConvertToTemplateDialog
        project={project}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
      />

      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
      />
    </div>
  );
}
