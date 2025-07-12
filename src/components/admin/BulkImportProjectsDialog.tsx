import { useState, useRef } from "react";
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
import { Upload, Download, FileText, X } from "lucide-react";
import { Project } from "@/types";

interface BulkImportProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportProjectsDialog({ open, onOpenChange }: BulkImportProjectsDialogProps) {
  const { addProject, clients } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [previewProjects, setPreviewProjects] = useState<Partial<Project>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const handleFileRead = (content: string, fileName: string) => {
    setImportData(content);
    setUploadedFileName(fileName);
    toast({
      title: "File Uploaded",
      description: `${fileName} has been loaded successfully.`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or JSON file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const clearData = () => {
    setImportData("");
    setPreviewProjects([]);
    setUploadedFileName(null);
    setShowMapping(false);
    setColumnMapping({});
    setAvailableColumns([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = () => {
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
      setShowMapping(true);
      
      toast({
        title: "Ready for Mapping",
        description: `Found ${columns.length} columns. Please map them to the correct fields.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse import data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const processImportWithMapping = () => {
    try {
      let projects: Partial<Project>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        projects = items.map(item => {
          const project: Partial<Project> = {};
          
          Object.entries(columnMapping).forEach(([column, field]) => {
            if (field && item[column] !== undefined) {
              switch (field) {
                case 'name':
                  project.name = item[column];
                  break;
                case 'description':
                  project.description = item[column];
                  break;
                case 'clientId':
                  const client = clients.find(c => c.name === item[column]);
                  project.clientId = client?.id || clients[0]?.id;
                  break;
                case 'serviceType':
                  project.serviceType = item[column] as any;
                  break;
                case 'status':
                  project.status = item[column];
                  break;
                case 'allocatedHours':
                  project.allocatedHours = parseInt(item[column]);
                  break;
                case 'startDate':
                  project.startDate = item[column];
                  break;
                case 'dueDate':
                  project.dueDate = item[column];
                  break;
              }
            }
          });
          
          return project;
        }).filter(project => project.name && project.description);
      } else {
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const project: Partial<Project> = {};
          
          headers.forEach((header, index) => {
            const field = columnMapping[header];
            if (field && values[index]) {
              switch (field) {
                case 'name':
                  project.name = values[index];
                  break;
                case 'description':
                  project.description = values[index];
                  break;
                case 'clientId':
                  const client = clients.find(c => c.name === values[index]);
                  project.clientId = client?.id || clients[0]?.id;
                  break;
                case 'serviceType':
                  project.serviceType = values[index] as any;
                  break;
                case 'status':
                  project.status = values[index];
                  break;
                case 'allocatedHours':
                  project.allocatedHours = parseInt(values[index]);
                  break;
                case 'startDate':
                  project.startDate = values[index];
                  break;
                case 'dueDate':
                  project.dueDate = values[index];
                  break;
              }
            }
          });
          
          if (project.name && project.description) {
            projects.push(project);
          }
        }
      }
      
      setPreviewProjects(projects);
      toast({
        title: "Preview Generated",
        description: `Found ${projects.length} valid projects to import.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process mapped data. Please check your mappings.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewProjects.length === 0) {
      toast({
        title: "Error",
        description: "No projects to import. Please preview first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const projectData of previewProjects) {
        if (projectData.name && projectData.description) {
          const newProject: Omit<Project, 'id'> = {
            name: projectData.name,
            description: projectData.description,
            clientId: projectData.clientId || clients[0]?.id || '',
            status: projectData.status || "todo",
            serviceType: projectData.serviceType || "project",
            allocatedHours: projectData.allocatedHours || 0,
            usedHours: 0,
            startDate: projectData.startDate,
            dueDate: projectData.dueDate,
            teamIds: [],
            watcherIds: [],
          };
          
          addProject(newProject);
          successCount++;
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${successCount} projects.`,
      });
      
      setImportData("");
      setPreviewProjects([]);
      setUploadedFileName(null);
      setShowMapping(false);
      setColumnMapping({});
      setAvailableColumns([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const availableFields = [
    { value: 'name', label: 'Name *' },
    { value: 'description', label: 'Description *' },
    { value: 'clientId', label: 'Client' },
    { value: 'serviceType', label: 'Service Type' },
    { value: 'status', label: 'Status' },
    { value: 'allocatedHours', label: 'Allocated Hours' },
    { value: 'startDate', label: 'Start Date' },
    { value: 'dueDate', label: 'Due Date' },
  ];

  const downloadTemplate = () => {
    const csvTemplate = "name,description,client,service type,status,allocated hours,start date,due date\nWebsite Redesign,Complete website redesign project,Acme Corp,project,todo,120,2024-01-15,2024-03-15";
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Projects</DialogTitle>
          <DialogDescription>
            Import multiple projects at once using CSV or JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
            {(importData || uploadedFileName) && (
              <Button variant="outline" onClick={clearData} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your CSV or JSON file here, or{" "}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline"
              >
                browse files
              </button>
            </p>
            {uploadedFileName && (
              <p className="text-sm font-medium text-primary">
                Uploaded: {uploadedFileName}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Or paste your data directly</label>
            <Textarea
              placeholder="Paste your CSV or JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" disabled={!importData.trim()}>
              <FileText className="h-4 w-4 mr-2" />
              Parse & Map Fields
            </Button>
            {showMapping && (
              <Button 
                onClick={processImportWithMapping} 
                variant="outline"
                disabled={!Object.values(columnMapping).some(v => v === 'name' || v === 'description')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            )}
            <Button 
              onClick={handleImport} 
              disabled={previewProjects.length === 0 || isProcessing}
              className={previewProjects.length > 0 ? "bg-primary" : ""}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : `Import ${previewProjects.length} Projects`}
            </Button>
          </div>

          {showMapping && previewProjects.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Next step:</strong> Map columns to "Name" and "Description" and click "Generate Preview" to enable import.
              </p>
            </div>
          )}

          {showMapping && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Map Your Columns to Fields</h3>
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
                        {availableFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>* Required fields:</strong> Name and Description must be mapped
              </div>
            </div>
          )}

          {previewProjects.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Preview ({previewProjects.length} projects)</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-left p-2">Service Type</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewProjects.slice(0, 10).map((project, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{project.name}</td>
                        <td className="p-2">{clients.find(c => c.id === project.clientId)?.name || "-"}</td>
                        <td className="p-2">{project.serviceType || "project"}</td>
                        <td className="p-2">{project.status || "todo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewProjects.length > 10 && (
                  <p className="text-muted-foreground text-center p-2">
                    ... and {previewProjects.length - 10} more projects
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <div>
              <strong>How to use:</strong>
            </div>
            <div>
              1. Upload or paste your data (CSV or JSON format)
            </div>
            <div>
              2. Map your columns to the correct fields
            </div>
            <div>
              3. Generate preview to verify the mapping
            </div>
            <div>
              4. Import your projects
            </div>
            <div>
              <strong>Note:</strong> Name and Description fields are required.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}