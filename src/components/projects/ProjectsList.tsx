import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RecordActions } from "@/components/common/RecordActions";
import { format } from "date-fns";
import type { Project } from "@/types";

interface ProjectsListProps {
  projects: Project[];
  getProjectProgress: (projectId: string) => number;
  getClientName: (clientId: string) => string;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onCardClick: (projectId: string) => void;
}

export function ProjectsList({
  projects,
  getProjectProgress,
  getClientName,
  onEdit,
  onDelete,
  onCardClick
}: ProjectsListProps) {
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

  return (
    <div className="space-y-4 mt-6">
      {projects.map((project) => {
        const progress = getProjectProgress(project.id);
        
        return (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onCardClick(project.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <p className="text-muted-foreground text-sm">{project.description}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{getClientName(project.clientId)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="capitalize font-medium">{project.status.replace("-", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground min-w-[80px]">
                      {project.usedHours || 0}h{project.allocatedHours && ` / ${project.allocatedHours}h`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center ml-4">
                  <RecordActions
                    recordId={project.id}
                    recordType="Project"
                    recordName={project.name}
                    onEdit={() => onEdit(project.id)}
                    onDelete={() => onDelete(project.id)}
                    disableDuplicate={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}