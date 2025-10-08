
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Upload, Users, User, Calendar } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { EditTaskTemplateDialog } from "@/components/tasks/EditTaskTemplateDialog";
import { BulkImportTasksDialog } from "@/components/tasks/BulkImportTasksDialog";
import { BulkEditTasksDialog } from "@/components/tasks/BulkEditTasksDialog";
import { TaskTemplatesList } from "@/components/tasks/TaskTemplatesList";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "list" | "kanban";

export default function Tasks() {
  const { tasks, projects, users, clients, currentUser } = useAppContext();
  
  // Debug logging to help identify why tasks aren't showing
  React.useEffect(() => {
    console.log('=== TASKS DEBUG ===');
    console.log('Total tasks:', tasks.length);
    console.log('Tasks:', tasks);
    console.log('Projects:', projects.length);
  }, [tasks, projects]);
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
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
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
      name: "Assignee",
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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground">
              Manage and track all your tasks across projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            {activeTab === "tasks" ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Tasks
                </Button>
                <Button onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsCreateTemplateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />
              
              {/* My Tasks Only Toggle */}
              <Button
                variant={showMyTasksOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                className="flex items-center gap-2"
              >
                {showMyTasksOnly ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                {showMyTasksOnly ? "My Tasks" : "All Tasks"}
              </Button>
            </div>
            <ViewSelector currentView={viewMode} onViewChange={setViewMode} />
          </div>

          <div className="flex flex-wrap gap-2">
            {viewMode !== "kanban" && (
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Due Date"}
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
              >
                Clear All Filters
              </Button>
            )}
          </div>

          <div className="mt-6 w-full">
            {filteredTasks.length === 0 ? (
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
                viewMode={viewMode}
                onBulkEdit={handleBulkEdit}
              />
            )}
          </div>
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
