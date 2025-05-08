
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, Pause } from "lucide-react";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTemplateDialog } from "@/components/projects/CreateTemplateDialog";
import { UseTemplateDialog } from "@/components/projects/UseTemplateDialog";
import { TemplatesList } from "@/components/projects/TemplatesList";

const Projects = () => {
  const { projects, tasks, clients, teams, activeTimeEntry, startTimeTracking, stopTimeTracking } = useAppContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [isUseTemplateDialogOpen, setIsUseTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("projects");
  const navigate = useNavigate();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name,
      })),
    },
    {
      id: "teams",
      name: "Team",
      options: teams.map(team => ({
        id: team.id,
        label: team.name,
      })),
    },
    {
      id: "status",
      name: "Status",
      options: [
        { id: "planning", label: "Planning" },
        { id: "in-progress", label: "In Progress" },
        { id: "on-hold", label: "On Hold" },
        { id: "completed", label: "Completed" },
      ],
    },
  ];

  // Check if timer is running for a specific project
  const isProjectTimerRunning = (projectId: string) => {
    return activeTimeEntry && 
           activeTimeEntry.projectId === projectId && 
           (!activeTimeEntry.taskId || activeTimeEntry.taskId === "");
  };
  
  // Handle timer toggle for a project
  const handleTimerToggle = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (isProjectTimerRunning(projectId)) {
      stopTimeTracking("Project time tracking stopped");
    } else {
      startTimeTracking(undefined, projectId);
    }
  };

  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    const totalTasks = projectTasks.length;
    if (totalTasks === 0) return 0;
    
    const completedTasks = projectTasks.filter(task => task.status === "done").length;
    return Math.round((completedTasks / totalTasks) * 100);
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  // Apply filters to projects
  const filteredProjects = projects.filter(project => {
    for (const [filterId, values] of Object.entries(activeFilters)) {
      if (values.length === 0) continue;

      switch (filterId) {
        case "clients":
          if (!values.includes(project.clientId)) {
            return false;
          }
          break;
        case "teams":
          if (!project.teamIds || !project.teamIds.some(id => values.includes(id))) {
            return false;
          }
          break;
        case "status":
          if (!values.includes(project.status)) {
            return false;
          }
          break;
      }
    }

    return true;
  });

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsUseTemplateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="projects" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your team's projects
            </p>
          </div>
          <div className="flex gap-2">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            {activeTab === "projects" ? (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            ) : (
              <Button onClick={() => setIsCreateTemplateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="projects" className="mt-6">
          <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredProjects.map((project) => {
              const progress = getProjectProgress(project.id);
              const timerRunning = isProjectTimerRunning(project.id);
              
              return (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant={timerRunning ? "destructive" : "outline"} 
                      className="h-8 w-8 rounded-full p-0 ml-2 flex-shrink-0"
                      onClick={(e) => handleTimerToggle(project.id, e)}
                    >
                      {timerRunning ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Client</span>
                        <span className="font-medium">{getClientName(project.clientId)}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Status</span>
                        <span className="capitalize font-medium">{project.status.replace("-", " ")}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Start Date</span>
                        <span>{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                      </div>
                      {project.dueDate && (
                        <div className="flex justify-between mb-1 text-sm">
                          <span>Due Date</span>
                          <span>{format(new Date(project.dueDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Progress</span>
                        <span className="text-sm font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hours: {project.usedHours}h</span>
                      {project.allocatedHours && (
                        <span className="text-muted-foreground">/ {project.allocatedHours}h</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* New Project Card */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[260px]"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-full py-10">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Create New Project</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-[180px]">
                  Start tracking time and tasks for a new project
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesList 
            onCreateTemplate={() => setIsCreateTemplateDialogOpen(true)}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <CreateTemplateDialog
        open={isCreateTemplateDialogOpen}
        onOpenChange={setIsCreateTemplateDialogOpen}
      />

      <UseTemplateDialog
        open={isUseTemplateDialogOpen}
        onOpenChange={setIsUseTemplateDialogOpen}
        templateId={selectedTemplateId}
      />
    </div>
  );
}

export default Projects;
