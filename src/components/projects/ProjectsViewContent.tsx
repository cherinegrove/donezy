import { ProjectsGrid } from "./ProjectsGrid";
import { ProjectsList } from "./ProjectsList";
import { ProjectsTimeline } from "./ProjectsTimeline";
import type { Project } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FolderOpen, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useProjectFavorites } from "@/hooks/useProjectFavorites";

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
const STATUS_ORDER = ["in-progress", "not-started", "on-hold", "completed", "cancelled"];

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

  return (
    <div className="space-y-4">
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
    </div>
  );
}