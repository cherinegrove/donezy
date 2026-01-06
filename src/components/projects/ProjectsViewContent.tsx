import { ProjectsGrid } from "./ProjectsGrid";
import { ProjectsList } from "./ProjectsList";
import { ProjectsTimeline } from "./ProjectsTimeline";
import type { Project } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

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
  const [completedOpen, setCompletedOpen] = useState(false);

  // Separate active and completed projects
  const activeProjects = projects.filter(p => p.status !== "completed");
  const completedProjects = projects.filter(p => p.status === "completed");

  const renderProjects = (projectList: Project[]) => {
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
        />
      );
    }

    if (currentView === "timeline") {
      return (
        <ProjectsTimeline
          projects={projectList}
          getClientName={getClientName}
          onCardClick={onCardClick}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Active Projects */}
      {renderProjects(activeProjects)}

      {/* Completed Projects Section */}
      {completedProjects.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            {completedOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-medium">Completed Projects</span>
            <Badge variant="secondary" className="ml-2">
              {completedProjects.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {renderProjects(completedProjects)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}