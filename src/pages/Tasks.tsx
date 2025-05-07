
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckSquare, Filter, Plus, SlidersHorizontal } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";

export default function Tasks() {
  const { tasks, projects, users, teams } = useAppContext();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Define filter options
  const filterOptions: FilterOption[] = [
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
    {
      id: "priority",
      name: "Priority",
      options: [
        { id: "high", label: "High" },
        { id: "medium", label: "Medium" },
        { id: "low", label: "Low" },
      ],
    },
  ];

  // Filter tasks based on the active tab and filters
  const filteredTasks = tasks.filter(task => {
    // First filter by status tab
    if (activeTab !== "all" && task.status !== activeTab) {
      return false;
    }

    // Then apply other filters
    for (const [filterId, values] of Object.entries(activeFilters)) {
      if (values.length === 0) continue;

      switch (filterId) {
        case "projects":
          if (!values.includes(task.projectId)) {
            return false;
          }
          break;
        case "assignees":
          if (!task.assigneeIds || !task.assigneeIds.some(id => values.includes(id))) {
            return false;
          }
          break;
        case "priority":
          if (!values.includes(task.priority)) {
            return false;
          }
          break;
      }
    }

    return true;
  });

  // Group tasks by project
  const tasksByProject = filteredTasks.reduce<{[key: string]: Task[]}>((acc, task) => {
    const projectId = task.projectId;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {});

  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all your tasks across projects
          </p>
        </div>
        <Button onClick={() => setIsCreateTaskOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-6">
            {Object.keys(tasksByProject).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-lg font-medium">No tasks found</p>
                  <p className="text-muted-foreground text-sm">
                    {Object.keys(activeFilters).length > 0
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
              Object.entries(tasksByProject).map(([projectId, tasks]) => {
                const project = projects.find(p => p.id === projectId);
                return (
                  <Card key={projectId}>
                    <CardHeader>
                      <CardTitle>
                        {project ? project.name : "No Project"} 
                        <span className="ml-2 text-sm text-muted-foreground">({tasks.length} tasks)</span>
                      </CardTitle>
                      <CardDescription>
                        {project ? project.description : "Tasks without a project"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {tasks.map((task) => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            showProjectBadge={false} 
                            onClick={() => {
                              // Navigate to project details with task focus
                              const projectUrl = `/projects/${task.projectId}?taskId=${task.id}`;
                              window.location.href = projectUrl;
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
    </div>
  );
}
