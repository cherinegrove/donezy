import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { ConvertToTemplateDialog } from "@/components/projects/ConvertToTemplateDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ProjectChannels } from "@/components/channels/ProjectChannels";

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, timeEntries } = useAppContext();
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
            {project.dueDate ? format(new Date(project.dueDate), "MMM dd, yyyy") : "No due date"}
          </Button>
          <Button onClick={() => setConvertDialogOpen(true)}>
            Convert to Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={client?.website} />
                <AvatarFallback>{client?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{client?.name}</h3>
                <p className="text-sm text-muted-foreground">{client?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{project.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold">{totalHours / 60}</h3>
            <p className="text-sm text-muted-foreground">Hours tracked</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <ScrollArea>
            <TaskList tasks={projectTasks} />
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="chat">
          <ProjectChannels projectId={projectId!} />
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
