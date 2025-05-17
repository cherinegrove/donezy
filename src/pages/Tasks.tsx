
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Task, TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "list" | "gantt" | "kanban";

export default function Tasks() {
  const { tasks, projects, users, clients } = useAppContext();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

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
  }, [tasks, activeFilters, startDate, dueDate, projects, statusFilter]);

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all your tasks across projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Make ViewSelector visible in all views */}
          <ViewSelector currentView={viewMode} onViewChange={setViewMode} />
          <Button onClick={() => setIsCreateTaskOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />
        
        {/* Status Filter */}
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
        
        {/* Start Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
            {startDate && (
              <div className="flex justify-end p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStartDate(undefined)}
                >
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        
        {/* Due Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              {dueDate ? format(dueDate, "MMM d, yyyy") : "Due Date"}
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
            {dueDate && (
              <div className="flex justify-end p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDueDate(undefined)}
                >
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        
        {/* Clear all filters button */}
        {(Object.keys(activeFilters).length > 0 || startDate || dueDate || statusFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground h-9"
            onClick={() => {
              setActiveFilters({});
              setStartDate(undefined);
              setDueDate(undefined);
              setStatusFilter("all");
            }}
          >
            Clear all filters
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
          <div className="w-full overflow-auto">
            <KanbanBoard 
              tasks={filteredTasks} 
              viewMode={viewMode}
            />
          </div>
        )}
      </div>
      
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
    </div>
  );
}
