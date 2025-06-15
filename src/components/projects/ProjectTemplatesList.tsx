
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Users, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { ProjectTemplate } from "@/types";

interface ProjectTemplatesListProps {
  onCreateTemplate: () => void;
}

export function ProjectTemplatesList({ onCreateTemplate }: ProjectTemplatesListProps) {
  const { projectTemplates, getUserById } = useAppContext();

  if (projectTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Project Templates</h3>
          <p className="text-sm text-muted-foreground text-center max-w-[400px] mb-4">
            Create project templates to save time when starting new projects with recurring tasks and structures
          </p>
          <Button onClick={onCreateTemplate}>
            Create Your First Template
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectTemplates.map((template) => (
          <ProjectTemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}

interface ProjectTemplateCardProps {
  template: ProjectTemplate;
}

function ProjectTemplateCard({ template }: ProjectTemplateCardProps) {
  const { getUserById } = useAppContext();
  const creator = getUserById(template.createdBy);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {template.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {template.description}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{template.defaultDuration} days</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Used:</span>
              <span className="font-medium">{template.usageCount || 0} times</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Service Type:</span>
              <Badge variant="outline" className="text-xs">
                {template.serviceType === "bank-hours" 
                  ? "Bank of Hours" 
                  : template.serviceType === "pay-as-you-go" 
                    ? "Pay As You Go" 
                    : "Fixed Project"}
              </Badge>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tasks:</span>
              <span className="font-medium">{template.tasks?.length || 0}</span>
            </div>
            
            {template.customFields && template.customFields.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Custom Fields:</span>
                <span className="font-medium">{template.customFields.length}</span>
              </div>
            )}
            
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{format(new Date(template.createdAt), "MMM d, yyyy")}</span>
            </div>
            
            {creator && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">By:</span>
                <span className="font-medium">{creator.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
