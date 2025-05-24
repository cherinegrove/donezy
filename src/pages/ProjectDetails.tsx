import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskList } from "@/components/tasks/TaskList";
import { ConvertToTemplateDialog } from "@/components/projects/ConvertToTemplateDialog";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { projects, clients, tasks, users, timeEntries } = useAppContext();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  
  const project = projects.find(p => p.id === id);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = tasks.filter(task => task.projectId === id);
  const projectMembers = users.filter(user => project?.teamIds?.includes(user.id));
  const totalHours = timeEntries
    .filter(entry => entry.projectId === id)
    .reduce((sum, entry) => sum + entry.duration, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            {project?.dueDate ? format(new Date(project.dueDate), "MMM dd, yyyy") : "No due date"}
          </Button>
          <Button onClick={() => setConvertDialogOpen(true)}>
            Convert to Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
            <Badge variant="secondary">{project?.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {projectMembers?.map(member => (
                <Avatar key={member.id} className="w-8 h-8">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
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

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Tasks</h2>
        <ScrollArea>
          <TaskList tasks={projectTasks} />
        </ScrollArea>
      </div>
      
      <ConvertToTemplateDialog
        project={project!}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
      />
    </div>
  );
}
