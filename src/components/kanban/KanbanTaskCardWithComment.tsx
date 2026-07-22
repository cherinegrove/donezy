import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface KanbanTaskCardWithCommentProps {
  task: Task;
  onClick: (e?: React.MouseEvent) => void;
  displayOptions: string[];
  isSelected?: boolean;
  onSelectionChange?: (taskId: string) => void;
  showSelection?: boolean;
}

interface LatestComment {
  id: string;
  content: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
}

export function KanbanTaskCardWithComment({
  task,
  onClick,
  displayOptions,
  isSelected,
  onSelectionChange,
  showSelection,
}: KanbanTaskCardWithCommentProps) {
  const { comments, users } = useAppContext();
  const [latestComment, setLatestComment] = useState<LatestComment | null>(null);

  useEffect(() => {
    // Find the latest comment for this task
    const taskComments = comments
      ?.filter(c => c.task_id === task.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

    if (taskComments.length > 0) {
      const comment = taskComments[0];
      const author = users.find(u => u.auth_user_id === comment.auth_user_id);
      const initials = author?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

      setLatestComment({
        id: comment.id,
        content: comment.content.replace(/<[^>]*>/g, '').trim(),
        authorName: author?.name || 'Unknown',
        authorInitials: initials,
        createdAt: comment.created_at,
      });
    } else {
      setLatestComment(null);
    }
  }, [task.id, comments, users]);

  return (
    <div className="relative group">
      <TaskCard
        task={task}
        onClick={onClick}
        displayOptions={displayOptions}
        isSelected={isSelected}
        onSelectionChange={onSelectionChange}
        showSelection={showSelection}
      />

      {/* Hover comment preview */}
      {latestComment && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between pointer-events-none">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                {latestComment.authorInitials}
              </div>
              <span className="text-xs font-semibold">
                {latestComment.authorName}
              </span>
            </div>
            <p className="text-sm line-clamp-2 leading-relaxed mb-2">
              {latestComment.content}
            </p>
          </div>
          <div className="text-xs text-white/70">
            {formatDistanceToNow(new Date(latestComment.createdAt), { addSuffix: true })}
          </div>
        </div>
      )}
    </div>
  );
}
