import { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Upload,
  Loader2,
  Check,
  X,
  Sparkles,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ExtractedTask {
  title: string;
  description: string;
}

interface AssistantResponse {
  message: string;
  tasks?: ExtractedTask[];
  projectName?: string;
  projectDescription?: string;
}

export default function AIAssistant() {
  const { addProject, addTask, projects, tasks } = useAppContext();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your AI Assistant. I can help you create tasks, analyze documents, answer questions about your projects, and suggest task breakdowns. How can I help?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewTasks, setPreviewTasks] = useState<ExtractedTask[]>([]);
  const [previewProject, setPreviewProject] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `📎 Uploaded: ${uploadedFile.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Convert file to base64 and send to backend for processing
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await sendToAssistant(
          `[File attached: ${uploadedFile.name}]`,
          uploadedFile.name,
          base64,
          uploadedFile.type
        );
        setLoading(false);
        setFile(null);
      };
      reader.onerror = () => {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Failed to read the file. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        setFile(null);
      };
      reader.readAsDataURL(uploadedFile);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Failed to process the file. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLoading(false);
      setFile(null);
    }
  };

  const sendToAssistant = async (
    userText: string,
    fileName?: string,
    fileBase64?: string,
    fileType?: string
  ) => {
    if (!userText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Prepare context about user's projects and tasks
      const projectContext = projects
        .map((p) => `- ${p.name} (${p.status})`)
        .join("\n");
      const taskContext = tasks.slice(0, 10).map((t) => `- ${t.title}`).join("\n");

      const response = await supabase.functions.invoke("ai-assistant", {
        body: {
          userMessage: userText,
          fileName,
          fileBase64,
          fileType,
          projects: projectContext,
          recentTasks: taskContext,
        },
      });

      if (!response.data) throw new Error("No response from assistant");

      const assistantData = response.data as AssistantResponse;

      // Add assistant response message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantData.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // If tasks were suggested, show preview
      if (assistantData.tasks && assistantData.tasks.length > 0) {
        setPreviewTasks(assistantData.tasks);
        setPreviewProject({
          name:
            assistantData.projectName || `Project - ${new Date().toLocaleDateString()}`,
          description: assistantData.projectDescription || "",
        });
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please try again or rephrase your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const message = input;
    setInput("");
    await sendToAssistant(message);
  };

  const handleCreateProject = async () => {
    if (!previewProject || previewTasks.length === 0) return;

    setCreating(true);

    try {
      const newProject = {
        id: `proj-${Date.now()}`,
        name: previewProject.name,
        description: previewProject.description,
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

      previewTasks.forEach((task, index) => {
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
        description: `Created project "${previewProject.name}" with ${previewTasks.length} tasks`,
      });

      setPreviewTasks([]);
      setPreviewProject(null);

      const confirmMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `✅ Great! I've created the project "${previewProject.name}" with ${previewTasks.length} tasks. Is there anything else I can help you with?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h1 className="text-3xl font-bold">AI Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your intelligent assistant for task creation, analysis, and planning
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-6 p-6">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Messages */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-semibold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  <div
                    className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="text-xs font-semibold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                    AI
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Describe your project, ask questions, or paste content..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                rows={3}
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={loading}
                    asChild
                    className="cursor-pointer"
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Describe your project, upload a document, or ask for help
              with task planning
            </p>
          </div>
        </div>

        {/* Preview Section */}
        {previewTasks.length > 0 && (
          <Card className="w-96 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Preview Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {previewProject && (
                <div className="border-b pb-4 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Project Name
                    </label>
                    <p className="font-semibold">{previewProject.name}</p>
                  </div>
                  {previewProject.description && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Description
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {previewProject.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Tasks ({previewTasks.length})
                </label>
                {previewTasks.map((task, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border space-y-1"
                  >
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewTasks([]);
                    setPreviewProject(null);
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
