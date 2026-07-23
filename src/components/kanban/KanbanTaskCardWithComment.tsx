import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useEffect, useState, memo } from "react";
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

function KanbanTaskCardWithCommentInner({
  task,
  onClick,
  displayOptions,
  isSelected,
  onSelectionChange,
  showSelection,
}: KanbanTaskCardWithCommentProps) {
  const { users } = useAppContext();
  const [latestComment, setLatestComment] = useState<LatestComment | null>(null);

  useEffect(() => {
    try {
      // Debug logging
      console.log(`[Hover] Task "${task.title}" - Comments:`, task.comments, `Array? ${Array.isArray(task.comments)}, Length: ${task.comments?.length || 0}`);

      // Check if task has comments array
      if (!task.comments || !Array.isArray(task.comments) || task.comments.length === 0) {
        console.log(`[Hover] No comments found for task "${task.title}"`);
        setLatestComment(null);
        return;
      }

      // Sort comments by timestamp to get the latest one
      const comments = [...(task.comments as any[])].sort((a, b) =>
        new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime()
      );
      const latestCommentData = comments[0]; // First after sort is most recent

      if (!latestCommentData || !latestCommentData.userId || !latestCommentData.content) {
        setLatestComment(null);
        return;
      }

      // Find author
      const author = users.find(u => u.id === latestCommentData.userId || u.auth_user_id === latestCommentData.userId);
      const initials = author?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

      setLatestComment({
        id: latestCommentData.id,
        content: String(latestCommentData.content).replace(/<[^>]*>/g, '').trim(),
        authorName: author?.name || 'Unknown',
        authorInitials: initials,
        createdAt: latestCommentData.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error processing comment:', error);
      setLatestComment(null);
    }
  }, [task.id, task.comments, users]);

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
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 p-3 opacity-0 group-hover:opacity-95 transition-opacity duration-200 flex flex-col justify-between pointer-events-none shadow-lg z-50">
          <div className="text-white space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-white/40 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {latestComment.authorInitials}
              </div>
              <span className="text-xs font-semibold truncate">
                {latestComment.authorName}
              </span>
            </div>
            <p className="text-sm line-clamp-3 leading-snug break-words">
              {latestComment.content}
            </p>
          </div>
          <div className="text-xs text-blue-100 mt-auto">
            💬 {formatDistanceToNow(new Date(latestComment.createdAt), { addSuffix: true })}
          </div>
        </div>
      )}
    </div>
  );
}

export const KanbanTaskCardWithComment = memo(KanbanTaskCardWithCommentInner);
