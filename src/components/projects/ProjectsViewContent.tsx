import { ProjectsGrid } from "./ProjectsGrid";
import { ProjectsList } from "./ProjectsList";
import { ProjectsGantt } from "./ProjectsGantt";
import type { Project } from "@/types";

interface ProjectsViewContentProps {
  currentView: "list" | "gantt" | "kanban";
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
  if (currentView === "kanban") {
    return (
      <ProjectsGrid
        projects={projects}
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
        projects={projects}
        getProjectProgress={getProjectProgress}
        getClientName={getClientName}
        onEdit={onEdit}
        onDelete={onDelete}
        onCardClick={onCardClick}
      />
    );
  }

  if (currentView === "gantt") {
    return (
      <ProjectsGantt
        projects={projects}
        getProjectProgress={getProjectProgress}
        getClientName={getClientName}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return null;
}