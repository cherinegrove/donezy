import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordActions } from "@/components/common/RecordActions";
import { format } from "date-fns";
import type { Project } from "@/types";

interface ProjectsGanttProps {
  projects: Project[];
  getProjectProgress: (projectId: string) => number;
  getClientName: (clientId: string) => string;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectsGantt({
  projects,
  getProjectProgress,
  getClientName,
  onEdit,
  onDelete
}: ProjectsGanttProps) {
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
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>Gantt chart view of project schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => {
              const progress = getProjectProgress(project.id);
              const startDate = project.startDate ? new Date(project.startDate) : new Date();
              const dueDate = project.dueDate ? new Date(project.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const totalDays = Math.max(1, Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const daysPassed = Math.max(0, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const progressWidth = Math.min(100, (progress / 100) * 100);
              
              return (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-sm">{project.name}</h4>
                      <span className="text-xs text-muted-foreground">{getClientName(project.clientId)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.startDate)} - {formatDate(project.dueDate)}
                      </span>
                      <span className="text-xs font-medium">{progress}%</span>
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
                  <div className="relative">
                    <div className="w-full bg-muted h-6 rounded">
                      <div 
                        className="h-full bg-primary rounded transition-all duration-300"
                        style={{width: `${progressWidth}%`}}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}