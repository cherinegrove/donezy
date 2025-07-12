import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { TaskStatus, Task } from "@/types";
import { toast } from "sonner";
import { Upload, FileText, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BulkImportTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedTask {
  title: string;
  description: string;
  projectId: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export function BulkImportTasksDialog({ open, onOpenChange }: BulkImportTasksDialogProps) {
  const { projects, users, addTask } = useAppContext();
  const [csvData, setCsvData] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [defaultProjectId, setDefaultProjectId] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState("csv");

  const csvTemplate = `Title,Description,Project,Priority,Status,Assignee,Due Date,Estimated Hours
"Fix login bug","Update authentication system","Project Alpha","high","todo","john@example.com","2024-01-15","4"
"Add new feature","Implement user dashboard","Project Beta","medium","in-progress","jane@example.com","2024-01-20","8"
"Update documentation","Review and update API docs","Project Alpha","low","backlog","","2024-01-25","2"`;

  const jsonTemplate = `[
  {
    "title": "Fix login bug",
    "description": "Update authentication system",
    "project": "Project Alpha",
    "priority": "high",
    "status": "todo",
    "assignee": "john@example.com",
    "dueDate": "2024-01-15",
    "estimatedHours": 4
  },
  {
    "title": "Add new feature",
    "description": "Implement user dashboard",
    "project": "Project Beta",
    "priority": "medium",
    "status": "in-progress",
    "assignee": "jane@example.com",
    "dueDate": "2024-01-20",
    "estimatedHours": 8
  }
]`;

  const downloadTemplate = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? csvTemplate : jsonTemplate;
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task_import_template.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csv: string): ParsedTask[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const tasks: ParsedTask[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const task: Partial<ParsedTask> = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        switch (header.toLowerCase()) {
          case 'title':
            task.title = value;
            break;
          case 'description':
            task.description = value;
            break;
          case 'project':
            const project = projects.find(p => p.name === value);
            task.projectId = project?.id || defaultProjectId;
            break;
          case 'priority':
            task.priority = ['low', 'medium', 'high'].includes(value) ? value as 'low' | 'medium' | 'high' : 'medium';
            break;
          case 'status':
            task.status = ['backlog', 'todo', 'in-progress', 'review', 'done'].includes(value) ? value as TaskStatus : 'todo';
            break;
          case 'assignee':
            const user = users.find(u => u.email === value);
            task.assigneeId = user?.id;
            break;
          case 'due date':
            task.dueDate = value;
            break;
          case 'estimated hours':
            task.estimatedHours = value ? parseInt(value) : undefined;
            break;
        }
      });

      if (task.title && task.projectId) {
        tasks.push(task as ParsedTask);
      }
    }

    return tasks;
  };

  const parseJSON = (json: string): ParsedTask[] => {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return [];

      return data.map(item => {
        const project = projects.find(p => p.name === item.project);
        const user = users.find(u => u.email === item.assignee);

        return {
          title: item.title || '',
          description: item.description || '',
          projectId: project?.id || defaultProjectId,
          priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
          status: ['backlog', 'todo', 'in-progress', 'review', 'done'].includes(item.status) ? item.status : 'todo',
          assigneeId: user?.id,
          dueDate: item.dueDate,
          estimatedHours: item.estimatedHours ? parseInt(item.estimatedHours) : undefined,
        };
      }).filter(task => task.title && task.projectId);
    } catch (error) {
      console.error('JSON parsing error:', error);
      return [];
    }
  };

  const handlePreview = () => {
    if (!defaultProjectId) {
      toast.error("Please select a default project first");
      return;
    }

    const data = activeTab === 'csv' ? csvData : jsonData;
    if (!data.trim()) {
      toast.error("Please provide data to import");
      return;
    }

    const parsed = activeTab === 'csv' ? parseCSV(data) : parseJSON(data);
    
    if (parsed.length === 0) {
      toast.error("No valid tasks found in the data");
      return;
    }

    setParsedTasks(parsed);
    toast.success(`Preview generated: ${parsed.length} tasks ready to import`);
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) {
      toast.error("No tasks to import. Please preview first.");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const task of parsedTasks) {
        try {
          await addTask({
            title: task.title,
            description: task.description,
            projectId: task.projectId,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assigneeId,
            dueDate: task.dueDate,
            estimatedHours: task.estimatedHours,
            collaboratorIds: [],
            subtasks: [],
          });
          successCount++;
        } catch (error) {
          console.error('Error importing task:', task.title, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} tasks`);
        if (errorCount > 0) {
          toast.warning(`${errorCount} tasks failed to import`);
        }
        
        // Reset form
        setCsvData("");
        setJsonData("");
        setParsedTasks([]);
        onOpenChange(false);
      } else {
        toast.error("Failed to import any tasks");
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Default Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="defaultProject">Default Project *</Label>
            <Select value={defaultProjectId} onValueChange={setDefaultProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a default project for tasks without a specified project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Format</TabsTrigger>
              <TabsTrigger value="json">JSON Format</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>CSV Data</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('csv')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <Textarea
                placeholder="Paste your CSV data here..."
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">CSV Format Guide</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Required columns:</strong> Title, Project</p>
                  <p><strong>Optional columns:</strong> Description, Priority (low/medium/high), Status (backlog/todo/in-progress/review/done), Assignee (email), Due Date (YYYY-MM-DD), Estimated Hours</p>
                  <p><strong>Example:</strong> Title,Description,Project,Priority,Status,Assignee,Due Date,Estimated Hours</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>JSON Data</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate('json')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <Textarea
                placeholder="Paste your JSON data here..."
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">JSON Format Guide</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Required fields:</strong> title, project</p>
                  <p><strong>Optional fields:</strong> description, priority, status, assignee, dueDate, estimatedHours</p>
                  <p>Must be a valid JSON array of task objects.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Preview Section */}
          {parsedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preview ({parsedTasks.length} tasks)
                </CardTitle>
                <CardDescription>
                  Review the tasks before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[200px] overflow-auto space-y-2">
                  {parsedTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {projects.find(p => p.id === task.projectId)?.name} • {task.priority} • {task.status}
                        </p>
                      </div>
                      {task.assigneeId && (
                        <div className="text-sm text-muted-foreground">
                          {users.find(u => u.id === task.assigneeId)?.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={!defaultProjectId}>
            Preview
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedTasks.length === 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${parsedTasks.length} Tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}