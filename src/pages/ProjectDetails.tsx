import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Project, Task } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar, Edit, Clock, AlertTriangle, User, Users, CheckSquare, FileText, Files, Bell, Mail, GanttChart, X, Link2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO, isValid, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ConvertToTemplateDialog } from "@/components/projects/ConvertToTemplateDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ProjectNotesSimple } from "@/components/projects/ProjectNotesSimple";
import { ProjectFilesAdvanced } from "@/components/projects/ProjectFilesAdvanced";
import { BulkEditTasksDialog } from "@/components/tasks/BulkEditTasksDialog";
import { GoogleChatSettings } from "@/components/projects/GoogleChatSettings";
import { WeeklyRoundupDialog } from "@/components/projects/WeeklyRoundupDialog";
import { TaskTimeline } from "@/components/projects/TaskTimeline";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { SharePortalDialog } from "@/components/projects/SharePortalDialog";

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, timeEntries, users } = useAppContext();
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditTaskIds, setBulkEditTaskIds] = useState<string[]>([]);
  const [isGeneratingRoundup, setIsGeneratingRoundup] = useState(false);
  const [roundupDialogOpen, setRoundupDialogOpen] = useState(false);
  const [selectedOverdueTask, setSelectedOverdueTask] = useState<Task | null>(null);
  const [sharePortalOpen, setSharePortalOpen] = useState(false);
  const [roundupSettings, setRoundupSettings] = useState<{
    enabled: boolean;
    day: string;
    time: string;
    recipientEmail: string;
  }>({ enabled: false, day: "friday", time: "09:00", recipientEmail: "" });
  const [isSavingRoundupSettings, setIsSavingRoundupSettings] = useState(false);
  
  // Task filters
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<Date | undefined>(undefined);
  
  const [roundupData, setRoundupData] = useState<{
    subject: string;
    emailContent: string;
    emailHtml?: string;
    stats: {
      completedCount: number;
      inProgressCount: number;
      awaitingCount: number;
      projectHealth: "on-track" | "attention-needed" | "blocked";
      backlogCount: number;
      awaitingFeedbackCount: number;
      completedThisWeek: number;
      addedThisWeek: number;
    };
  } | null>(null);
  
  // Update project when projects state changes
  useEffect(() => {
    console.log("Projects state updated:", projects.length);
    const foundProject = projects.find(p => p.id === projectId);
    console.log("Looking for project with ID:", projectId, "Found:", foundProject);
    setProject(foundProject || null);
  }, [projects, projectId]);

  // Load roundup settings from project
  useEffect(() => {
    if (project && (project as any).weekly_roundup_settings) {
      const s = (project as any).weekly_roundup_settings;
      setRoundupSettings({
        enabled: s.enabled ?? false,
        day: s.day ?? "friday",
        time: s.time ?? "09:00",
        recipientEmail: s.recipientEmail ?? "",
      });
    } else if (project) {
      // Default recipient to client email
      setRoundupSettings(prev => ({
        ...prev,
        recipientEmail: clients.find(c => c.id === project.clientId)?.email ?? "",
      }));
    }
  }, [project?.id]);
  
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = tasks.filter(task => task.projectId === projectId);
  
  // Get unique task owners for the filter dropdown
  const taskOwners = useMemo(() => {
    const ownerIds = new Set<string>();
    projectTasks.forEach(task => {
      if (task.assigneeId) {
        ownerIds.add(task.assigneeId);
      }
    });
    return Array.from(ownerIds).map(id => {
      const user = users.find(u => u.id === id || u.auth_user_id === id);
      return { id, name: user?.name || "Unknown" };
    });
  }, [projectTasks, users]);
  
  // Filter tasks based on selected filters
  const filteredProjectTasks = useMemo(() => {
    return projectTasks.filter(task => {
      // Owner filter
      if (ownerFilter !== "all" && task.assigneeId !== ownerFilter) {
        return false;
      }
      
      // Due date filter
      if (dueDateFilter) {
        if (!task.dueDate) return false;
        const taskDueDate = new Date(task.dueDate);
        const filterDate = startOfDay(dueDateFilter);
        const filterDateEnd = endOfDay(dueDateFilter);
        if (!isValid(taskDueDate) || taskDueDate < filterDate || taskDueDate > filterDateEnd) {
          return false;
        }
      }
      
      return true;
    });
  }, [projectTasks, ownerFilter, dueDateFilter]);
  
  const totalHours = timeEntries
    .filter(entry => entry.projectId === projectId)
    .reduce((sum, entry) => sum + entry.duration, 0);

  // Calculate days left until due date
  const calculateDaysLeft = (dueDate: string | undefined) => {
    if (!dueDate || dueDate.trim() === "") return null;
    
    try {
      // Try parsing different date formats
      let date: Date;
      if (dueDate.includes('/') || dueDate.includes('-')) {
        date = new Date(dueDate);
      } else {
        date = parseISO(dueDate);
      }
      
      if (!isValid(date)) return null;
      
      const today = new Date();
      const diffDays = differenceInDays(date, today);
      return diffDays;
    } catch {
      return null;
    }
  };

  // Calculate overdue tasks
  const overdueTasks = projectTasks.filter(task => {
    if (!task.dueDate || task.dueDate.trim() === "" || task.status === 'done') return false;
    
    try {
      const dueDate = new Date(task.dueDate);
      if (!isValid(dueDate)) return false;
      
      const today = new Date();
      return dueDate < today;
    } catch {
      return false;
    }
  });

  const daysLeft = calculateDaysLeft(project?.dueDate);
  const totalHoursFormatted = Math.round((totalHours / 60) * 10) / 10;

  // Helper functions to get user details
  const getOwnerName = () => {
    if (!project?.ownerId) return "No owner assigned";
    const owner = users.find(user => user.id === project.ownerId);
    return owner ? owner.name : "Unknown user";
  };

  const getCollaboratorNames = () => {
    if (!project?.collaboratorIds || project.collaboratorIds.length === 0) {
      return [];
    }
    return project.collaboratorIds.map(id => {
      const collaborator = users.find(user => user.id === id);
      return collaborator ? collaborator.name : "Unknown user";
    });
  };

  // Show loading state while searching for project
  if (!project && projects.length > 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested project could not be found.</p>
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while projects are being loaded
  if (!project && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  const handleEditProject = () => {
    console.log("Opening edit dialog for project:", project);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    console.log("Closing edit dialog");
    setEditDialogOpen(false);
  };

  const handleBulkEdit = (taskIds: string[]) => {
    setBulkEditTaskIds(taskIds);
    setIsBulkEditOpen(true);
  };

  const handleGenerateRoundup = async () => {
    if (!project || !client?.email) {
      toast({
        title: "Cannot generate roundup",
        description: "Client email is not configured for this project",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingRoundup(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-weekly-project-roundup", {
        body: { project_id: project.id },
      });

      if (error) throw error;

      setRoundupData({
        subject: data.subject,
        emailContent: data.emailContent,
        emailHtml: data.emailHtml,
        stats: data.stats,
      });
      setRoundupDialogOpen(true);
    } catch (error) {
      console.error("Error generating roundup:", error);
      toast({
        title: "Error",
        description: "Failed to generate weekly roundup",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingRoundup(false);
    }
  };

  const handleSaveRoundupSettings = async () => {
    if (!project) return;
    setIsSavingRoundupSettings(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ weekly_roundup_settings: roundupSettings } as any)
        .eq("id", project.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Roundup schedule saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSavingRoundupSettings(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setSharePortalOpen(true)}>
            <Link2 className="w-4 h-4 mr-2" />
            Share with Client
          </Button>
          <Button variant="outline" onClick={handleEditProject}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
          <Button onClick={() => setConvertDialogOpen(true)}>
            Convert to Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="pb-3 border-b">
              <h3 className="font-semibold text-lg">{project.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Client:</span>
              <span className="font-medium">{client?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Service Type:</span>
              <span className="font-medium capitalize">{project.serviceType?.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Allocated Hours:</span>
              <span className="font-medium">{project.allocatedHours || 0}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {project.startDate ? format(new Date(project.startDate), "MMM dd, yyyy") : "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="font-medium">
                {project.dueDate ? format(new Date(project.dueDate), "MMM dd, yyyy") : "Not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Project Owner</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{getOwnerName()}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Collaborators</span>
              </div>
              <div className="ml-6">
                {getCollaboratorNames().length > 0 ? (
                  <div className="space-y-1">
                    {getCollaboratorNames().map((name, index) => (
                      <p key={index} className="text-sm text-muted-foreground">{name}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No collaborators assigned</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Hours Summary</span>
              </div>
              <div className="ml-6 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracked:</span>
                  <span className="font-medium">{totalHoursFormatted}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allocated:</span>
                  <span className="font-medium">{project.allocatedHours || 0}h</span>
                </div>
                {project.allocatedHours && project.allocatedHours > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`font-medium ${
                      (project.allocatedHours - totalHoursFormatted) < 0 
                        ? 'text-red-500' 
                        : 'text-green-500'
                    }`}>
                      {Math.max(0, project.allocatedHours - totalHoursFormatted).toFixed(1)}h
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <h3 className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {overdueTasks.length}
              </h3>
              <p className="text-sm text-muted-foreground">
                {overdueTasks.length === 0 ? 'All tasks on track' : 'Tasks overdue'}
              </p>
            </div>
            
            <div className="h-32">
              {overdueTasks.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No overdue tasks to display</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-4">
                    {overdueTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="p-2 border rounded-md bg-red-50 border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setSelectedOverdueTask(task)}
                      >
                        <h4 className="font-medium text-sm text-red-800">{task.title}</h4>
                        <p className="text-xs text-red-600">
                          Due: {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "No due date"}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedOverdueTask && (
        <EditTaskDialog
          task={selectedOverdueTask}
          open={!!selectedOverdueTask}
          onOpenChange={(open) => {
            if (!open) setSelectedOverdueTask(null);
          }}
        />
      )}

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1.5 backdrop-blur-sm border border-border/50 shadow-sm w-full">
          <TabsTrigger 
            value="tasks" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <CheckSquare className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Tasks</span>
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 h-5 min-w-[20px] text-xs transition-all group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground">
              {projectTasks.length}
            </Badge>
          </TabsTrigger>
          
          <TabsTrigger 
            value="notes"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <FileText className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Notes</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="files"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <Files className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Files</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="timeline"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <GanttChart className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Timeline</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="roundup"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <Mail className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Weekly Roundup</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="notifications"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md hover:bg-background/60 gap-2 group"
          >
            <Bell className="h-4 w-4 transition-transform group-data-[state=active]:scale-110" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="mt-6 animate-fade-in">
          {/* Task Filters */}
          <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Owner</Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="all">All Owners</SelectItem>
                  {taskOwners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Due Date</Label>
              <DatePicker
                date={dueDateFilter}
                onDateChange={setDueDateFilter}
              />
            </div>
            
            {(ownerFilter !== "all" || dueDateFilter) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setOwnerFilter("all");
                  setDueDateFilter(undefined);
                }}
                className="h-10"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
            
            {(ownerFilter !== "all" || dueDateFilter) && (
              <Badge variant="secondary" className="h-6">
                {filteredProjectTasks.length} of {projectTasks.length} tasks
              </Badge>
            )}
          </div>
          
          <KanbanBoard 
            tasks={filteredProjectTasks} 
            projectId={projectId} 
            viewMode="kanban" 
            onBulkEdit={handleBulkEdit}
          />
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6 animate-fade-in">
          <ProjectNotesSimple projectId={projectId!} />
        </TabsContent>
        
        <TabsContent value="files" className="mt-6 animate-fade-in">
          <ProjectFilesAdvanced projectId={projectId!} />
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6 animate-fade-in">
          <TaskTimeline tasks={projectTasks} projectId={projectId!} />
        </TabsContent>
        
        <TabsContent value="roundup" className="mt-6 animate-fade-in">
          <div className="space-y-6">
            {/* Manual Generate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Weekly Project Roundup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Generate a preview of this week's roundup email — includes only <strong>In Progress</strong> tasks.
                </p>
                {!client?.email ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Client email is not configured for this project. Please update the client's email address to generate roundups.
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleGenerateRoundup} disabled={isGeneratingRoundup}>
                    <Mail className="w-4 h-4 mr-2" />
                    {isGeneratingRoundup ? "Generating..." : "Preview Roundup"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Schedule Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Automatic Schedule
                  </span>
                  <Switch
                    checked={roundupSettings.enabled}
                    onCheckedChange={(v) => setRoundupSettings(s => ({ ...s, enabled: v }))}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  When enabled, the roundup will be sent automatically on the selected day and time. Only <strong>In Progress</strong> tasks will be included.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Send on</Label>
                    <Select
                      value={roundupSettings.day}
                      onValueChange={(v) => setRoundupSettings(s => ({ ...s, day: v }))}
                      disabled={!roundupSettings.enabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Time</Label>
                    <input
                      type="time"
                      value={roundupSettings.time}
                      onChange={(e) => setRoundupSettings(s => ({ ...s, time: e.target.value }))}
                      disabled={!roundupSettings.enabled}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Send to (email)</Label>
                    <input
                      type="email"
                      value={roundupSettings.recipientEmail}
                      onChange={(e) => setRoundupSettings(s => ({ ...s, recipientEmail: e.target.value }))}
                      disabled={!roundupSettings.enabled}
                      placeholder={client?.email || "Recipient email"}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveRoundupSettings} disabled={isSavingRoundupSettings} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingRoundupSettings ? "Saving..." : "Save Schedule"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6 animate-fade-in">
          <GoogleChatSettings project={project} />
        </TabsContent>
      </Tabs>
      
      <ConvertToTemplateDialog
        project={project}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
      />

      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
      />
      
      <BulkEditTasksDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        taskIds={bulkEditTaskIds}
      />
      
      <WeeklyRoundupDialog
        open={roundupDialogOpen}
        onOpenChange={setRoundupDialogOpen}
        projectId={projectId!}
        clientEmail={client?.email || ""}
        clientName={client?.name || ""}
        roundupData={roundupData}
      />

      <SharePortalDialog
        open={sharePortalOpen}
        onOpenChange={setSharePortalOpen}
        projectId={projectId!}
        projectName={project.name}
      />
    </div>
  );
}
