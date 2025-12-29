import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { useNavigate } from "react-router-dom";
import { EnhancedFilterBar, FilterOption } from "@/components/common/EnhancedFilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Filter } from "lucide-react";
import { CreateTemplateDialog } from "@/components/projects/CreateTemplateDialog";
import { UseTemplateDialog } from "@/components/projects/UseTemplateDialog";
import { TemplatesList } from "@/components/projects/TemplatesList";
import { ViewSelector } from "@/components/kanban/ViewSelector";
import { ProjectsViewContent } from "@/components/projects/ProjectsViewContent";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import type { Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { CreateProjectTemplateDialog } from "@/components/projects/CreateProjectTemplateDialog";
import { ModernToolbar, ModernToolbarSection } from "@/components/common/ModernToolbar";

const Projects = () => {
  console.log("Projects component: Starting render");
  
  const { projects, tasks, clients, teams, users, deleteProject } = useAppContext();

  // Listen for template creation events to refresh the templates list
  useEffect(() => {
    const handleTemplateCreated = () => {
      setTemplatesRefreshKey(prev => prev + 1);
    };

    window.addEventListener('templateCreated', handleTemplateCreated);
    return () => window.removeEventListener('templateCreated', handleTemplateCreated);
  }, []);
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
  const [currentView, setCurrentView] = useState<"list" | "kanban" | "timeline">("kanban");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const navigate = useNavigate();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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
      id: "owners",
      name: "Owner",
      options: users.map(user => ({
        id: user.auth_user_id,
        label: user.name,
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

  // Helper functions
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

  console.log("Projects component: Helper functions defined");

  // Apply filters and search to projects
  const filteredProjects = projects.filter(project => {
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const projectName = project.name?.toLowerCase() || "";
      const projectDescription = project.description?.toLowerCase() || "";
      const clientName = getClientName(project.clientId).toLowerCase();
      
      if (!projectName.includes(query) && !projectDescription.includes(query) && !clientName.includes(query)) {
        return false;
      }
    }

    // Apply dropdown filters
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
        case "owners":
          // Check if project has the selected owner
          if (!project.ownerId || !values.includes(project.ownerId)) {
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

  const handleDeleteProject = async (projectId: string) => {
    console.log("Projects component: Delete project", projectId);
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete) {
      const result = await deleteProject(projectId);
      
      if (result.success) {
        toast({
          title: "Project deleted",
          description: `Project "${projectToDelete.name}" has been successfully deleted.`,
        });
      } else {
        toast({
          title: "Failed to delete project",
          description: result.error || "An error occurred while deleting the project.",
          variant: "destructive",
        });
      }
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage and track your team's projects
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <TabsList className="bg-muted/50 backdrop-blur-sm border border-border/50 shadow-sm w-full sm:w-auto">
                <TabsTrigger 
                  value="projects"
                  className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <FolderKanban className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Projects</span>
                  {filteredProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 sm:ml-2 px-1.5 py-0 text-xs">
                      {filteredProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="templates"
                  className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <span className="hidden xs:inline">Templates</span>
                  <span className="xs:hidden">Tmpl.</span>
                </TabsTrigger>
              </TabsList>
              {activeTab === "projects" ? (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => {
                  console.log("Projects component: Create project button clicked");
                  setIsCreateDialogOpen(true);
                }}>
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </Button>
              ) : (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => {
                  console.log("Projects component: Create template button clicked");
                  setIsCreateTemplateDialogOpen(true);
                }}>
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Template</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="projects" className="mt-4 sm:mt-6 animate-fade-in">
            <ModernToolbar>
              <ModernToolbarSection>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[180px] h-9"
                  />
                </div>
                <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <EnhancedFilterBar 
                  filters={filterOptions} 
                  onFilterChange={handleFilterChange}
                  presetKey="projects"
                />
              </ModernToolbarSection>
              
              <ModernToolbarSection className="justify-end">
                <ViewSelector currentView={currentView} onViewChange={setCurrentView} showTimeline={true} />
              </ModernToolbarSection>
            </ModernToolbar>

            <div className="space-y-6">
              <ProjectsViewContent
                currentView={currentView}
                projects={filteredProjects}
                getProjectProgress={getProjectProgress}
                getClientName={getClientName}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onCardClick={handleCardClick}
                onCreateProject={() => setIsCreateDialogOpen(true)}
              />
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-6 animate-fade-in">
            <TemplatesList 
              key={templatesRefreshKey}
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
