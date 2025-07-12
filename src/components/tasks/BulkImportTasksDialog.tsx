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
  const { addTask, projects } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [previewTasks, setPreviewTasks] = useState<Partial<Task>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = () => {
    try {
      let tasks: Partial<Task>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        // JSON format
        const parsed = JSON.parse(importData);
        tasks = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // CSV format
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const task: Partial<Task> = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              switch (header) {
                case 'title':
                  task.title = values[index];
                  break;
                case 'description':
                  task.description = values[index];
                  break;
                case 'project':
                  const project = projects.find(p => p.name === values[index]);
                  task.projectId = project?.id || projects[0]?.id;
                  break;
                case 'priority':
                  task.priority = values[index] as "low" | "medium" | "high";
                  break;
                case 'status':
                  task.status = values[index] as any;
                  break;
                case 'assignee':
                  task.assigneeId = values[index];
                  break;
                case 'due date':
                  task.dueDate = values[index];
                  break;
                case 'estimated hours':
                  task.estimatedHours = parseInt(values[index]);
                  break;
              }
            }
          });
          
          if (task.title && task.projectId) {
            tasks.push(task);
          }
        }
      }
      
      setPreviewTasks(tasks);
      toast({
        title: "Preview Generated",
        description: `Found ${tasks.length} valid tasks to import.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse import data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewTasks.length === 0) {
      toast({
        title: "Error",
        description: "No tasks to import. Please preview first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const taskData of previewTasks) {
        if (taskData.title && taskData.projectId) {
          const newTask: Omit<Task, 'id'> = {
            title: taskData.title,
            description: taskData.description || "",
            projectId: taskData.projectId,
            status: taskData.status || "todo",
            priority: taskData.priority || "medium",
            assigneeId: taskData.assigneeId,
            dueDate: taskData.dueDate,
            estimatedHours: taskData.estimatedHours,
            createdAt: new Date().toISOString(),
            collaboratorIds: [],
            subtasks: [],
            watcherIds: [],
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
            <Button onClick={handlePreview} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={previewTasks.length === 0 || isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : `Import ${previewTasks.length} Tasks`}
            </Button>
          </div>

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
              <strong>CSV Format:</strong> title,description,project,priority,status,assignee,due date,estimated hours
            </div>
            <div>
              <strong>JSON Format:</strong> Array of objects with properties: title, description, project, priority, status, assignee, dueDate, estimatedHours
            </div>
            <div>
              <strong>Required fields:</strong> title, project
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}