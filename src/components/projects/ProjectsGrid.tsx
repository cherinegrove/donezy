import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ProjectGridCard } from "./ProjectGridCard";
import type { Project } from "@/types";

interface ProjectsGridProps {
  projects: Project[];
  getProjectProgress: (projectId: string) => number;
  getClientName: (clientId: string) => string;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onCardClick: (projectId: string) => void;
  onCreateProject: () => void;
  onToggleFavorite?: (projectId: string) => void;
  isFavorite?: (projectId: string) => boolean;
}

export function ProjectsGrid({
  projects,
  getProjectProgress,
  getClientName,
  onEdit,
  onDelete,
  onCardClick,
  onCreateProject,
  onToggleFavorite,
  isFavorite
}: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4">
      {projects.map((project) => (
        <ProjectGridCard
          key={project.id}
          project={project}
          progress={getProjectProgress(project.id)}
          clientName={getClientName(project.clientId)}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onCardClick}
          onToggleFavorite={onToggleFavorite}
          isFavorite={isFavorite?.(project.id) ?? false}
        />
      ))}

      {/* New Project Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[140px]"
        onClick={() => onCreateProject()}
      >
        <CardContent className="flex flex-col items-center justify-center h-full p-3">
          <div className="rounded-full bg-muted p-2 mb-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">New Project</h3>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Start tracking
          </p>
        </CardContent>
      </Card>
    </div>
  );
}