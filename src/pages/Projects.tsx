import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTemplateDialog } from "@/components/projects/CreateTemplateDialog";
import { UseTemplateDialog } from "@/components/projects/UseTemplateDialog";
import { TemplatesList } from "@/components/projects/TemplatesList";
import { RecordActions } from "@/components/common/RecordActions";
import type { Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { CreateProjectTemplateDialog } from "@/components/projects/CreateProjectTemplateDialog";

const Projects = () => {
  console.log("Projects component: Starting render");
  
  const { projects, tasks, clients, teams, deleteProject } = useAppContext();
  console.log("Projects component: Context data", { 
    projectsCount: projects?.length || 0, 
    tasksCount: tasks?.length || 0, 
    clientsCount: clients?.length || 0, 
    teamsCount: teams?.length || 0 
  });

  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [isUseTemplateDialogOpen, setIsUseTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("projects");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const navigate = useNavigate();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  console.log("Projects component: State initialized");

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

  console.log("Projects component: Filter options created");

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

  // Helper function to safely format dates
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString.trim() === "") {
      return null;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return format(date, "MMM d, yyyy");
  };

  console.log("Projects component: Helper functions defined");

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
          // Handle potentially undefined teamIds
          if (values.length > 0) {
            const projectTeamIds = project.teamIds || [];
            if (!projectTeamIds.some(id => values.includes(id))) {
              return false;
            }
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

  console.log("Projects component: Filtered projects", { count: filteredProjects.length });

  const handleFilterChange = (filters: Record<string, string[]>) => {
    console.log("Projects component: Filter change", filters);
    setActiveFilters(filters);
  };

  const handleUseTemplate = (templateId: string) => {
    console.log("Projects component: Use template", templateId);
    setSelectedTemplateId(templateId);
    setIsUseTemplateDialogOpen(true);
  };
  
  const handleEditProject = (projectId: string) => {
    console.log("Projects component: Edit project", projectId);
    const projectToEdit = projects.find(p => p.id === projectId);
    if (projectToEdit) {
      console.log("Projects component: Found project to edit", projectToEdit);
      setEditingProject(projectToEdit);
    } else {
      console.error("Projects component: Project not found for editing", projectId);
      toast({
        title: "Error",
        description: "Project not found. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseEditDialog = () => {
    console.log("Projects component: Close edit dialog");
    setEditingProject(null);
  };

  const handleCardClick = (projectId: string) => {
    console.log("Projects component: Card click", projectId);
    navigate(`/projects/${projectId}`);
  };

  const handleDeleteProject = (projectId: string) => {
    console.log("Projects component: Delete project", projectId);
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete) {
      deleteProject(projectId);
      toast({
        title: "Project deleted",
        description: `Project "${projectToDelete.name}" has been successfully deleted.`,
      });
    } else {
      console.error("Projects component: Project not found for deletion", projectId);
      toast({
        title: "Error",
        description: "Project not found. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  };

  console.log("Projects component: About to render JSX");

  try {
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
                <Button onClick={() => {
                  console.log("Projects component: Create project button clicked");
                  setIsCreateDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              ) : (
                <Button onClick={() => {
                  console.log("Projects component: Create template button clicked");
                  setIsCreateTemplateDialogOpen(true);
                }}>
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
                console.log("Projects component: Rendering project card", project.id);
                const progress = getProjectProgress(project.id);
                const formattedStartDate = formatDate(project.startDate);
                const formattedDueDate = formatDate(project.dueDate);
                
                return (
                  <Card 
                    key={project.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleCardClick(project.id)}
                  >
                    <CardHeader className="flex flex-row justify-between items-start pb-2">
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </div>
                      <div className="flex items-center">
                        <RecordActions
                          recordId={project.id}
                          recordType="Project"
                          recordName={project.name}
                          onEdit={() => handleEditProject(project.id)}
                          onDelete={() => handleDeleteProject(project.id)}
                          disableDuplicate={true}
                        />
                      </div>
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
                        {formattedStartDate && (
                          <div className="flex justify-between mb-1 text-sm">
                            <span>Start Date</span>
                            <span>{formattedStartDate}</span>
                          </div>
                        )}
                        {formattedDueDate && (
                          <div className="flex justify-between mb-1 text-sm">
                            <span>Due Date</span>
                            <span>{formattedDueDate}</span>
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
                        <span className="text-muted-foreground">Hours: {project.usedHours || 0}h</span>
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
                onClick={() => {
                  console.log("Projects component: New project card clicked");
                  setIsCreateDialogOpen(true);
                }}
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

        <CreateProjectTemplateDialog
          open={isCreateTemplateDialogOpen}
          onOpenChange={setIsCreateTemplateDialogOpen}
        />

        <UseTemplateDialog
          open={isUseTemplateDialogOpen}
          onOpenChange={setIsUseTemplateDialogOpen}
          templateId={selectedTemplateId}
        />
        
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onClose={handleCloseEditDialog}
        />
      </div>
    );
  } catch (error) {
    console.error("Projects component: Render error", error);
    return (
      <div className="p-6">
        <h1>Error rendering Projects page</h1>
        <p>Check console for details</p>
      </div>
    );
  }
}

export default Projects;
