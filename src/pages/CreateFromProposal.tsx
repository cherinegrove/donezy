import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Loader2, Check, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";

interface ExtractedTask {
  title: string;
  description: string;
}

interface ProposalData {
  projectName: string;
  description: string;
  tasks: ExtractedTask[];
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function CreateFromProposal() {
  const { addProject, addTask } = useAppContext();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [creating, setCreating] = useState(false);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(" ");
    }

    return text;
  };

  const extractExcelText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          let text = "";

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            text += XLSX.utils.sheet_to_txt(worksheet) + "\n";
          });

          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      let fileText = "";

      if (uploadedFile.type === "application/pdf") {
        fileText = await extractPdfText(uploadedFile);
      } else if (
        uploadedFile.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        uploadedFile.type === "application/vnd.ms-excel"
      ) {
        fileText = await extractExcelText(uploadedFile);
      }

      if (!fileText.trim()) {
        toast({
          title: "Error",
          description: "Could not extract text from file",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call Supabase edge function to analyze the proposal
      const response = await supabase.functions.invoke("analyze-proposal", {
        body: { content: fileText },
      });

      if (!response.ok) throw new Error("Failed to analyze proposal");

      const data = await response.json();
      setProposalData(data);
      setProjectName(data.projectName);
      setProjectDescription(data.description);
      setTasks(data.tasks);

      toast({
        title: "Success",
        description: `Extracted ${data.tasks.length} actionable items from proposal`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to process file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || tasks.length === 0) {
      toast({
        title: "Error",
        description: "Project name and at least one task are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      // Create project
      const newProject = {
        id: `proj-${Date.now()}`,
        name: projectName,
        description: projectDescription,
        status: "not-started" as const,
        startDate: new Date().toISOString(),
        dueDate: null,
        clientId: null,
        allocatedHours: 0,
        usedHours: 0,
        owner: null,
        createdAt: new Date().toISOString(),
      };

      addProject(newProject);

      // Create tasks
      tasks.forEach((task, index) => {
        const newTask = {
          id: `task-${Date.now()}-${index}`,
          title: task.title,
          description: task.description,
          projectId: newProject.id,
          status: "not-started" as const,
          priority: "medium" as const,
          dueDate: null,
          assigneeId: null,
          estimatedHours: 0,
          createdAt: new Date().toISOString(),
          comments: [],
        };
        addTask(newTask);
      });

      toast({
        title: "Success",
        description: `Created project "${projectName}" with ${tasks.length} tasks`,
      });

      // Reset form
      setFile(null);
      setProposalData(null);
      setProjectName("");
      setProjectDescription("");
      setTasks([]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create from Proposal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a proposal document to extract actionable items and create a project
        </p>
      </div>

      {!proposalData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Proposal File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <p className="text-xs text-muted-foreground mt-1">PDF or Excel files supported</p>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                />
              </label>
              {file && <p className="text-sm mt-4 text-green-600">✓ {file.name}</p>}
              {loading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing proposal...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Extracted Tasks ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setProposalData(null);
                setProjectName("");
                setProjectDescription("");
                setTasks([]);
              }}
            >
              Upload Different File
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creating || tasks.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Project & Tasks
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
