
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@/types";

interface ProjectItemProps {
  project: Project;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const { projectStatuses } = useAppContext();
  
  const getStatusInfo = (status: string) => {
    const statusDef = projectStatuses.find(s => s.value === status);
    return statusDef || { label: status, color: 'bg-gray-500' };
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            <Link 
              to={`/projects/${project.id}`}
              className="hover:text-primary transition-colors"
            >
              {project.name}
            </Link>
          </CardTitle>
          <Badge variant="outline" className="border-0 text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusInfo(project.status).color}`}></div>
              {getStatusInfo(project.status).label}
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {project.description}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {project.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {format(new Date(project.dueDate), "MMM dd, yyyy")}
            </div>
          )}
          {project.teamIds && project.teamIds.length > 0 && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {project.teamIds.length} team{project.teamIds.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
