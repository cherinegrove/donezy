
import { useAppContext } from "@/contexts/AppContext";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, Users, ArrowLeft, Save, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConvertToTemplateDialog } from "@/components/projects/ConvertToTemplateDialog";

const ProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById, tasks, getClientById, users, teams, activeTimeEntry, startTimeTracking, stopTimeTracking } = useAppContext();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  
  const project = projectId ? getProjectById(projectId) : undefined;
  const client = project ? getClientById(project.clientId) : undefined;
  
  const projectTasks = tasks.filter(task => task.projectId === projectId);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(task => task.status === "done").length;
  const completionPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  
  // Get team members for this project
  const projectTeamMembers = users.filter(user => 
    project?.teamIds.some(teamId => user.teamIds.includes(teamId))
  );

  // Find if there's an active time entry for the current project (without a task)
  const isTimerRunning = activeTimeEntry && 
    projectTasks.some(task => task.id === activeTimeEntry.taskId) ||
    (activeTimeEntry?.projectId === projectId && !activeTimeEntry.taskId);

  const handleTimerToggle = () => {
    if (isTimerRunning && activeTimeEntry) {
      stopTimeTracking("Project time tracking stopped");
    } else if (project) {
      // Start timer directly for the project (without a task)
      startTimeTracking(undefined, project.id);
    }
  };
  
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <Button className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={isTimerRunning ? "destructive" : "default"}
            onClick={handleTimerToggle}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Timer
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          <Button onClick={() => setIsCreateTaskOpen(true)}>New Task</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Client</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <User className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="font-medium">{client?.name}</div>
              <div className="text-sm text-muted-foreground">
                {client?.contactName}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <div className="text-2xl font-bold">{project.usedHours}h</div>
              <div className="text-muted-foreground">{project.allocatedHours ? `/ ${project.allocatedHours}h` : "No limit"}</div>
            </div>
            {project.allocatedHours && (
              <Progress value={(project.usedHours / project.allocatedHours) * 100} />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Start</div>
                <div>{format(new Date(project.startDate), "MMM d, yyyy")}</div>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Due</div>
                <div>{project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "No deadline"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{completedTasks} of {totalTasks} tasks completed</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {projectTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
              {projectTeamMembers.length === 0 && (
                <p className="text-muted-foreground text-sm">No team members assigned</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban" className="mt-6">
          <KanbanBoard projectId={projectId!} />
        </TabsContent>
        
        <TabsContent value="time" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectTasks.flatMap(task => 
                  task.timeEntries.map(entry => {
                    const user = users.find(u => u.id === entry.userId);
                    return {
                      ...entry,
                      taskTitle: task.title,
                      userName: user?.name || "Unknown User",
                      userAvatar: user?.avatar,
                    };
                  })
                ).sort((a, b) => 
                  new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                ).map(entry => (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.userAvatar} />
                        <AvatarFallback>{entry.userName.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{entry.taskTitle}</p>
                        <p className="text-sm text-muted-foreground">{entry.userName}</p>
                        {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Math.floor(entry.duration / 60)}h {entry.duration % 60}m</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.startTime), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
                
                {projectTasks.flatMap(task => task.timeEntries).length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">
                    No time entries for this project
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                No files uploaded yet
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        defaultProjectId={projectId}
      />
      
      {project && (
        <ConvertToTemplateDialog
          projectId={project.id}
          projectName={project.name}
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
