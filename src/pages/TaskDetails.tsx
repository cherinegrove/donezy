import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useState, useEffect } from "react";
import { Task } from "@/types";

export default function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks } = useAppContext();
  const [fetchedTask, setFetchedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const localTask = tasks.find(t => t.id === taskId);
  const task = localTask || fetchedTask;

  // Fetch from Supabase if not found in local state
  useEffect(() => {
    if (localTask || !taskId || isLoading) return;
    const fetchTask = async () => {
      setIsLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!error && data) {
          setFetchedTask({
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
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTask();
  }, [taskId, localTask, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Task not found</h1>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <EditTaskDialog
        task={task}
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate(-1);
        }}
      />
    </>
  );
}
