
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckSquare, Filter, Plus, SlidersHorizontal } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

export default function Tasks() {
  const { tasks, projects } = useAppContext();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Filter tasks based on the active tab
  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    return task.status === activeTab;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all your tasks across projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Sort
          </Button>
          <Button onClick={() => setIsCreateTaskOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

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
                    Create a new task to get started
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
