
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommentSection } from "@/components/tasks/CommentSection";
import { FileSection } from "@/components/tasks/FileSection";
import { TimerSection } from "@/components/tasks/TimerSection";
import { RelatedTasksSection } from "@/components/tasks/RelatedTasksSection";
import { TaskLogsSection } from "@/components/tasks/TaskLogsSection";

interface TaskDetailTabsProps {
  taskId: string;
}

export function TaskDetailTabs({ taskId }: TaskDetailTabsProps) {
  return (
    <Tabs defaultValue="comments" className="w-full mt-4">
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="timers">Timers</TabsTrigger>
        <TabsTrigger value="related">Related Tasks</TabsTrigger>
        <TabsTrigger value="logs">Task Logs</TabsTrigger>
      </TabsList>
      
      <TabsContent value="comments" className="mt-4">
        <CommentSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="files" className="mt-4">
        <FileSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="timers" className="mt-4">
        <TimerSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="related" className="mt-4">
        <RelatedTasksSection taskId={taskId} />
      </TabsContent>
      
      <TabsContent value="logs" className="mt-4">
        <TaskLogsSection taskId={taskId} />
      </TabsContent>
    </Tabs>
  );
}
