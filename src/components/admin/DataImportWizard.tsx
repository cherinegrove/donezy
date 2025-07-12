import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Task } from "@/types";
import { Progress } from "@/components/ui/progress";

interface DataImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: "tasks" | "clients" | "projects" | "teams" | "roles";
}

export function DataImportWizard({ open, onOpenChange, importType }: DataImportWizardProps) {
  const { addTask, projects, customFields } = useAppContext();
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [importData, setImportData] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { id: 1, title: "Import Data", description: "Upload or paste your data" },
    { id: 2, title: "Map Fields", description: "Map columns to system fields" },
    { id: 3, title: "Preview", description: "Review data before importing" },
    { id: 4, title: "Complete", description: "Import data to system" }
  ];

  const getImportConfig = () => {
    switch (importType) {
      case "tasks":
        return {
          title: "Import Tasks",
          fields: [
            { value: 'title', label: 'Title *', required: true },
            { value: 'description', label: 'Description' },
            { value: 'projectId', label: 'Project' },
            { value: 'priority', label: 'Priority' },
            { value: 'status', label: 'Status' },
            { value: 'assigneeId', label: 'Assignee' },
            { value: 'dueDate', label: 'Due Date' },
            { value: 'estimatedHours', label: 'Estimated Hours' },
            ...customFields.filter(cf => cf.applicableTo.includes('tasks')).map(cf => ({
              value: cf.name,
              label: `${cf.name} (Custom)`,
            })),
          ]
        };
      case "clients":
        return {
          title: "Import Clients",
          fields: [
            { value: 'name', label: 'Name *', required: true },
            { value: 'email', label: 'Email *', required: true },
            { value: 'phone', label: 'Phone' },
            { value: 'website', label: 'Website' },
            { value: 'address', label: 'Address' },
            { value: 'status', label: 'Status' },
          ]
        };
      case "projects":
        return {
          title: "Import Projects",
          fields: [
            { value: 'name', label: 'Name *', required: true },
            { value: 'description', label: 'Description' },
            { value: 'clientId', label: 'Client' },
            { value: 'status', label: 'Status' },
            { value: 'serviceType', label: 'Service Type' },
            { value: 'allocatedHours', label: 'Allocated Hours' },
          ]
        };
      case "teams":
        return {
          title: "Import Teams",
          fields: [
            { value: 'name', label: 'Name *', required: true },
            { value: 'description', label: 'Description' },
            { value: 'leader', label: 'Team Leader' },
            { value: 'members', label: 'Members' },
          ]
        };
      case "roles":
        return {
          title: "Import Roles",
          fields: [
            { value: 'name', label: 'Name *', required: true },
            { value: 'description', label: 'Description' },
            { value: 'permissions', label: 'Permissions' },
          ]
        };
      default:
        return { title: "Import Data", fields: [] };
    }
  };

  const config = getImportConfig();

  const parseData = () => {
    try {
      let columns: string[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        const firstItem = Array.isArray(parsed) ? parsed[0] : parsed;
        columns = Object.keys(firstItem || {});
      } else {
        const lines = importData.trim().split('\n');
        columns = lines[0].split(',').map(h => h.trim());
      }
      
      setAvailableColumns(columns);
      setCurrentStep(2);
      
      toast({
        title: "Data Parsed Successfully",
        description: `Found ${columns.length} columns to map.`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const generatePreview = () => {
    try {
      let items: any[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const item: any = {};
          headers.forEach((header, index) => {
            item[header] = values[index];
          });
          items.push(item);
        }
      }

      const mappedData = items.map(item => {
        const mapped: any = {};
        Object.entries(columnMapping).forEach(([column, field]) => {
          if (field && item[column] !== undefined) {
            mapped[field] = item[column];
          }
        });
        return mapped;
      }).filter(item => {
        // Filter based on required fields
        const requiredFields = config.fields.filter(f => f.required);
        return requiredFields.every(field => item[field.value]);
      });

      setPreviewData(mappedData);
      setCurrentStep(3);
      
      toast({
        title: "Preview Generated",
        description: `${mappedData.length} valid records ready for import.`,
      });
    } catch (error) {
      toast({
        title: "Preview Error",
        description: "Failed to generate preview. Check your mappings.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      if (importType === "tasks") {
        for (const taskData of previewData) {
          const projectId = taskData.projectId || projects[0]?.id;
          
          if (projectId && taskData.title) {
            const newTask: Omit<Task, 'id'> = {
              title: taskData.title,
              description: taskData.description || "",
              projectId: projectId,
              status: taskData.status || "todo",
              priority: taskData.priority || "medium",
              assigneeId: taskData.assigneeId,
              dueDate: taskData.dueDate,
              estimatedHours: taskData.estimatedHours,
              createdAt: new Date().toISOString(),
              collaboratorIds: [],
              subtasks: [],
              watcherIds: [],
              customFields: {},
            };
            
            await addTask(newTask);
            successCount++;
          }
        }
      }
      
      setCurrentStep(4);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} ${importType}.`,
      });
      
      // Auto-close after a delay
      setTimeout(() => {
        handleReset();
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setImportData("");
    setColumnMapping({});
    setAvailableColumns([]);
    setPreviewData([]);
    setIsProcessing(false);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return importData.trim().length > 0;
      case 2: return Object.values(columnMapping).some(v => config.fields.find(f => f.required && f.value === v));
      case 3: return previewData.length > 0;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            Import your data in a guided step-by-step process
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > step.id 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="w-full" />
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Import Data */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 1: Import Your Data</h3>
              <div>
                <label className="text-sm font-medium">Paste your CSV or JSON data</label>
                <Textarea
                  placeholder="Paste your data here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="min-h-[300px] font-mono text-sm mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 2: Map Fields */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Map Your Columns</h3>
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  {availableColumns.map((column) => (
                    <div key={column} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <label className="text-sm font-medium">{column}</label>
                      </div>
                      <div className="w-2/3">
                        <select
                          value={columnMapping[column] || ''}
                          onChange={(e) => setColumnMapping(prev => ({
                            ...prev,
                            [column]: e.target.value
                          }))}
                          className="w-full p-2 border rounded-md bg-background"
                        >
                          <option value="">Skip this column</option>
                          {config.fields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Preview Your Data</h3>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {previewData.length} records ready for import
                </p>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {config.fields.slice(0, 4).map((field) => (
                          <th key={field.value} className="text-left p-2">{field.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b">
                          {config.fields.slice(0, 4).map((field) => (
                            <td key={field.value} className="p-2">
                              {item[field.value] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <p className="text-muted-foreground text-center p-2">
                      ... and {previewData.length - 10} more records
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground">
                Your data has been successfully imported. You can now view it in the respective section.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : handleReset()}
            disabled={isProcessing}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStep === 1 ? "Reset" : "Previous"}
          </Button>

          <div className="space-x-2">
            {currentStep < 4 && (
              <Button 
                onClick={() => {
                  if (currentStep === 1) parseData();
                  else if (currentStep === 2) generatePreview();
                  else if (currentStep === 3) handleImport();
                }}
                disabled={!canProceedToNext() || isProcessing}
              >
                {isProcessing ? "Processing..." : 
                  currentStep === 3 ? "Import Data" : "Next"
                }
                {currentStep < 3 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            )}
            {currentStep === 4 && (
              <Button onClick={() => { handleReset(); onOpenChange(false); }}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}