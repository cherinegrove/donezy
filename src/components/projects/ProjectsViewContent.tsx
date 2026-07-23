import { ProjectsGrid } from "./ProjectsGrid";
import { ProjectsList } from "./ProjectsList";
import { ProjectsTimeline } from "./ProjectsTimeline";
import type { Project } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FolderOpen, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useProjectFavorites } from "@/hooks/useProjectFavorites";
import { Card } from "@/components/ui/card";

interface ProjectsViewContentProps {
  currentView: "list" | "kanban" | "timeline";
  projects: Project[];
  getProjectProgress: (projectId: string) => number;
  getClientName: (clientId: string) => string;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onCardClick: (projectId: string) => void;
  onCreateProject: () => void;
}

// Status display config with colors
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  "not-started": { label: "Not Started", color: "bg-gray-500" },
  "in-progress": { label: "In Progress", color: "bg-blue-500" },
  "on-hold": { label: "On Hold", color: "bg-yellow-500" },
  "completed": { label: "Completed", color: "bg-green-500" },
  "cancelled": { label: "Cancelled", color: "bg-red-500" },
};

// Default order for statuses
const STATUS_ORDER = ["not-started", "in-progress", "on-hold", "completed", "cancelled"];

export function ProjectsViewContent({
  currentView,
  projects,
  getProjectProgress,
  getClientName,
  onEdit,
  onDelete,
  onCardClick,
  onCreateProject
}: ProjectsViewContentProps) {
  const { favorites, toggleFavorite, isFavorite } = useProjectFavorites();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "favorites": true,
    "in-progress": true,
    "not-started": true,
  });

  // Get favorite projects
  const favoriteProjects = useMemo(() => {
    return projects.filter(p => favorites.includes(p.id));
  }, [projects, favorites]);

  // Get non-favorite projects for regular grouping
  const nonFavoriteProjects = useMemo(() => {
    return projects.filter(p => !favorites.includes(p.id));
  }, [projects, favorites]);

  // Group non-favorite projects by status
  const projectsByStatus = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    
    nonFavoriteProjects.forEach(project => {
      const status = project.status || "not-started";
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(project);
    });
    
    return grouped;
  }, [nonFavoriteProjects]);

  // Get ordered list of statuses that have projects
  const orderedStatuses = useMemo(() => {
    const statusesWithProjects = Object.keys(projectsByStatus);
    return STATUS_ORDER.filter(s => statusesWithProjects.includes(s))
      .concat(statusesWithProjects.filter(s => !STATUS_ORDER.includes(s)));
  }, [projectsByStatus]);

  const toggleSection = (status: string) => {
    setOpenSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const renderProjects = (projectList: Project[], showFavoriteButton: boolean = true) => {
    if (currentView === "kanban") {
      return (
        <ProjectsGrid
          projects={projectList}
          getProjectProgress={getProjectProgress}
          getClientName={getClientName}
          onEdit={onEdit}
          onDelete={onDelete}
          onCardClick={onCardClick}
          onCreateProject={onCreateProject}
          onToggleFavorite={showFavoriteButton ? toggleFavorite : undefined}
          isFavorite={isFavorite}
        />
      );
    }

    if (currentView === "list") {
      return (
        <ProjectsList
          projects={projectList}
          getProjectProgress={getProjectProgress}
          getClientName={getClientName}
          onEdit={onEdit}
          onDelete={onDelete}
          onCardClick={onCardClick}
          onToggleFavorite={showFavoriteButton ? toggleFavorite : undefined}
          isFavorite={isFavorite}
        />
      );
    }

    if (currentView === "timeline") {
      return (
        <ProjectsTimeline
          projects={projectList}
          getClientName={getClientName}
          onCardClick={onCardClick}
          onToggleFavorite={showFavoriteButton ? toggleFavorite : undefined}
          isFavorite={isFavorite}
        />
      );
    }

    return null;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()), color: "bg-muted" };
  };

  // Group all projects by status (for true Kanban view)
  const allProjectsByStatus = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    projects.forEach(project => {
      const status = project.status || "not-started";
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(project);
    });

    return grouped;
  }, [projects]);

  // Render Kanban board with columns by status
  const renderKanbanBoard = () => {
    return (
      <div className="overflow-x-auto pb-4 pt-8">
        <div className="flex gap-12 min-w-min px-4">
          {STATUS_ORDER.map(status => {
            const statusProjects = allProjectsByStatus[status] || [];
            const favoriteStatusProjects = statusProjects.filter(p => favorites.includes(p.id));
            const nonFavoriteStatusProjects = statusProjects.filter(p => !favorites.includes(p.id));
            const config = getStatusConfig(status);

            return (
              <div key={status} className="flex-shrink-0 w-[280px]">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-3 w-3 rounded-full ${config.color}`} />
                    <h3 className="font-semibold">{config.label}</h3>
                    <Badge variant="secondary">{statusProjects.length}</Badge>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                    {/* Favorites first */}
                    {favoriteStatusProjects.map(project => (
                      <Card
                        key={project.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-yellow-400"
                        onClick={() => onCardClick(project.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm leading-tight flex-1 min-w-0 truncate">{project.name}</h4>
                          <Star
                            className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(project.id);
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{getClientName(project.clientId)}</p>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${getProjectProgress(project.id)}%` }}
                          />
                        </div>
                      </Card>
                    ))}

                    {/* Non-favorites */}
                    {nonFavoriteStatusProjects.map(project => (
                      <Card
                        key={project.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onCardClick(project.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm leading-tight flex-1 min-w-0 truncate">{project.name}</h4>
                          <Star
                            className="h-4 w-4 text-muted-foreground hover:fill-yellow-400 hover:text-yellow-400 flex-shrink-0 cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(project.id);
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{getClientName(project.clientId)}</p>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${getProjectProgress(project.id)}%` }}
                          />
                        </div>
                      </Card>
                    ))}

                    {statusProjects.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-8">No projects</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* True Kanban view */}
      {currentView === "kanban" && renderKanbanBoard()}
      {/* Collapsible view for list/timeline */}
      {currentView !== "kanban" && (
        <>
          {/* Favorites Section - Only show if there are favorites */}
          {favoriteProjects.length > 0 && (
            <Collapsible open={openSections["favorites"] ?? true} onOpenChange={() => toggleSection("favorites")}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">
                {openSections["favorites"] ? (
                  <ChevronDown className="h-4 w-4 text-yellow-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-yellow-600" />
                )}
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Favorites</span>
                <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                  {favoriteProjects.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {renderProjects(favoriteProjects, true)}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Regular status-grouped projects */}
          {orderedStatuses.map(status => {
            const statusProjects = projectsByStatus[status];
            const config = getStatusConfig(status);
            const isOpen = openSections[status] ?? false;

            return (
              <Collapsible key={status} open={isOpen} onOpenChange={() => toggleSection(status)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className={`h-3 w-3 rounded-full ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {statusProjects.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  {renderProjects(statusProjects, true)}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {orderedStatuses.length === 0 && favoriteProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p>No projects found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}