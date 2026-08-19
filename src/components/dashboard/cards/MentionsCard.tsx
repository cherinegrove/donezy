import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { Task } from "@/types";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));

export function MentionsCard() {
  const { comments, users, tasks, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get comments that mention the current user, sorted by newest first
  const myMentions = (comments || [])
    .filter(
      (comment) =>
        comment.mentioned_user_ids?.includes(currentUser?.auth_user_id) &&
        comment.auth_user_id !== currentUser?.auth_user_id // Don't show self-mentions
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5); // Show last 5

  const getCommentPreview = (content: string) => {
    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, "").trim();
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  };

  const getMentioner = (userId: string) => {
    return users.find((u) => u.auth_user_id === userId);
  };

  const getTask = (taskId: string) => {
    return tasks.find((t) => t.id === taskId);
  };

  const handleMentionClick = (task: Task | undefined) => {
    if (task) {
      setSelectedTask(task);
      setIsDialogOpen(true);
    }
  };

  if (myMentions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mentions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-muted-foreground">
            No recent mentions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mentions ({myMentions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myMentions.map((comment) => {
              const mentioner = getMentioner(comment.auth_user_id);
              const task = getTask(comment.task_id);

              return (
                <div
                  key={comment.id}
                  onClick={() => handleMentionClick(task)}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {mentioner?.name || "Unknown"}
                      </span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        mentioned
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    In "{task?.title || "Unknown Task"}"
                  </p>
                  <p className="text-sm text-foreground">
                    {getCommentPreview(comment.content)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
}
