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
      <CardHeader className="flex flex-row justify-between items-start pb-2">
        <div>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>{project.description}</CardDescription>
        </div>
        <div className="flex items-center">
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
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Client</span>
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusInfo(project.status).color}`}></div>
              <span className="font-medium">{getStatusInfo(project.status).label}</span>
            </div>
          </div>
          {formattedStartDate && (
            <div className="flex justify-between mb-1 text-sm">
              <span>Start Date</span>
              <span>{formattedStartDate}</span>
            </div>
          )}
          {formattedDueDate && (
            <div className="flex justify-between mb-1 text-sm">
              <span>Due Date</span>
              <span>{formattedDueDate}</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Hours: {project.usedHours || 0}h</span>
          {project.allocatedHours && (
            <span className="text-muted-foreground">/ {project.allocatedHours}h</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}