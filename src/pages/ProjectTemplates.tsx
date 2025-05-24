
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

export default function ProjectTemplates() {
  const { projectTemplates } = useAppContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Templates</h1>
        <p className="text-muted-foreground">
          Manage your project templates to streamline project creation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projectTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{template.description}</p>
              <div className="mt-4 text-sm">
                <div>Service Type: {template.serviceType}</div>
                <div>Allocated Hours: {template.allocatedHours}</div>
                <div>Usage Count: {template.usageCount}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projectTemplates.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No project templates found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
