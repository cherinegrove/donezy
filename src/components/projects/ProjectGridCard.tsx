import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RecordActions } from "@/components/common/RecordActions";
import { format } from "date-fns";
import type { Project } from "@/types";
import { useAppContext } from "@/contexts/AppContext";

interface ProjectGridCardProps {
  project: Project;
  progress: number;
  clientName: string;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onClick: (projectId: string) => void;
}

export function ProjectGridCard({ 
  project, 
  progress, 
  clientName, 
  onEdit, 
  onDelete, 
  onClick 
}: ProjectGridCardProps) {
  const { projectStatuses } = useAppContext();
  
  const getStatusInfo = (status: string) => {
    const statusDef = projectStatuses.find(s => s.value === status);
    return statusDef || { label: status, color: 'bg-gray-500' };
  };

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

  const formattedStartDate = formatDate(project.startDate);
  const formattedDueDate = formatDate(project.dueDate);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(project.id)}
    >
      <CardHeader className="flex flex-row justify-between items-start p-3 pb-1">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm truncate">{project.name}</CardTitle>
          <CardDescription className="text-xs line-clamp-1">{project.description}</CardDescription>
        </div>
        <div className="flex items-center ml-1">
          <RecordActions
            recordId={project.id}
            recordType="Project"
            recordName={project.name}
            onEdit={() => onEdit(project.id)}
            onDelete={() => onDelete(project.id)}
            disableDuplicate={true}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <div className="text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium truncate ml-2">{clientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusInfo(project.status).color}`}></div>
              <span className="font-medium">{getStatusInfo(project.status).label}</span>
            </div>
          </div>
          {formattedDueDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due</span>
              <span>{formattedDueDate}</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{project.usedHours || 0}h used</span>
          {project.allocatedHours && <span>/ {project.allocatedHours}h</span>}
        </div>
      </CardContent>
    </Card>
  );
}