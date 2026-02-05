import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface NotificationAcknowledgeProps {
  messageId: string;
  compact?: boolean;
}

export function NotificationAcknowledge({ messageId, compact = false }: NotificationAcknowledgeProps) {
  const { currentUser } = useAppContext();
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has already acknowledged this notification
  useEffect(() => {
    if (!currentUser?.auth_user_id || !messageId) return;

    const checkAcknowledgment = async () => {
      const { data } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUser.auth_user_id)
        .eq("emoji", "👍")
        .maybeSingle();

      setAcknowledged(!!data);
    };

    checkAcknowledgment();
  }, [messageId, currentUser?.auth_user_id]);

  const handleToggleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    if (!currentUser?.auth_user_id || isLoading) return;

    setIsLoading(true);

    try {
      if (acknowledged) {
        // Remove acknowledgment
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUser.auth_user_id)
          .eq("emoji", "👍");
        
        setAcknowledged(false);
      } else {
        // Add acknowledgment
        await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: currentUser.auth_user_id,
            emoji: "👍",
          });
        
        setAcknowledged(true);
      }
    } catch (error) {
      console.error("Error toggling acknowledgment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 w-6 p-0 rounded-full",
          acknowledged && "bg-primary/10 text-primary"
        )}
        onClick={handleToggleAcknowledge}
        disabled={isLoading}
        title={acknowledged ? "Remove acknowledgment" : "Acknowledge"}
      >
        <ThumbsUp className={cn("h-3 w-3", acknowledged && "fill-current")} />
      </Button>
    );
  }

  return (
    <Button
      variant={acknowledged ? "default" : "outline"}
      size="sm"
      onClick={handleToggleAcknowledge}
      disabled={isLoading}
      className={cn(
        "gap-2",
        acknowledged && "bg-primary text-primary-foreground"
      )}
    >
      <ThumbsUp className={cn("h-4 w-4", acknowledged && "fill-current")} />
      {acknowledged ? "Acknowledged" : "Acknowledge"}
    </Button>
  );
}
