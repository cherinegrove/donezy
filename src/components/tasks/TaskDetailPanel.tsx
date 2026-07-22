import { Task } from "@/types";
import { lazy, Suspense } from "react";
const EditTaskDialog = lazy(() => import("./EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <EditTaskDialog
        task={task}
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      />
    </Suspense>
  );
}
