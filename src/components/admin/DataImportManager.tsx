import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Users, Building, FolderPlus, CheckSquare, Shield } from "lucide-react";
import { DataImportWizard } from "./DataImportWizard";

export function DataImportManager() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const importCategories = [
    {
      id: "clients",
      title: "Import Clients",
      description: "Bulk import client data with contact information and settings",
      icon: Building,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      fields: ["Name", "Email", "Phone", "Website", "Address", "Status"]
    },
    {
      id: "projects", 
      title: "Import Projects",
      description: "Import projects with client assignments and configuration",
      icon: FolderPlus,
      color: "bg-green-50 border-green-200 text-green-800",
      fields: ["Name", "Description", "Client", "Status", "Service Type", "Hours"]
    },
    {
      id: "tasks",
      title: "Import Tasks", 
      description: "Bulk import tasks with assignments and custom fields",
      icon: CheckSquare,
      color: "bg-purple-50 border-purple-200 text-purple-800",
      fields: ["Title", "Description", "Project", "Assignee", "Priority", "Status"]
    },
    {
      id: "teams",
      title: "Import Teams",
      description: "Create teams and assign members in bulk",
      icon: Users,
      color: "bg-orange-50 border-orange-200 text-orange-800",
      fields: ["Name", "Description", "Leader", "Members"]
    },
    {
      id: "roles",
      title: "Import Roles",
      description: "Import custom roles with permission configurations",
      icon: Shield,
      color: "bg-red-50 border-red-200 text-red-800",
      fields: ["Name", "Description", "Permissions"]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Import Center</h2>
        <p className="text-muted-foreground">
          Import data in bulk using CSV or JSON files. Map your columns to system fields including custom fields.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {importCategories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Supported Fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {category.fields.map((field) => (
                      <span 
                        key={field} 
                        className="text-xs px-2 py-1 bg-muted rounded-md"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => setActiveDialog(category.id)}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {category.title.split(' ')[1]}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Supported Formats</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV files with headers</li>
                <li>• JSON arrays or objects</li>
                <li>• Drag & drop or file upload</li>
                <li>• Direct paste from clipboard</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Import Process</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload or paste your data</li>
                <li>• Map columns to system fields</li>
                <li>• Preview your import</li>
                <li>• Complete the import</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> You can map your columns to custom fields you've created. 
              Only required fields need to be mapped - all others are optional.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import Wizard */}
      <DataImportWizard
        open={activeDialog !== null}
        onOpenChange={(open) => setActiveDialog(open ? activeDialog : null)}
        importType={activeDialog as "tasks" | "clients" | "projects" | "teams" | "roles"}
      />
    </div>
  );
}