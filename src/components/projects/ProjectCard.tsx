
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Project } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditProjectDialog } from "./EditProjectDialog";

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { clients, deleteProject, projectStatuses } = useAppContext();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const client = clients.find(c => c.id === project.clientId);
  
  const progress = project.allocatedHours ? (project.usedHours / project.allocatedHours) * 100 : 0;
  
  const getStatusInfo = (status: string) => {
    const statusDef = projectStatuses.find(s => s.value === status);
    return statusDef || { label: status, color: 'bg-gray-500' };
  };

  const handleDelete = async () => {
    const result = await deleteProject(project.id);
    
    if (result.success) {
      toast({
        title: "Project deleted",
        description: "The project and all associated data have been successfully deleted.",
      });
    } else {
      toast({
        title: "Failed to delete project",
        description: result.error || "An error occurred while deleting the project.",
        variant: "destructive",
      });
    }
    
    setShowDeleteDialog(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on dropdown menu
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {project.name}
            </CardTitle>
            <div data-dropdown-trigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-0 text-white">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusInfo(project.status).color}`}></div>
                {getStatusInfo(project.status).label}
              </div>
            </Badge>
            <Badge variant="outline">{project.serviceType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          
          {client && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{client.name}</span>
            </div>
          )}
          
          {project.dueDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          
          {project.allocatedHours && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Progress</span>
                </div>
                <span>{project.usedHours}h / {project.allocatedHours}h</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <EditProjectDialog
        project={project}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will also delete all associated tasks, time entries, and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
