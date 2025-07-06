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
}

export function ProjectsGrid({
  projects,
  getProjectProgress,
  getClientName,
  onEdit,
  onDelete,
  onCardClick,
  onCreateProject
}: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {projects.map((project) => (
        <ProjectGridCard
          key={project.id}
          project={project}
          progress={getProjectProgress(project.id)}
          clientName={getClientName(project.clientId)}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onCardClick}
        />
      ))}

      {/* New Project Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[260px]"
        onClick={() => onCreateProject()}
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
  );
}