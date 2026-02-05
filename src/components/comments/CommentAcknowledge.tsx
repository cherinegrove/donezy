import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CommentAcknowledgeProps {
  commentId: string;
}

export function CommentAcknowledge({ commentId }: CommentAcknowledgeProps) {
  const { currentUser, users } = useAppContext();
  const [acknowledged, setAcknowledged] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [reactedUsers, setReactedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reactions for this comment
  useEffect(() => {
    if (!commentId) return;

    const fetchReactions = async () => {
      const { data } = await supabase
        .from("comment_reactions")
        .select("user_id")
        .eq("comment_id", commentId)
        .eq("emoji", "👍");

      if (data) {
        setReactionCount(data.length);
        setReactedUsers(data.map(r => r.user_id));
        setAcknowledged(data.some(r => r.user_id === currentUser?.auth_user_id));
      }
    };

    fetchReactions();
  }, [commentId, currentUser?.auth_user_id]);

  const handleToggleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.auth_user_id || isLoading) return;

    setIsLoading(true);

    try {
      if (acknowledged) {
        // Remove acknowledgment
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUser.auth_user_id)
          .eq("emoji", "👍");
        
        setAcknowledged(false);
        setReactionCount(prev => Math.max(0, prev - 1));
        setReactedUsers(prev => prev.filter(id => id !== currentUser.auth_user_id));
      } else {
        // Add acknowledgment
        await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            user_id: currentUser.auth_user_id,
            emoji: "👍",
          });
        
        setAcknowledged(true);
        setReactionCount(prev => prev + 1);
        setReactedUsers(prev => [...prev, currentUser.auth_user_id]);
      }
    } catch (error) {
      console.error("Error toggling acknowledgment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get names of users who reacted
  const getReactedUserNames = () => {
    return reactedUsers
      .map(userId => users.find(u => u.auth_user_id === userId)?.name || "Unknown")
      .join(", ");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 gap-1 text-xs",
            acknowledged && "bg-primary/10 text-primary"
          )}
          onClick={handleToggleAcknowledge}
          disabled={isLoading}
        >
          <ThumbsUp className={cn("h-3 w-3", acknowledged && "fill-current")} />
          {reactionCount > 0 && <span>{reactionCount}</span>}
        </Button>
      </TooltipTrigger>
      {reactionCount > 0 && (
        <TooltipContent>
          <p>{getReactedUserNames()}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
