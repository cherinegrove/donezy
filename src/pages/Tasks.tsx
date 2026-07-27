
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { TaskStatus, Task } from "@/types";

import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Upload, Calendar } from "lucide-react";
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
import { format, isToday, parseISO } from "date-fns";
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
import { ThreePaneLayout } from "@/components/layout/ThreePaneLayout";
import { TaskSidebarPanel } from "@/components/tasks/TaskSidebarPanel";

type TaskViewMode = "list" | "kanban" | "timeline";

const TASKS_FILTERS_STORAGE_KEY = "donezy-tasks-filters";
const TASKS_VIEW_MODE_KEY = "donezy-tasks-view-mode";

export default function Tasks() {
  const { tasks, projects, users, clients, currentUser, taskStatuses } = useAppContext();
  const navigate = useNavigate();
  
  // Auto-generate recurring tasks on page load
  useEffect(() => {
    const generateRecurringTasks = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.functions.invoke('generate-recurring-tasks');
        if (data?.processed > 0) {
          console.log('Generated recurring tasks:', data);
        }
      } catch (err) {
        console.error('Error generating recurring tasks:', err);
      }
    };
    const timer = setTimeout(generateRecurringTasks, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditTaskIds, setBulkEditTaskIds] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Filters persist across navigation (e.g. opening a task and coming back,
  // which remounts this page) so a chosen filter stays until the user changes it.
  const [persistedFilters] = useState<any>(() => {
    try {
      const stored = localStorage.getItem(TASKS_FILTERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    persistedFilters.activeFilters || {},
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    persistedFilters.startDate ? new Date(persistedFilters.startDate) : undefined,
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    persistedFilters.dueDate ? new Date(persistedFilters.dueDate) : undefined,
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">(
    persistedFilters.statusFilter || "all",
  );
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    try {
      const stored = localStorage.getItem(TASKS_VIEW_MODE_KEY);
      return (stored as TaskViewMode) || "kanban";
    } catch {
      return "kanban";
    }
  });

  // Save view mode whenever it changes.
  React.useEffect(() => {
    try {
      localStorage.setItem(TASKS_VIEW_MODE_KEY, viewMode);
    } catch {
      /* ignore quota/serialization errors */
    }
  }, [viewMode]);

  // Save filter selections whenever they change.
  React.useEffect(() => {
    try {
      localStorage.setItem(
        TASKS_FILTERS_STORAGE_KEY,
        JSON.stringify({
          activeFilters,
          startDate: startDate ? startDate.toISOString() : undefined,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          statusFilter,
        }),
      );
    } catch {
      /* ignore quota/serialization errors */
    }
  }, [activeFilters, startDate, dueDate, statusFilter]);

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
    {
      id: "priority",
      name: "Priority",
      options: [
        { id: "urgent", label: "Urgent" },
        { id: "high", label: "High" },
        { id: "medium", label: "Medium" },
        { id: "low", label: "Low" },
      ],
    },
    {
      id: "flagged",
      name: "Flagged",
      options: [
        { id: "flagged", label: "Flagged (Urgent or Due Today)" },
      ],
    },
  ];

  // Memoize filter lookups for O(1) performance instead of O(n²)
  const filterLookups = React.useMemo(() => {
    const clientFilter = activeFilters["clients"] || [];
    const projectFilter = activeFilters["projects"] || [];
    const assigneeFilter = activeFilters["assignees"] || [];
    const priorityFilter = activeFilters["priority"] || [];
    const flaggedFilter = activeFilters["flagged"] || [];

    // Precompute project IDs for selected clients (Set for O(1) lookup)
    const selectedClientIds = new Set(clientFilter);
    const projectIdsForClients = new Set<string>();
    if (selectedClientIds.size > 0) {
      projects.forEach(project => {
        if (project.clientId && selectedClientIds.has(project.clientId)) {
          projectIdsForClients.add(project.id);
        }
      });
    }

    return {
      clientProjectIds: projectIdsForClients,
      selectedProjects: new Set(projectFilter),
      selectedAssignees: new Set(assigneeFilter),
      selectedPriorities: new Set(priorityFilter),
      hasFlaggedFilter: flaggedFilter.length > 0,
      hasClientFilter: selectedClientIds.size > 0,
      hasProjectFilter: projectFilter.length > 0,
      hasAssigneeFilter: assigneeFilter.length > 0,
      hasPriorityFilter: priorityFilter.length > 0,
    };
  }, [activeFilters, projects]);

  // Filter tasks based on all filters
  React.useEffect(() => {
    const filtered = tasks.filter(task => {
      // Apply status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Apply client filter
      if (filterLookups.hasClientFilter && !filterLookups.clientProjectIds.has(task.projectId)) {
        return false;
      }

      // Apply project filter
      if (filterLookups.hasProjectFilter && !filterLookups.selectedProjects.has(task.projectId)) {
        return false;
      }

      // Apply assignee filter
      if (filterLookups.hasAssigneeFilter && (!task.assigneeId || !filterLookups.selectedAssignees.has(task.assigneeId))) {
        return false;
      }

      // Apply priority filter
      if (filterLookups.hasPriorityFilter && !filterLookups.selectedPriorities.has(task.priority || 'none')) {
        return false;
      }

      // Apply flagged filter
      if (filterLookups.hasFlaggedFilter) {
        const isFlagged = task.priority === 'urgent' || (task.dueDate && isToday(parseISO(task.dueDate)));
        if (!isFlagged) {
          return false;
        }
      }

      // Filter by start date
      if (startDate && task.createdAt) {
        const taskStartDate = new Date(task.createdAt);
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
  }, [tasks, filterLookups, startDate, dueDate, statusFilter, activeFilters]);

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
                initialFilters={activeFilters}
                presetKey="tasks"
              />

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

              {(Object.keys(activeFilters).some(key => activeFilters[key].length > 0) || statusFilter !== "all" || dueDate || startDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setActiveFilters({});
                    setStatusFilter("all");
                    setDueDate(undefined);
                    setStartDate(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </ModernToolbarSection>

            <ModernToolbarSection className="ml-auto">
              <ViewSelector currentView={viewMode} onViewChange={setViewMode} showTimeline={true} />
            </ModernToolbarSection>
          </ModernToolbar>

          <ThreePaneLayout
            center={
              <div className="relative mt-6 w-full h-full flex flex-col">
                {selectedTaskId && (
                  <div
                    className="absolute inset-0 z-40 cursor-pointer pointer-events-auto"
                    onClick={() => setSelectedTaskId(null)}
                  />
                )}
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
                    tasks={viewMode === "list" ? filteredTasks.filter(t => t.status !== "done") : filteredTasks}
                    viewMode={viewMode as "list" | "kanban"}
                    onBulkEdit={handleBulkEdit}
                    onTaskOpen={(taskId) => {
                      setSelectedTaskId(taskId);
                    }}
                  />
                )}
              </div>
            }
            right={
              selectedTaskId && tasks.find(t => t.id === selectedTaskId) ? (
                <TaskSidebarPanel
                  task={tasks.find(t => t.id === selectedTaskId)!}
                  onClose={() => setSelectedTaskId(null)}
                />
              ) : null
            }
            rightOpen={!!selectedTaskId}
            onRightClose={() => setSelectedTaskId(null)}
            rightWidth="w-[850px]"
          />
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
    </div>
  );
}
