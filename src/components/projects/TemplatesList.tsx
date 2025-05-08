
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { ProjectTemplate } from "@/types";

interface TemplatesListProps {
  onCreateTemplate: () => void;
  onUseTemplate: (templateId: string) => void;
}

export function TemplatesList({ onCreateTemplate, onUseTemplate }: TemplatesListProps) {
  const { projectTemplates, currentUser } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Project Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable project templates
          </p>
        </div>
        <Button onClick={onCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUseTemplate={() => onUseTemplate(template.id)}
          />
        ))}

        {/* Create new template card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[200px]"
          onClick={onCreateTemplate}
        >
          <CardContent className="flex flex-col items-center justify-center h-full py-10">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Create Template</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-[180px]">
              Define a reusable template for recurring projects
            </p>
          </CardContent>
        </Card>
      </div>

      {projectTemplates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[400px] mb-4">
              Create project templates to save time when starting new projects with recurring tasks and structures
            </p>
            <Button onClick={onCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: ProjectTemplate;
  onUseTemplate: () => void;
}

function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const { getUserById } = useAppContext();
  const creator = getUserById(template.createdBy);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between mb-1 text-sm">
            <span>Type</span>
            <span className="capitalize font-medium">
              {template.serviceType === "bank-hours" 
                ? "Bank of Hours" 
                : template.serviceType === "pay-as-you-go" 
                  ? "Pay As You Go" 
                  : "Fixed Project"}
            </span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Tasks</span>
            <span className="font-medium">{template.tasks.length}</span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Subtasks</span>
            <span>{template.tasks.reduce((total, task) => total + task.subtasks.length, 0)}</span>
          </div>
          {template.allocatedHours && (
            <div className="flex justify-between mb-1 text-sm">
              <span>Allocated Hours</span>
              <span>{template.allocatedHours}h</span>
            </div>
          )}
          <div className="flex justify-between mb-1 text-sm">
            <span>Created</span>
            <span>{format(new Date(template.createdAt), "MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Usage</span>
            <span>Used {template.usageCount} times</span>
          </div>
        </div>

        <Button onClick={onUseTemplate} className="w-full">
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}
