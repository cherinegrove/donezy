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
import { Task } from "@/types";

interface BulkImportTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportTasksDialog({ open, onOpenChange }: BulkImportTasksDialogProps) {
  const { addTask, projects, customFields } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [previewTasks, setPreviewTasks] = useState<Partial<Task>[]>([]);
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
    setPreviewTasks([]);
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
        // JSON format - extract keys from first object
        const parsed = JSON.parse(importData);
        const firstItem = Array.isArray(parsed) ? parsed[0] : parsed;
        columns = Object.keys(firstItem || {});
      } else {
        // CSV format - get headers
        const lines = importData.trim().split('\n');
        columns = lines[0].split(',').map(h => h.trim());
      }
      
      setAvailableColumns(columns);
      setShowMapping(true);
      
      console.log("=== IMPORT DEBUG ===");
      console.log("Available columns:", columns);
      console.log("Import data preview:", importData.substring(0, 200));
      
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
    console.log("=== PROCESSING IMPORT ===");
    console.log("Column mapping:", columnMapping);
    console.log("Available columns:", availableColumns);
    
    try {
      let tasks: Partial<Task>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        // JSON format
        const parsed = JSON.parse(importData);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        tasks = items.map(item => {
          const task: Partial<Task> = {};
          
          Object.entries(columnMapping).forEach(([column, field]) => {
            if (field && item[column] !== undefined) {
              switch (field) {
                case 'title':
                  task.title = item[column];
                  break;
                case 'description':
                  task.description = item[column];
                  break;
                case 'projectId':
                  const project = projects.find(p => p.name === item[column]);
                  task.projectId = project?.id || projects[0]?.id;
                  break;
                case 'priority':
                  task.priority = item[column] as "low" | "medium" | "high";
                  break;
                case 'status':
                  task.status = item[column] as any;
                  break;
                case 'assigneeId':
                  task.assigneeId = item[column];
                  break;
                case 'dueDate':
                  task.dueDate = item[column];
                  break;
                case 'estimatedHours':
                  task.estimatedHours = parseInt(item[column]);
                  break;
                default:
                  // Handle custom fields
                  if (!task.customFields) task.customFields = {};
                  task.customFields[field] = item[column];
              }
            }
          });
          
          return task;
        }).filter(task => task.title); // Only include tasks with titles
      } else {
        // CSV format
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const task: Partial<Task> = {};
          
          headers.forEach((header, index) => {
            const field = columnMapping[header];
            if (field && values[index]) {
              switch (field) {
                case 'title':
                  task.title = values[index];
                  break;
                case 'description':
                  task.description = values[index];
                  break;
                case 'projectId':
                  const project = projects.find(p => p.name === values[index]);
                  task.projectId = project?.id || projects[0]?.id;
                  break;
                case 'priority':
                  task.priority = values[index] as "low" | "medium" | "high";
                  break;
                case 'status':
                  task.status = values[index] as any;
                  break;
                case 'assigneeId':
                  task.assigneeId = values[index];
                  break;
                case 'dueDate':
                  task.dueDate = values[index];
                  break;
                case 'estimatedHours':
                  task.estimatedHours = parseInt(values[index]);
                  break;
                default:
                  // Handle custom fields
                  if (!task.customFields) task.customFields = {};
                  task.customFields[field] = values[index];
              }
            }
          });
          
          if (task.title) {
            tasks.push(task);
          }
        }
      }
      
      console.log("=== PREVIEW TASKS GENERATED ===");
      console.log("Number of tasks:", tasks.length);
      console.log("First task:", tasks[0]);
      
      setPreviewTasks(tasks);
      toast({
        title: "Preview Generated",
        description: `Found ${tasks.length} valid tasks to import.`,
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
    let tasksToImport = previewTasks;
    
    // If no preview data, generate it first
    if (tasksToImport.length === 0) {
      // Generate preview data directly
      try {
        let tasks: Partial<Task>[] = [];
        
        if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
          // JSON format
          const parsed = JSON.parse(importData);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          
          tasks = items.map(item => {
            const task: Partial<Task> = {};
            
            Object.entries(columnMapping).forEach(([column, field]) => {
              if (field && item[column] !== undefined) {
                switch (field) {
                  case 'title':
                    task.title = item[column];
                    break;
                  case 'description':
                    task.description = item[column];
                    break;
                  case 'projectId':
                    const project = projects.find(p => p.name === item[column]);
                    task.projectId = project?.id || projects[0]?.id;
                    break;
                  case 'priority':
                    task.priority = item[column] as "low" | "medium" | "high";
                    break;
                  case 'status':
                    task.status = item[column] as any;
                    break;
                  case 'assigneeId':
                    task.assigneeId = item[column];
                    break;
                  case 'dueDate':
                    task.dueDate = item[column];
                    break;
                  case 'estimatedHours':
                    task.estimatedHours = parseInt(item[column]);
                    break;
                  default:
                    // Handle custom fields
                    if (!task.customFields) task.customFields = {};
                    task.customFields[field] = item[column];
                }
              }
            });
            
            return task;
          }).filter(task => task.title);
        } else {
          // CSV format
          const lines = importData.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const task: Partial<Task> = {};
            
            headers.forEach((header, index) => {
              const field = columnMapping[header];
              if (field && values[index]) {
                switch (field) {
                  case 'title':
                    task.title = values[index];
                    break;
                  case 'description':
                    task.description = values[index];
                    break;
                  case 'projectId':
                    const project = projects.find(p => p.name === values[index]);
                    task.projectId = project?.id || projects[0]?.id;
                    break;
                  case 'priority':
                    task.priority = values[index] as "low" | "medium" | "high";
                    break;
                  case 'status':
                    task.status = values[index] as any;
                    break;
                  case 'assigneeId':
                    task.assigneeId = values[index];
                    break;
                  case 'dueDate':
                    task.dueDate = values[index];
                    break;
                  case 'estimatedHours':
                    task.estimatedHours = parseInt(values[index]);
                    break;
                  default:
                    // Handle custom fields
                    if (!task.customFields) task.customFields = {};
                    task.customFields[field] = values[index];
                }
              }
            });
            
            if (task.title) {
              tasks.push(task);
            }
          }
        }
        
        tasksToImport = tasks;
        
        if (tasksToImport.length === 0) {
          toast({
            title: "Error",
            description: "No valid tasks found to import.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process import data.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const taskData of tasksToImport) {
        if (taskData.title && taskData.projectId) {
          const newTask: Omit<Task, 'id'> = {
            title: taskData.title,
            description: taskData.description || "",
            projectId: taskData.projectId || projects[0]?.id,
            status: taskData.status || "todo",
            priority: taskData.priority || "medium",
            assigneeId: taskData.assigneeId,
            dueDate: taskData.dueDate,
            estimatedHours: taskData.estimatedHours,
            createdAt: new Date().toISOString(),
            collaboratorIds: taskData.collaboratorIds || [],
            subtasks: taskData.subtasks || [],
            watcherIds: taskData.watcherIds || [],
            customFields: taskData.customFields || {},
          };
          
          addTask(newTask);
          successCount++;
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${successCount} tasks.`,
      });
      
      setImportData("");
      setPreviewTasks([]);
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
        description: "Failed to import tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const availableFields = [
    { value: 'title', label: 'Title *' },
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
  ];

  const downloadTemplate = () => {
    const csvTemplate = "title,description,project,priority,status,assignee,due date,estimated hours\nFix login bug,Update authentication system,Project Alpha,high,todo,john@example.com,2024-01-15,4";
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Tasks</DialogTitle>
          <DialogDescription>
            Import multiple tasks at once using CSV or JSON format.
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
                disabled={!Object.values(columnMapping).some(v => v === 'title')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            )}
            <Button 
              onClick={handleImport} 
              disabled={!showMapping || !Object.values(columnMapping).some(v => v === 'title') || isProcessing}
              className="bg-primary"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : "Import Tasks"}
            </Button>
          </div>

          {showMapping && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Ready to import:</strong> Map at least one column to "Title" to enable direct import, or generate a preview first.
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
                <strong>* Required field:</strong> At least one column must be mapped to "Title"
              </div>
            </div>
          )}

          {previewTasks.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Preview ({previewTasks.length} tasks)</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Project</th>
                      <th className="text-left p-2">Priority</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTasks.slice(0, 10).map((task, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{task.title}</td>
                        <td className="p-2">{projects.find(p => p.id === task.projectId)?.name || "-"}</td>
                        <td className="p-2">{task.priority || "medium"}</td>
                        <td className="p-2">{task.status || "todo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewTasks.length > 10 && (
                  <p className="text-muted-foreground text-center p-2">
                    ... and {previewTasks.length - 10} more tasks
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
              2. Map your columns to the correct fields (including custom fields)
            </div>
            <div>
              3. Import directly or generate preview first (optional)
            </div>
            <div>
              <strong>Note:</strong> Only "Title" field is required. All other fields are optional.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}