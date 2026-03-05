
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppContext } from "@/contexts/AppContext";
import { Task, TaskStatus } from "@/types";

import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Upload, Calendar, Users, User } from "lucide-react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { EditTaskTemplateDialog } from "@/components/tasks/EditTaskTemplateDialog";
import { BulkImportTasksDialog } from "@/components/tasks/BulkImportTasksDialog";
import { BulkEditTasksDialog } from "@/components/tasks/BulkEditTasksDialog";
import { TaskTemplatesList } from "@/components/tasks/TaskTemplatesList";
import { RecurringTasksList } from "@/components/tasks/RecurringTasksList";
import { TasksTimeline } from "@/components/tasks/TasksTimeline";
import { EnhancedFilterBar, FilterOption } from "@/components/common/EnhancedFilterBar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ViewSelector } from "@/components/kanban/ViewSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModernToolbar, ModernToolbarSection } from "@/components/common/ModernToolbar";

type TaskViewMode = "list" | "kanban" | "timeline";

export default function Tasks() {
  const { tasks, projects, users, clients, currentUser, taskStatuses } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL-based task opening state
  const [urlTaskId, setUrlTaskId] = useState<string | null>(null);
  const [urlTask, setUrlTask] = useState<Task | null>(null);
  const [isUrlTaskDialogOpen, setIsUrlTaskDialogOpen] = useState(false);
  const [isLoadingUrlTask, setIsLoadingUrlTask] = useState(false);
  
  // Auto-generate recurring tasks on page load
  useEffect(() => {
    const generateRecurringTasks = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke('generate-recurring-tasks');
        if (data?.processed > 0) {
          console.log('Generated recurring tasks:', data);
        }
      } catch (err) {
        // Silent fail - don't show errors for background task
        console.error('Error generating recurring tasks:', err);
      }
    };
    
    // Run on mount with a small delay to not block initial render
    const timer = setTimeout(generateRecurringTasks, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Debug logging to help identify why tasks aren't showing
  React.useEffect(() => {
    console.log('=== TASKS DEBUG ===');
    console.log('Total tasks:', tasks.length);
    console.log('Tasks:', tasks);
    console.log('Projects:', projects.length);
  }, [tasks, projects]);
  
  // Check URL for task ID on mount and when searchParams change
  // Immediately fetch the task from Supabase for faster loading
  useEffect(() => {
    const taskIdFromUrl = searchParams.get('task');
    console.log('=== URL Task Check ===');
    console.log('Task ID from URL:', taskIdFromUrl);
    
    if (!taskIdFromUrl) {
      setUrlTaskId(null);
      setUrlTask(null);
      setIsUrlTaskDialogOpen(false);
      return;
    }
    
    // First check if task is already in local state
    const existingTask = tasks.find(t => t.id === taskIdFromUrl);
    console.log('Existing task found in local state:', !!existingTask);
    
    if (existingTask) {
      setUrlTaskId(taskIdFromUrl);
      setUrlTask(existingTask);
      setIsUrlTaskDialogOpen(true);
      return;
    }
    
    // If already loading or we have the task, skip fetching
    if (isLoadingUrlTask || (urlTask && urlTask.id === taskIdFromUrl)) {
      return;
    }
    
    // If not found locally, fetch directly from Supabase for faster opening
    const fetchTask = async () => {
      console.log('Fetching task from Supabase...');
      setIsLoadingUrlTask(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskIdFromUrl)
          .single();
        
        if (error) {
          console.error('Error fetching task from URL:', error);
          return;
        }
        
        console.log('Task fetched successfully:', data?.title);
        
        if (data) {
          const task: Task = {
            id: data.id,
            title: data.title,
            description: data.description || '',
            status: data.status as any,
            priority: data.priority as any,
            projectId: data.project_id,
            assigneeId: data.assignee_id || undefined,
            collaboratorIds: data.collaborator_ids || [],
            dueDate: data.due_date || undefined,
            reminderDate: data.reminder_date || undefined,
            createdAt: data.created_at,
            estimatedHours: data.estimated_hours || undefined,
            actualHours: data.actual_hours || undefined,
            relatedTaskIds: data.related_task_ids || [],
            backlogReason: data.backlog_reason || undefined,
            awaitingFeedbackDetails: data.awaiting_feedback_details || undefined,
            dueDateChangeReason: data.due_date_change_reason || undefined,
            watcherIds: data.watcher_ids || [],
            checklist: Array.isArray(data.checklist) ? data.checklist as any : [],
            orderIndex: data.order_index || 0,
          };
          console.log('Opening dialog for task:', task.title);
          setUrlTaskId(taskIdFromUrl);
          setUrlTask(task);
          setIsUrlTaskDialogOpen(true);
        }
      } catch (err) {
        console.error('Error fetching task:', err);
      } finally {
        setIsLoadingUrlTask(false);
      }
    };
    
    fetchTask();
  }, [searchParams, tasks, isLoadingUrlTask, urlTask]);
  
  // Handle closing URL-based task dialog
  const handleUrlTaskDialogClose = (open: boolean) => {
    setIsUrlTaskDialogOpen(open);
    if (!open) {
      // Remove task param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('task');
      setSearchParams(newParams, { replace: true });
      setUrlTaskId(null);
      setUrlTask(null);
    }
  };
  
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditTaskIds, setBulkEditTaskIds] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [viewMode, setViewMode] = useState<TaskViewMode>("kanban");
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(true); // Default to showing only user's tasks

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name,
      })),
    },
    {
      id: "projects",
      name: "Project",
      options: projects.map(project => ({
        id: project.id,
        label: project.name,
      })),
    },
    {
      id: "assignees",
      name: "Owner",
      options: users.map(user => ({
        id: user.id,
        label: user.name,
      })),
    },
  ];

  // Filter tasks based on all filters
  React.useEffect(() => {
    const filtered = tasks.filter(task => {
      // Apply "My Tasks Only" filter first
      if (showMyTasksOnly && currentUser) {
        const isMyTask = task.assigneeId === currentUser.auth_user_id || 
                        (task.collaboratorIds && task.collaboratorIds.includes(currentUser.auth_user_id));
        if (!isMyTask) {
          return false;
        }
      }
      
      // Apply status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }
      
      // Apply active filters
      for (const [filterId, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;

        switch (filterId) {
          case "clients":
            // Find projects for the selected clients
            const projectsForClients = projects.filter(project => 
              values.includes(project.clientId)
            );
            const projectIds = projectsForClients.map(p => p.id);
            if (!projectIds.includes(task.projectId)) {
              return false;
            }
            break;
          case "projects":
            if (!values.includes(task.projectId)) {
              return false;
            }
            break;
          case "assignees":
            // Check if task has the selected assignee
            if (!task.assigneeId || !values.includes(task.assigneeId)) {
              return false;
            }
            break;
        }
      }

      // Filter by start date
      if (startDate && task.createdAt) {
        const taskStartDate = new Date(task.createdAt);
        // Use startDate as the minimum start date
        if (taskStartDate < startDate) {
          return false;
        }
      }

      // Filter by due date
      if (dueDate && task.dueDate) {
        const taskDueDate = new Date(task.dueDate);
        if (taskDueDate > dueDate) {
          return false;
        }
      }

      return true;
    });
    
    setFilteredTasks(filtered);
  }, [tasks, activeFilters, startDate, dueDate, projects, statusFilter, showMyTasksOnly, currentUser]);

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  const handleTemplateCreated = () => {
    setTemplateRefreshTrigger(prev => prev + 1);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setIsEditTemplateOpen(true);
  };

  const handleTemplateUpdated = () => {
    setTemplateRefreshTrigger(prev => prev + 1);
    setIsEditTemplateOpen(false);
    setEditingTemplate(null);
  };

  const handleBulkEdit = (taskIds: string[]) => {
    setBulkEditTaskIds(taskIds);
    setIsBulkEditOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and track all your tasks across projects
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <TabsList className="bg-muted/50 backdrop-blur-sm border border-border/50 shadow-sm w-full sm:w-auto">
              <TabsTrigger 
                value="tasks"
                className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >
                <CheckSquare className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Tasks</span>
                {filteredTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 px-1.5 py-0 text-xs">
                    {filteredTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="recurring"
                className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >
                <span className="hidden xs:inline">Recurring</span>
                <span className="xs:hidden">Rec.</span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates"
                className="flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >
                <span className="hidden xs:inline">Templates</span>
                <span className="xs:hidden">Tmpl.</span>
              </TabsTrigger>
            </TabsList>
            {activeTab === "tasks" ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Import Tasks</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Task</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setIsCreateTemplateOpen(true)}>
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Template</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-4 sm:space-y-6 animate-fade-in">
          <ModernToolbar>
            <ModernToolbarSection>
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
              <EnhancedFilterBar 
                filters={filterOptions} 
                onFilterChange={handleFilterChange}
                presetKey="tasks"
              />
              
              <Button
                variant={showMyTasksOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                className="flex items-center gap-1 sm:gap-2 flex-shrink-0"
              >
                {showMyTasksOnly ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                <span className="hidden sm:inline">{showMyTasksOnly ? "My Tasks" : "All Tasks"}</span>
              </Button>

              {viewMode !== "kanban" && taskStatuses && taskStatuses.length > 0 && (
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}
                >
                  <SelectTrigger className="w-[120px] sm:w-[180px] h-9 flex-shrink-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {taskStatuses
                      .sort((a, b) => a.order - b.order)
                      .map((status) => (
                        <SelectItem key={status.id} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal flex-shrink-0",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{dueDate ? format(dueDate, "PPP") : "Due Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {(startDate || dueDate || statusFilter !== "all" || Object.keys(activeFilters).length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setDueDate(undefined);
                    setStatusFilter("all");
                    setActiveFilters({});
                  }}
                  className="flex-shrink-0 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Clear All Filters</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </ModernToolbarSection>
            
            <ModernToolbarSection className="flex-shrink-0 justify-end">
              <ViewSelector currentView={viewMode} onViewChange={setViewMode} showTimeline={true} />
            </ModernToolbarSection>
          </ModernToolbar>

          <div className="mt-6 w-full">
            {viewMode === "timeline" ? (
              <TasksTimeline tasks={filteredTasks} />
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-lg font-medium">No tasks found</p>
                  <p className="text-muted-foreground text-sm">
                    {Object.keys(activeFilters).length > 0 || startDate || dueDate || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create a new task to get started"}
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4" 
                    onClick={() => setIsCreateTaskOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <KanbanBoard 
                tasks={filteredTasks} 
                viewMode={viewMode as "list" | "kanban"}
                onBulkEdit={handleBulkEdit}
                onTaskOpen={(taskId) => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('task', taskId);
                  setSearchParams(newParams, { replace: true });
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="mt-6">
          <RecurringTasksList />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TaskTemplatesList 
            onCreateTemplate={() => setIsCreateTemplateOpen(true)}
            onEditTemplate={handleEditTemplate}
            refreshTrigger={templateRefreshTrigger}
          />
        </TabsContent>
      </Tabs>
      
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />

      <CreateTaskTemplateDialog
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        onTemplateCreated={handleTemplateCreated}
      />

      <EditTaskTemplateDialog
        open={isEditTemplateOpen}
        onOpenChange={setIsEditTemplateOpen}
        template={editingTemplate}
        onTemplateUpdated={handleTemplateUpdated}
      />

      <BulkImportTasksDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
      />
      
      <BulkEditTasksDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        taskIds={bulkEditTaskIds}
      />
      
      {/* URL-based task loading indicator */}
      {isLoadingUrlTask && (
        <Dialog open={true}>
          <DialogContent className="sm:max-w-[400px]">
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading task...</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* URL-based task dialog for shareable links */}
      {urlTask && (
        <EditTaskDialog
          task={urlTask}
          open={isUrlTaskDialogOpen}
          onOpenChange={handleUrlTaskDialogClose}
        />
      )}
    </div>
  );
}
