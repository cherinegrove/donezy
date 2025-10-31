
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSection } from "@/components/tasks/FileSection";
import { TimerSection } from "@/components/tasks/TimerSection";
import { TaskLogsSection } from "@/components/tasks/TaskLogsSection";

interface TaskDetailTabsProps {
  taskId: string;
}

export function TaskDetailTabs({ taskId }: TaskDetailTabsProps) {
  return (
    <Tabs defaultValue="files" className="w-full mt-4">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="timers">Timers</TabsTrigger>
        <TabsTrigger value="logs">Task Logs</TabsTrigger>
      </TabsList>
      
      <TabsContent value="files" className="mt-4">
        <FileSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="timers" className="mt-4">
        <TimerSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="logs" className="mt-4">
        <TaskLogsSection taskId={taskId} />
      </TabsContent>
    </Tabs>
  );
}
