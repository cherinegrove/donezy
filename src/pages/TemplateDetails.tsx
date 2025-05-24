
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

export default function TemplateDetails() {
  const { templateId } = useParams();
  const { projectTemplates } = useAppContext();
  
  const template = projectTemplates.find(t => t.id === templateId);

  if (!template) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Template Not Found</h1>
        <p className="text-muted-foreground">
          The requested template could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{template.name}</h1>
        <p className="text-muted-foreground">Template Details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Description:</strong>
              <p className="mt-1">{template.description}</p>
            </div>
            <div>
              <strong>Service Type:</strong> {template.serviceType}
            </div>
            <div>
              <strong>Allocated Hours:</strong> {template.allocatedHours}
            </div>
            <div>
              <strong>Usage Count:</strong> {template.usageCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
